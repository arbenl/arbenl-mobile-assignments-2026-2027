const {test}=require('node:test');const assert=require('node:assert/strict');
const {prepare,render,trigger,publish,cases}=require('../scripts/mobile-runtime/control.cjs');
const issue={state:'open',title:'[MOBILE DORËZIM] Java 8',user:{login:'arta'},body:'### Java\nJava 8\n### Linku i punës në GitHub\nhttps://github.com/arta/rideshare'};
const context={repo:{owner:'arbenl',repo:'course'},issue:{number:8},eventName:'issues',runId:123};
function api({config={version:1,path:'/java-08-test'},comments=[],error,nested=false}={}){return {paginate:async()=>comments,rest:{issues:{get:async()=>({data:issue}),listComments:()=>{}},repos:{get:async()=>({data:{private:false,size:10,default_branch:'main'}}),getBranch:async()=>({data:{commit:{sha:'a'.repeat(40)}}}),getContent:async({path,ref})=>{
 assert.equal(ref,'a'.repeat(40));if(error)throw {status:error};
 if(path==='package.json'&&nested)throw {status:404};
 return {data:{type:'file',size:50,encoding:'base64',content:Buffer.from(JSON.stringify(config)).toString('base64')}};
}}}};}
test('runtime gates week, author, open state and PR before reading student code',async()=>{
 assert.equal(trigger({...issue,state:'closed'},context),false);assert.equal(trigger({...issue,pull_request:{}},context),false);
 assert.equal(trigger(issue,{...context,eventName:'issue_comment',payload:{comment:{body:'rikontrollo',user:{login:'other'}}}}),false);
 const g=api();g.rest.issues.get=async()=>({data:{...issue,body:issue.body.replace('Java 8','Java 7')}});assert.deepEqual(await prepare({github:g,context}),{status:'skip'});
});
test('runtime accepts only fixed route/version and returns pinned root or nested app',async()=>{
 for(const nested of [false,true]){const r=await prepare({github:api({nested}),context});assert.equal(r.status,'ready');assert.equal(r.root,nested?'aplikacioni/':'');assert.equal(r.ref,'a'.repeat(40));}
 for(const config of [{version:1,path:'https://evil.test'},{version:2,path:'/java-08-test'}])assert.equal((await prepare({github:api({config}),context})).status,'setup');
});
test('runtime cache trusts only matching completed bot results; setup errors are retryable',async()=>{
 const meta=await prepare({github:api(),context});const body=render(meta,{phase:'complete',tests:Object.fromEntries(cases.map(([id])=>[id,true]))},'https://github.com/run');
 assert.equal((await prepare({github:api({comments:[{user:{login:'github-actions[bot]'},body}]}),context})).status,'skip');
 assert.equal((await prepare({github:api({comments:[{user:{login:'arta'},body}]}),context})).status,'ready');
 assert.equal((await prepare({github:api({error:503}),context})).reason,'api');
});
test('runtime feedback uses trusted labels, rejects incomplete artifacts and distinguishes setup from failures',()=>{
 const meta={status:'ready',repository:'arta/rideshare',ref:'a'.repeat(40)};
 const text=render(meta,{phase:'complete',tests:Object.fromEntries(cases.map(([id],i)=>[id,i!==2])),malicious:'@everyone evil'},'https://github.com/run');
 assert.match(text,/7\/8/);assert.match(text,/Ndryshimi pa konfirmim/);assert.doesNotMatch(text,/@everyone/);
 assert.doesNotMatch(render(meta,{phase:'complete',tests:{}},'url'),/completed -->/);
 assert.match(render({...meta,status:'setup',reason:'config'},null,'url'),/Ende nuk u testua/);
});
test('runtime publishes into one separate bot comment and ignores changed issue ownership',async()=>{
 const meta=await prepare({github:api(),context});const g=api({comments:[{id:5,user:{login:'github-actions[bot]'},body:'<!-- mobile-runtime-week08-v1 --> old'}]});let updates=0;
 g.rest.issues.updateComment=async({comment_id})=>{assert.equal(comment_id,5);updates++;};
 await publish({github:g,context,meta,result:{phase:'start'}});assert.equal(updates,1);
 g.rest.issues.get=async()=>({data:{...issue,body:issue.body.replace('arta/rideshare','other/rideshare')}});
 await publish({github:g,context,meta});assert.equal(updates,1);
});
