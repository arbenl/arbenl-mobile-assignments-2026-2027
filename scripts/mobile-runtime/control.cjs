const {parseSubmission}=require('../check-mobile-submission.cjs');
const MARKER='<!-- mobile-runtime-week08-v1 -->';
const VERSION='w8-browser-1';
const cases=[
 ['initial','Hapja pa kërkesë lejeje','Kërko vendndodhjen vetëm brenda klikimit, jo gjatë hapjes së faqes.'],
 ['manual','Konfirmimi manual','Lidhe fushën dhe butonin. Vendtakimi i konfirmuar duhet të shfaqë tekstin e zgjedhur.'],
 ['draft','Ndryshimi pa konfirmim','Mbaj tekstin në shkrim veçmas nga vendtakimi i konfirmuar.'],
 ['blank','Refuzimi i tekstit bosh','Përdor trim(), shfaq gabimin dhe ruaj vendtakimin e mëparshëm.'],
 ['accepted','Pranimi dhe saktësia','Pas suksesit përfundo pritjen, shfaq success dhe saktësinë e kthyer nga pajisja.'],
 ['denied','Refuzimi me alternativë manuale','Për kodin 1 shfaq denied dhe lejo konfirmimin manual.'],
 ['timeout','Mbarimi i pritjes','Për kodin 3 shfaq timeout, përfundo pritjen dhe lejo konfirmimin manual.'],
 ['unavailable','Pajisja pa mbështetje','Kontrollo navigator.geolocation përpara thirrjes dhe ofro rrugën manuale.']
];
function trigger(issue,context){return !issue.pull_request && issue.state==='open' && (context.eventName==='issues'||(context.payload.comment?.body.trim().toLowerCase()==='rikontrollo' && context.payload.comment.user.login.toLowerCase()===issue.user.login.toLowerCase()));}
async function prepare({github,context}){
 const issue=(await github.rest.issues.get({...context.repo,issue_number:context.issue.number})).data;
 if(!trigger(issue,context))return {status:'skip'};
 let sub;try{sub=parseSubmission(issue);}catch{return {status:'skip'};}
 if(sub?.week!==8)return {status:'skip'};
 const result={status:'setup',repository:`${sub.owner}/${sub.repo}`,ref:'',reason:'config'};
 try{
  const meta=(await github.rest.repos.get({owner:sub.owner,repo:sub.repo})).data;
  if(meta.private)return {...result,reason:'private'};
  if(meta.size>50000)return {...result,reason:'size'};
  const ref=(await github.rest.repos.getBranch({owner:sub.owner,repo:sub.repo,branch:meta.default_branch})).data.commit.sha;
  if(!/^[a-f0-9]{40}$/.test(ref))throw Error('ref');
  result.ref=ref;
  const key=`<!-- ${VERSION}:${result.repository.toLowerCase()}:${ref} -->`;
  const comments=await github.paginate(github.rest.issues.listComments,{...context.repo,issue_number:context.issue.number,per_page:100});
  if(comments.some(c=>c.user.login==='github-actions[bot]'&&c.body.startsWith(MARKER)&&c.body.includes(key)&&c.body.includes('<!-- completed -->')))return {status:'skip'};
  const config=(await github.rest.repos.getContent({owner:sub.owner,repo:sub.repo,path:'mobile-week08.json',ref})).data;
  if(config.type!=='file'||config.size>1024||config.encoding!=='base64')return result;
  const obj=JSON.parse(Buffer.from(config.content,'base64').toString());
  if(obj.version!==1||obj.path!=='/java-08-test')return result;
  let root='';
  try{await github.rest.repos.getContent({owner:sub.owner,repo:sub.repo,path:'package.json',ref});}
  catch(e){if(e.status!==404)throw e;root='aplikacioni/';await github.rest.repos.getContent({owner:sub.owner,repo:sub.repo,path:root+'package.json',ref});}
  const lock=(await github.rest.repos.getContent({owner:sub.owner,repo:sub.repo,path:root+'package-lock.json',ref})).data;
  if(lock.type!=='file'||lock.size>2_000_000)return {...result,reason:'lock'};
  return {...result,status:'ready',root,key};
 }catch(e){return {...result,reason:e instanceof SyntaxError?'config':e.status===404?'files':'api'};}
}
function render(meta,result,runUrl){
 const key=`<!-- ${VERSION}:${meta.repository.toLowerCase()}:${meta.ref} -->`;
 let text=`${MARKER}\n${key}\n## Java 8 · Testimi i funksionimit\n\n`;
 if(meta.status==='setup'){
  const reasons={config:'Shto mobile-week08.json sipas udhëzimit dhe faqen /java-08-test.',files:'Kontrollo mobile-week08.json, package.json dhe package-lock.json në rrënjë ose aplikacioni/.',lock:'Ruaj package-lock.json të krijuar nga npm install. Kufiri i tij është 2 MB.',private:'Repository duhet të jetë publik për këtë kontroll.',size:'Repository është shumë i madh për provën (mbi 50 MB sipas GitHub). Hiq skedarët e gjeneruar dhe kërko ndihmë.',api:'Kontrolli nuk u përgatit dot. Provo sërish me rikontrollo; ky nuk është dështim i kodit.'};
  text+='⚪ **Ende nuk u testua aplikacioni.** '+(reasons[meta.reason]||reasons.api);
 }else if(result?.phase==='complete'&&cases.every(([id])=>typeof result.tests?.[id]==='boolean')){
  const count=cases.filter(([id])=>result.tests[id]).length;
  text+=`<!-- completed -->\n**${count}/${cases.length} prova të sjelljes kaluan.**\n\n### Çfarë punoi\n\n`;
  text+=cases.filter(([id])=>result.tests[id]).map(([,name])=>'✅ '+name).join('\n')||'Ende asnjë provë nuk kaloi.';
  text+='\n\n### Çfarë duhet të përmirësosh\n\n';
  text+=cases.filter(([id])=>!result.tests[id]).map(([,name,hint])=>`❌ **${name}** — ${hint}`).join('\n\n')||'Të gjitha sjelljet e provuara kaluan. Ruaje lidhjen e këtij raporti.';
 }else{
  const advice={install:'Instalimi me npm ci nuk përfundoi. Kontrollo që package-lock.json përputhet me package.json dhe që npm ci --ignore-scripts punon. Nuk përdoren sekrete.',start:'Faqja /java-08-test nuk u hap në kohë. Duhet të punojë me të dhëna fiktive pa hyrje në llogari, Neon ose shërbime të jashtme.',contract:'Faqja u hap, por mungojnë elementet data-testid të udhëzimit ose statusi fillestar idle.',infrastructure:'Mjedisi i testimit nuk përfundoi. Provo rikontrollo; nuk u dha rezultat për kodin.'};
  text+='⚠️ **Testet e sjelljes nuk përfunduan.** '+(advice[result?.phase]||advice.infrastructure);
 }
 text+=`\n\nVersioni i kontrolluar: \`${meta.ref||'ende i palexuar'}\`.\n\n[Hapat për përgatitjen e testit](https://arbenl.github.io/lendet/2026-2027/mobile/java-08/testimi-automatik.html) · [Ekzekutimi dhe pamjet e dështimeve](${runUrl})\n\nKorrigjo → Commit → Push → komento **rikontrollo** në të njëjtin Issue. Versionet e përfunduara nuk ritestohen pa ndryshim kodi. Gabimet e mjedisit mund të ritestohen.\n\n**Feedback, jo notë automatike.** Provohet komponenti në faqen e testimit me vendndodhje të simuluar. Nuk verifikohet GPS-i real, databaza, autorësia ose siguria e gjithë aplikacionit. Përdor të njëjtin komponent edhe te detajet e udhëtimit. Nuk përdoret AI. Pamjet e dështimeve janë te artifact-i mobile-week08-runtime (ruhet 7 ditë).`;
 return text;
}
async function publish({github,context,meta,result}){
 if(!meta||!['ready','setup'].includes(meta.status))return;
 const issue=(await github.rest.issues.get({...context.repo,issue_number:context.issue.number})).data;
 let sub;try{sub=parseSubmission(issue);}catch{return;}
 if(!sub||sub.week!==8||`${sub.owner}/${sub.repo}`!==meta.repository||issue.state!=='open')return;
 const args={...context.repo,issue_number:context.issue.number};
 const prior=(await github.paginate(github.rest.issues.listComments,{...args,per_page:100})).find(c=>c.user.login==='github-actions[bot]'&&c.body.startsWith(MARKER));
 const url=`https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;
 const body=render(meta,result,url);
 if(prior)await github.rest.issues.updateComment({...context.repo,comment_id:prior.id,body});
 else await github.rest.issues.createComment({...args,body});
}
module.exports={prepare,publish,render,trigger,cases};
