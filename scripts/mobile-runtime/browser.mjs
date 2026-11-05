import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.RESULT_DIR||'runtime-result';
await mkdir(out,{recursive:true});
const origin='http://localhost:3000';
const result={phase:'infrastructure',tests:{}};
let browser;
try{
 browser=await chromium.launch({chromiumSandbox:true});
 async function contextFor(mode){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await context.addInitScript(mode=>{
   window.__geoCalls=0;
   if(mode==='unavailable'){Object.defineProperty(navigator,'geolocation',{value:undefined,configurable:true});return;}
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){window.__geoCalls++;setTimeout(()=>{if(mode==='accepted')success({coords:{latitude:42.66,longitude:21.16,accuracy:37},timestamp:Date.now()});else error({code:mode==='denied'?1:3,message:'Simulated classroom test'});},250);}}});
  },mode);
  const page=await context.newPage();page.setDefaultTimeout(5000);
  return {context,page};
 }
 let ready=false;
 for(let i=0;i<40;i++){try{const r=await fetch(origin+'/java-08-test',{signal:AbortSignal.timeout(2000)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}
 if(!ready){result.phase='start';}else{
  const check=await contextFor('accepted');await check.page.goto(origin+'/java-08-test');
  const names=['meeting-input','confirm-meeting','confirmed-meeting','meeting-error','locate-me','location-status','location-accuracy'];
  let contract=true;
  for(const id of names){if(await check.page.getByTestId(id).count()!==1)contract=false;}
  if(contract)contract=await check.page.getByTestId('location-status').getAttribute('data-state')==='idle';
  await check.context.close();
  if(!contract)result.phase='contract';else{
   const assert=(condition)=>{if(!condition)throw Error('expectation');};
   const manual=async(page,text)=>{await page.getByTestId('meeting-input').fill(text);await page.getByTestId('confirm-meeting').click();assert((await page.getByTestId('confirmed-meeting').innerText()).includes(text));};
   async function test(id,mode,fn){const {context,page}=await contextFor(mode);try{await page.goto(origin+'/java-08-test');await fn(page);result.tests[id]=true;}catch(error){result.tests[id]=false;await writeFile(`${out}/${id}.txt`,String(error.message).slice(0,3000));try{await page.screenshot({path:`${out}/${id}.png`,timeout:2000});}catch{}}finally{await context.close();}}
   await test('initial','accepted',async page=>{await page.waitForTimeout(500);assert(await page.evaluate(()=>window.__geoCalls)===0);});
   await test('manual','accepted',page=>manual(page,'Biblioteka'));
   await test('draft','accepted',async page=>{await manual(page,'Biblioteka');await page.getByTestId('meeting-input').fill('Parkingu');assert((await page.getByTestId('confirmed-meeting').innerText()).includes('Biblioteka'));});
   await test('blank','accepted',async page=>{await manual(page,'Biblioteka');await page.getByTestId('meeting-input').fill('   ');await page.getByTestId('confirm-meeting').click();assert((await page.getByTestId('meeting-error').innerText()).trim().length>0);assert((await page.getByTestId('confirmed-meeting').innerText()).includes('Biblioteka'));});
   for(const mode of ['accepted','denied','timeout','unavailable']) await test(mode,mode,async page=>{
    await page.getByTestId('locate-me').click();
    const state=mode==='accepted'?'success':mode;
    await page.locator(`[data-testid="location-status"][data-state="${state}"]`).waitFor();
    assert(await page.getByTestId('locate-me').isEnabled());
    if(mode!=='unavailable')assert(await page.evaluate(()=>window.__geoCalls)===1);
    if(mode==='accepted')assert(/\b37\b/.test(await page.getByTestId('location-accuracy').innerText()));
    await manual(page,'Parkingu');
   });
   result.phase='complete';
  }
 }
}catch(error){result.phase='infrastructure';await writeFile(`${out}/diagnostic.txt`,String(error.message).slice(0,8000));}finally{await browser?.close();await writeFile(`${out}/result.json`,JSON.stringify(result));}
