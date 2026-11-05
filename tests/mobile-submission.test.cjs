const {test}=require('node:test');const assert=require('node:assert/strict');
const {parseSubmission,checkFiles,report,run}=require('../scripts/check-mobile-submission.cjs');
const issue=(url='https://github.com/arta/rideshare-mobile')=>({title:'[MOBILE DORËZIM] Java ime',user:{login:'arta'},body:`### Java\n\nJava 1\n\n### Linku i punës në GitHub\n\n${url}\n`});
test('parse form; reject other owners, arbitrary hosts and nested paths',()=>{
 assert.equal(parseSubmission(issue()).week,1);
 for(const url of ['https://evil.test/arta/repo','https://github.com/arbenl/repo','https://github.com/arta/repo/tree/main','https://github.com/arta/..'])assert.throws(()=>parseSubmission(issue(url)));
 assert.equal(parseSubmission({title:'Cloud submission'}),null);
 assert.equal(parseSubmission({...issue(),title:'[MOBILE J02] RideShare'}).week,2);
});
function api(files,text='Përgjigjja ime mbi problemin dhe përdoruesit e RideShare. '.repeat(3)) {
 return {rest:{repos:{get:async()=>({data:{private:false,default_branch:'main'}}),getBranch:async()=>({data:{commit:{sha:'abc',commit:{tree:{sha:'tree-abc'}}}}}),getContent:async args=>({data:args.path?{encoding:'base64',content:Buffer.from(text).toString('base64')}:files})}}};
}
const file=(name,size=500)=>({name,path:name,size,type:'file'});
test('missing files and blank template get actionable feedback; completed document passes',async()=>{
 const sub={owner:'arta',repo:'r',week:2};
 const good=await checkFiles(sub,api([file('java-02.md'),file('skica.png')]));assert.equal(good.checks.filter(c=>c.ok).length,2);
 const bad=await checkFiles(sub,api([file('java-02.md')],'[PLOTËSO] '.repeat(15)));assert.equal(bad.checks.filter(c=>c.ok).length,0);assert.match(bad.checks[1].message,/Upload files/);
 assert.match(report(good),/jo notë/);
});
test('accept existing week-1 document formats; refuse private repos and symlinks',async()=>{
 const sub={owner:'arta',repo:'r',week:1};
 assert.equal((await checkFiles(sub,api([file('Exit-Ticket.pdf'),file('PRD.docx')]))).checks.filter(c=>c.ok).length,2);
 const privateApi=api([]);privateApi.rest.repos.get=async()=>({data:{private:true}});await assert.rejects(checkFiles(sub,privateApi),/publik/);
 assert.equal((await checkFiles(sub,api([{...file('prd.md'),type:'symlink'}]))).checks.filter(c=>c.ok).length,0);
});
test('update one bot report; ignore unsolicited rechecks from other users',async()=>{
 let updates=0;const github=api([file('exit-ticket.md'),file('prd.md')]);
 github.rest.issues={get:async()=>({data:issue()}),listComments:()=>{},updateComment:async()=>updates++,createComment:async()=>assert.fail('should update')};
 github.paginate=async()=>[{id:7,user:{login:'github-actions[bot]'},body:'<!-- mobile-submission-check-v1 -->old'}];
 const context={repo:{owner:'arbenl',repo:'course'},issue:{number:1},eventName:'issues'};
 await run({github,context});assert.equal(updates,1);
 await run({github,context:{...context,eventName:'issue_comment',payload:{comment:{body:'rikontrollo',user:{login:'other'}}}}});assert.equal(updates,1);
});

test('all fifteen weeks are accepted and out-of-range weeks are refused',()=>{
 for(let week=1;week<=15;week++) assert.equal(parseSubmission({...issue(),body:issue().body.replace('Java 1',`Java ${week}`)}).week,week);
 for(const week of ['0','16','2x','1.5','100']) assert.throws(()=>parseSubmission({...issue(),body:issue().body.replace('Java 1',`Java ${week}`)}));
});
function laterApi(nested=false,broken=false){
 const github=api([]);let reads=0;
 const prefix=nested?'aplikacioni/':'';
 github.rest.git={getTree:async({tree_sha})=>{assert.equal(tree_sha,'tree-abc');return {data:{truncated:false,tree:[
  `${prefix}src/app/page.tsx`,`${prefix}src/app/udhetimi/[id]/page.tsx`,
  `${prefix}src/app/udhetimi/[id]/kerkesa/page.tsx`,`${prefix}src/components/KartaUdhetimi.tsx`
 ].map(path=>({path,type:'blob'}))}}}};
 github.rest.repos.getContent=async({path,ref})=>{
  assert.equal(ref,'abc');reads++;
  if(!path)return {data:[file('java-03.md'),nested?{name:'aplikacioni',type:'dir'}:file('package.json')]};
  if(path==='aplikacioni')return {data:[{...file('package.json'),path:'aplikacioni/package.json'}]};
  const text=path.endsWith('package.json')?(broken?'not json':JSON.stringify({dependencies:{next:'16'},scripts:{dev:'next dev',build:'next build'}})):'# Java 3\n### Prova 1: Lista\nUdhëtimet u shfaqën në telefon pa lëvizje horizontale.\n### Prova 2: Detajet\nUdhëtimi i dytë tregoi orën dhe vendtakimin e pritur.\n### Prova 3: Kërkesa\nSimulimi shfaqi Në pritje dhe nuk pretendoi rezervim real.\n';
  return {data:{encoding:'base64',content:Buffer.from(text).toString('base64')}};
 };
 return {github,reads:()=>reads};
}
test('later weeks check report and root or nested Next.js metadata, without executing code',async()=>{
 for(const nested of [false,true]){
  const {github}=laterApi(nested);const result=await checkFiles({owner:'arta',repo:'r',week:3},github);
  assert.equal(result.checks.filter(c=>c.ok).length,5);assert.match(result.checks[1].message,/nuk e ekzekuton/);
 }
 const {github}=laterApi(false,true);const result=await checkFiles({owner:'arta',repo:'r',week:3},github);
 assert.equal(result.checks[0].ok,true);assert.equal(result.checks[1].ok,false);
});
test('week 3 gives specific feedback for missing routes, component and unfilled probes',async()=>{
 const {github}=laterApi();
 github.rest.git.getTree=async()=>({data:{truncated:false,tree:[{path:'src/app/page.tsx',type:'blob'}]}});
 const original=github.rest.repos.getContent;
 github.rest.repos.getContent=async args=>args.path==='java-03.md'?{data:{encoding:'base64',content:Buffer.from('Ky është raporti im i gjatë për RideShare, por ende nuk i kam plotësuar tri provat në klasë.').toString('base64')}}:original(args);
 const result=await checkFiles({owner:'arta',repo:'r',week:3},github);
 assert.equal(result.checks[2].ok,false);assert.match(result.checks[2].message,/Prova 1, 2, 3/);
 assert.equal(result.checks[3].ok,false);assert.match(result.checks[3].message,/Detajet/);
 assert.equal(result.checks[4].ok,false);assert.match(result.checks[4].message,/KartaUdhetimi/);
 assert.match(report(result),/2\/5 kontrolle teknike/);
});
test('unchanged revision reuses report; week or revision changes cannot reuse it',async()=>{
 const {github,reads}=laterApi();const sub={owner:'arta',repo:'r',week:3};
 const first=await checkFiles(sub,github);const before=reads();
 assert.deepEqual(await checkFiles(sub,github,report(first)),{unchanged:true});assert.equal(reads(),before);
 const changedWeek=await checkFiles({...sub,week:4},github,report(first));assert.ok(changedWeek.checks);assert.equal(changedWeek.checks[0].ok,false);
 github.rest.repos.getBranch=async()=>({data:{commit:{sha:'def',commit:{tree:{sha:'tree-def'}}}}});
 let receivedRef;github.rest.repos.getContent=async args=>{receivedRef=args.ref;return {data:[]};};
 github.rest.git.getTree=async({tree_sha})=>{assert.equal(tree_sha,'tree-def');return {data:{truncated:false,tree:[]}};};
 await checkFiles(sub,github,report(first));assert.equal(receivedRef,'def');
});
test('recheck accepts case/whitespace; unrelated comments and forged cache are ignored',async()=>{
 let writes=0;const github=api([file('exit-ticket.md'),file('prd.md')]);
 const first=await checkFiles({owner:'arta',repo:'rideshare-mobile',week:1},github);
 github.rest.issues={get:async()=>({data:issue()}),listComments:()=>{},updateComment:async()=>assert.fail('student comment cannot be updated'),createComment:async()=>writes++};
 github.paginate=async()=>[{id:5,user:{login:'arta'},body:report(first)}];
 const ctx={repo:{owner:'arbenl',repo:'course'},issue:{number:1},eventName:'issue_comment',payload:{comment:{body:'  RIKONTROLLO\n',user:{login:'arta'}}}};
 await run({github,context:ctx});assert.equal(writes,1);
 await run({github,context:{...ctx,payload:{comment:{body:'hello',user:{login:'arta'}}}}});assert.equal(writes,1);
});
test('API failures produce a retry instruction without pretending to award grades',async()=>{
 let body;const github=api([]);github.rest.repos.get=async()=>{throw Object.assign(new Error('unavailable'),{status:503});};
 github.rest.issues={get:async()=>({data:issue()}),listComments:()=>{},createComment:async args=>{body=args.body;}};github.paginate=async()=>[];
 await run({github,context:{repo:{owner:'arbenl',repo:'course'},issue:{number:1},eventName:'issues'}});
 assert.match(body,/Provo më vonë/);assert.match(body,/jo notë/);
});

function week4Api({nested=false,src=true,omit=[],env=false,driver=true,reportText}={}) {
 const {github,reads}=laterApi(nested);
 const prefix=nested?'aplikacioni/':'';
 const source=prefix+(src?'src/':'');
 const required=[prefix+'schema.sql',source+'lib/db.ts',source+'lib/udhetimet.ts',source+'app/page.tsx',source+'app/udhetimi/[id]/page.tsx',source+'app/udhetimi/[id]/kerkesa/page.tsx'];
 github.rest.git.getTree=async()=>({data:{truncated:false,tree:[...required.filter(p=>!omit.some(o=>p.endsWith(o))),prefix+'.env.example',...(env?[prefix+'.env.local']:[])].map(path=>({path,type:'blob'}))}});
 const original=github.rest.repos.getContent;
 github.rest.repos.getContent=async args=>{
  if(!args.path)return {data:[file('java-04.md'),nested?{name:'aplikacioni',type:'dir'}:file('package.json')]};
  if(args.path.endsWith('package.json'))return {data:{encoding:'base64',content:Buffer.from(JSON.stringify({dependencies:{next:'16',...(driver?{'@neondatabase/serverless':'1','server-only':'0.0.1'}:{})},scripts:{dev:'next dev',build:'next build'}})).toString('base64')}};
  if(args.path==='java-04.md')return {data:{encoding:'base64',content:Buffer.from(reportText||'# Java 4\n### Prova 1\nOra e ID 2 ndryshoi në listë dhe në detaje pas rifreskimit.\n### Prova 2\nWHERE false shfaqi mesazhin e listës bosh dhe kartat u rikthyen.\n### Prova 3\nPa konfigurim doli gabim lidhjeje; riktheva emrin dhe punoi përsëri.').toString('base64')}};
  return original(args);
 };
 return {github,reads};
}
test('week 4 accepts root/nested apps, src or app layout and safe env examples',async()=>{
 for(const nested of [false,true])for(const src of [false,true]) {
  const {github}=week4Api({nested,src});const result=await checkFiles({owner:'arta',repo:'r',week:4},github);
  assert.equal(result.checks.filter(c=>c.ok).length,5,JSON.stringify(result.checks));
  assert.match(report(result),/5\/5 kontrolle teknike/);
 }
});
test('week 4 identifies missing Neon files, dependencies, empty probes and tracked secrets',async()=>{
 const {github}=week4Api({omit:['schema.sql','lib/db.ts'],env:true,driver:false,reportText:'Ky është raporti im për RideShare me Neon por nuk i kam dokumentuar ende provat e kërkuara gjatë orës.'});
 const result=await checkFiles({owner:'arta',repo:'r',week:4},github);
 assert.equal(result.checks[2].ok,false);assert.match(result.checks[2].message,/Prova 1, 2, 3/);
 assert.equal(result.checks[3].ok,false);assert.match(result.checks[3].message,/schema.sql/);assert.match(result.checks[3].message,/npm install/);
 assert.equal(result.checks[4].ok,false);assert.match(result.checks[4].message,/\.env.local/);
 assert.match(result.checks[4].message,/ndërro kredencialet/);
});
test('week 4 refuses truncated file lists and reads only metadata/documents',async()=>{
 const {github}=week4Api();
 github.rest.git.getTree=async()=>({data:{truncated:true,tree:[]}});
 await assert.rejects(checkFiles({owner:'arta',repo:'r',week:4},github),/shumë skedarë/);
 const calls=[];const clean=week4Api().github;const original=clean.rest.repos.getContent;
 clean.rest.repos.getContent=async args=>{calls.push(args.path);return original(args);};
 await checkFiles({owner:'arta',repo:'r',week:4},clean);
 assert.deepEqual(calls,['','java-04.md','package.json']);
});

function week5Api({nested=false,src=true,env=false,auth=true,omit=[],reportText}={}) {
 const {github}=week4Api({nested,src,env});const root=nested?'aplikacioni/':'';const source=root+(src?'src/':'');
 const paths=[root+'schema-java05.sql',source+'lib/auth.ts',source+'lib/lejet.ts',source+'lib/db.ts',source+'app/page.tsx',source+'app/api/auth/[...nextauth]/route.ts',source+'app/panel/page.tsx',source+'app/panel/actions.ts',source+'components/Hyrja.tsx'];
 github.rest.git.getTree=async()=>({data:{truncated:false,tree:[...paths.filter(p=>!omit.some(x=>p.endsWith(x))),root+'.env.example',...(env?[root+'.env.local']:[])].map(path=>({path,type:'blob'}))}});
 const original=github.rest.repos.getContent;
 github.rest.repos.getContent=async args=>{
  if(!args.path)return {data:[file('java-05.md'),nested?{name:'aplikacioni',type:'dir'}:file('package.json')]};
  if(args.path==='java-05.md')return {data:{encoding:'base64',content:Buffer.from(reportText||'# Java 5\n### Prova 1\nPas hyrjes dhe rifreskimit mbeti emri; pas daljes kërkoi hyrje.\n### Prova 2\nShoferi ruajti 08:25; lista, detajet dhe Neon treguan ndryshimin.\n### Prova 3\nID tjetër dhe formulari pas daljes u refuzuan pa ndryshuar databazën.').toString('base64')}};
  if(args.path.endsWith('package.json'))return {data:{encoding:'base64',content:Buffer.from(JSON.stringify({dependencies:{next:'16','@neondatabase/serverless':'1','server-only':'0.0.1',...(auth?{'next-auth':'4.24.15'}:{})},scripts:{dev:'next dev',build:'next build'}})).toString('base64')}};
  return original(args);
 };return {github};
}
test('week 5 accepts root/nested apps and src/no-src with five bounded checks',async()=>{
 for(const nested of [false,true])for(const src of [false,true]){const {github}=week5Api({nested,src});const calls=[];const read=github.rest.repos.getContent;github.rest.repos.getContent=async args=>{calls.push(args.path);return read(args)};const result=await checkFiles({owner:'arta',repo:'r',week:5},github);assert.equal(result.checks.filter(c=>c.ok).length,5,JSON.stringify(result.checks));assert.ok(calls.every(p=>!p||p==='aplikacioni'||p==='java-05.md'||p.endsWith('package.json')));}
});
test('week 5 explains missing auth route, dependency, evidence and private env files',async()=>{
 const {github}=week5Api({auth:false,env:true,omit:['api/auth/[...nextauth]/route.ts'],reportText:'Këtë javë ndërtova panelin por ende nuk i kam dokumentuar rezultatet e provave të hyrjes, pronësisë dhe daljes.'});const result=await checkFiles({owner:'arta',repo:'r',week:5},github);assert.equal(result.checks[2].ok,false);assert.match(result.checks[2].message,/java-05.md/);assert.equal(result.checks[3].ok,false);assert.match(result.checks[3].message,/next-auth@4.24.15/);assert.match(result.checks[3].message,/route.ts/);assert.equal(result.checks[4].ok,false);
});

function week6Api({nested=false,src=true,omit=[],env=[],reportText,reportName='java-06.md',validPackage=true}={}) {
 const root=nested?'aplikacioni/':'';const source=root+(src?'src/':'');const calls=[];
 const paths=[source+'app/manifest.ts',source+'app/layout.tsx',source+'app/api/udhetimet/route.ts',source+'components/Pwa.tsx',root+'public/sw.js',root+'public/offline.html',root+'public/icons/icon-192.png',root+'public/icons/icon-512.png'];
 const github={rest:{repos:{
  get:async args=>{calls.push(['metadata',args]);return {data:{private:false,default_branch:'main'}};},
  getBranch:async args=>{calls.push(['branch',args]);return {data:{commit:{sha:'abc',commit:{tree:{sha:'tree-abc'}}}}};},
  getContent:async args=>{
   calls.push(['content',args]);assert.equal(args.ref,'abc');
   if(!args.path)return {data:[file(reportName),nested?{name:'aplikacioni',type:'dir'}:file('package.json')]};
   if(args.path==='aplikacioni')return {data:[{...file('package.json'),path:root+'package.json'}]};
   assert.ok([reportName,root+'package.json'].includes(args.path),'only report and package contents may be read');
   const text=args.path===reportName?(reportText??'# Java 6\n### Prova 1\nManifesti dhe ikonat u shfaqën në panelin Application të shfletuesit.\n### Prova 2\nService Worker u regjistrua dhe ruajti faqen rezervë gjatë provës.\n### Prova 3\nPa rrjet u shfaq offline.html dhe API ktheu mesazhin e pritshëm.'):
    JSON.stringify(validPackage?{dependencies:{next:'16'},scripts:{dev:'next dev',build:'next build'}}:{scripts:{dev:'next dev'}});
   return {data:{encoding:'base64',content:Buffer.from(text).toString('base64')}};
  }
 },git:{getTree:async args=>{calls.push(['tree',args]);assert.equal(args.tree_sha,'tree-abc');assert.equal(args.recursive,'1');return {data:{truncated:false,tree:[...paths.filter(path=>!omit.some(suffix=>path.endsWith(suffix))),root+'.env.example',root+'.env.sample',root+'.env.template',...env].map(path=>({path,type:'blob'}))}};}}}};
 return {github,calls};
}
test('week 6 accepts root/nested PWA files with or without src and keeps reads bounded to a pinned commit',async()=>{
 for(const nested of [false,true])for(const src of [false,true]) {
  const {github,calls}=week6Api({nested,src});const result=await checkFiles({owner:'arta',repo:'r',week:6},github);
  assert.equal(result.checks.length,5);assert.ok(result.checks.every(check=>check.ok),JSON.stringify(result.checks));
  assert.equal(calls.filter(([type])=>type==='tree').length,1);assert.ok(calls.length<=7);
  assert.deepEqual(calls.filter(([type])=>type==='content').map(([,args])=>args.path),nested?['','java-06.md','aplikacioni','aplikacioni/package.json']:['','java-06.md','package.json']);
  assert.match(result.checks[3].message,/PWA/);assert.match(result.checks[3].message,/nuk.*(?:ekzekuton|verifikon)/);
  assert.match(report(result),/5\/5 kontrolle teknike/);assert.match(report(result),/jo notë/);
 }
});
test('week 6 identifies each missing PWA file by filename',async()=>{
 for(const omitted of ['app/manifest.ts','app/layout.tsx','app/api/udhetimet/route.ts','components/Pwa.tsx','public/sw.js','public/offline.html','public/icons/icon-192.png','public/icons/icon-512.png']) {
  const {github}=week6Api({omit:[omitted]});const result=await checkFiles({owner:'arta',repo:'r',week:6},github);
  assert.equal(result.checks[3].ok,false);assert.ok(result.checks[3].message.includes(omitted));assert.equal(result.checks.filter(check=>check.ok).length,4);
 }
});
test('week 6 requires the markdown report and meaningful results in all three probe sections',async()=>{
 const {github}=week6Api({reportText:'# Java 6\n### Prova 1\nManifesti dhe ikonat shfaqen në Application dhe lexohen në telefon.\n### Prova 2\nU krye.\n### Prova 3\nPa rrjet shfaqet faqja rezervë gjatë provës së raportuar në klasë.'});
 const result=await checkFiles({owner:'arta',repo:'r',week:6},github);assert.equal(result.checks[0].ok,true);assert.equal(result.checks[2].ok,false);assert.match(result.checks[2].message,/Prova 2/);assert.match(result.checks[2].message,/java-06.md/);
 const txt=await checkFiles({owner:'arta',repo:'r',week:6},week6Api({reportName:'java-06.txt'}).github);assert.equal(txt.checks[0].ok,false);assert.match(txt.checks[0].message,/java-06.md/);
});
test('week 6 retains Next metadata and rejects exposed env files while accepting example filenames',async()=>{
 const {github}=week6Api({nested:true,validPackage:false,env:['aplikacioni/.env','aplikacioni/.env.local','aplikacioni/.env.production','aplikacioni/.env.example.local']});
 const result=await checkFiles({owner:'arta',repo:'r',week:6},github);assert.equal(result.checks[1].ok,false);assert.equal(result.checks[4].ok,false);
 for(const name of ['.env,','.env.local','.env.production','.env.example.local'])assert.ok(result.checks[4].message.includes(name));
 assert.match(result.checks[4].message,/ndërro kredencialet/);
});
test('week 6 invalidates old two-check reports and reuses only the current commit report',async()=>{
 const {github,calls}=week6Api({nested:true});const sub={owner:'arta',repo:'r',week:6};
 const old='<!-- mobile-submission-check-v1 -->\n<!-- semester-v5-auth:arta/r:6:abc -->\n**2/2 kontrolle teknike kaluan.**';
 const result=await checkFiles(sub,github,old);assert.equal(result.checks.length,5);
 const before=calls.length;assert.deepEqual(await checkFiles(sub,github,report(result)),{unchanged:true});assert.equal(calls.length-before,2);
});
test('week 6 refuses incomplete recursive trees instead of claiming file checks passed',async()=>{
 const {github}=week6Api();github.rest.git.getTree=async()=>({data:{truncated:true,tree:[]}});
 await assert.rejects(checkFiles({owner:'arta',repo:'r',week:6},github),/shumë skedarë/);
});

const week7Base='1'.repeat(40),week7Final='2'.repeat(40),week7Latest='3'.repeat(40);
function week7Report(source='src/app/page.tsx') {
 return `# Java 7 — rishikimi i MVP-së
## Rasti im
P7-974
GitHub: arta
## Parashikimi
Pres që lista bosh të shfaqë mesazh kur nuk ka udhëtime.
## Dy probleme
1. Lista bosh mbetet pa shpjegim për përdoruesin.
2. Ora e nisjes nuk lexohet qartë në telefon.
## Korrigjimi
Skedari: \`${source}\`
Shtova mesazhin që përdoruesi të kuptojë pse lista është bosh.
## Versionet
Para: https://github.com/arta/r/commit/${week7Base}
Pas: https://github.com/arta/r/commit/${week7Final}
### Prova 1
Hapat: Hapa listën me të dhënat e zakonshme.
Pritshmëria: Pres kartat me udhëtimet ekzistuese.
Vëzhgimi: U shfaqën të gjitha kartat e ruajtura.
### Prova 2
Hapat: Hoqa udhëtimet nga të dhënat e provës.
Pritshmëria: Pres mesazhin për listën bosh.
Vëzhgimi: Mesazhi u shfaq pa shkaktuar gabim.
### Prova 3
Hapat: Riktheva të dhënat dhe rifreskova faqen.
Pritshmëria: Pres rikthimin e kartave të udhëtimit.
Vëzhgimi: Kartat u rikthyen dhe mesazhi u zhduk.
## Ndryshimi i ri
Ndryshova filtrin e qytetit në Prizren sepse dua të provoj listën bosh.
## Ndihma nga AI
Nuk përdora AI.
`;
}
function week7Api({nested=false,reportText,reportName='java-07.md',source='src/app/page.tsx',env=[],compareStatus=['ahead','ahead'],compareError,omitSource=false,validPackage=true}={}) {
 const root=nested?'aplikacioni/':'';const sourcePath=root+source;const calls=[];
 const github={rest:{repos:{
  get:async()=>({data:{private:false,default_branch:'main'}}),
  getBranch:async()=>({data:{commit:{sha:week7Latest,commit:{tree:{sha:'tree-week7'}}}}}),
  getContent:async args=>{
   calls.push(['content',args]);assert.equal(args.ref,week7Latest);
   if(args.path==='')return {data:[file(reportName),nested?{name:'aplikacioni',type:'dir'}:file('package.json')]};
   if(args.path==='aplikacioni')return {data:[{...file('package.json'),path:root+'package.json'}]};
   assert.ok([reportName,root+'package.json'].includes(args.path),'never read student source or secrets');
   const text=args.path===reportName?(reportText??week7Report(sourcePath)):JSON.stringify(validPackage?{dependencies:{next:'16'},scripts:{dev:'next dev',build:'next build'}}:{});
   return {data:{encoding:'base64',content:Buffer.from(text).toString('base64')}};
  },
  compareCommitsWithBasehead:async args=>{
   const number=calls.filter(([type])=>type==='compare').length;calls.push(['compare',args]);
   assert.equal(args.owner.toLowerCase(),'arta');assert.equal(args.repo,'r');assert.equal(args.per_page,1);assert.equal(args.page,2,'omit first-page file patches');
   assert.equal(args.basehead,[`${week7Base}...${week7Final}`,`${week7Final}...${week7Latest}`][number]);
   if(compareError)throw Object.assign(new Error('comparison unavailable'),{status:compareError});
   return {data:{status:compareStatus[number]}};
  }
 },git:{getTree:async args=>{calls.push(['tree',args]);assert.equal(args.tree_sha,'tree-week7');assert.equal(args.recursive,'1');return {data:{truncated:false,tree:[...(omitSource?[]:[sourcePath]),root+'.env.example',...env].map(path=>({path,type:'blob'}))}};}}}};
 return {github,calls};
}
test('week 7 has five structural checks, pinned reads, source references and at most two comparisons for root/nested apps',async()=>{
 for(const nested of [false,true]) {
  const {github,calls}=week7Api({nested});const result=await checkFiles({owner:'arta',repo:'r',week:7},github);
  assert.equal(result.checks.length,5);assert.ok(result.checks.every(check=>check.ok),JSON.stringify(result.checks));
  assert.equal(calls.filter(([kind])=>kind==='compare').length,2);assert.equal(calls.filter(([kind])=>kind==='tree').length,1);
  assert.match(result.checks[3].message,/autor|autorësi/);assert.match(report(result),/jo notë/);
 }
});
test('week 7 requires markdown and rejects unchanged template placeholders',async()=>{
 for(const settings of [{reportName:'java-07.txt'},{reportText:week7Report().replace('Nuk përdora AI.','[PLOTËSO]')}]){
  const result=await checkFiles({owner:'arta',repo:'r',week:7},week7Api(settings).github);
  assert.equal(result.checks[0].ok,false);assert.equal(result.checks[2].ok,false);assert.equal(result.checks[3].ok,false);
 }
});
test('week 7 case assignment uses normalized owner login and rejects mismatched code or login',async()=>{
 for(const text of [week7Report().replace('P7-974','P7-001'),week7Report().replace('GitHub: arta','GitHub: dikush')]){
  const result=await checkFiles({owner:'arta',repo:'r',week:7},week7Api({reportText:text}).github);
  assert.equal(result.checks[2].ok,false);assert.match(result.checks[2].message,/P7-974/);
 }
 const upper=week7Report().replace('GitHub: arta','github:  ARTA');
 assert.equal((await checkFiles({owner:'ARTA',repo:'r',week:7},week7Api({reportText:upper.replaceAll('github.com/arta','github.com/ARTA')}).github)).checks[2].ok,true);
});
test('week 7 identifies incomplete sections, two issues and each labelled evidence field',async()=>{
 for(const replacement of [
  ['## Parashikimi\nPres që lista bosh të shfaqë mesazh kur nuk ka udhëtime.','## Parashikimi\n'],
  ['2. Ora e nisjes nuk lexohet qartë në telefon.',''],
  ['Hapat: Hoqa udhëtimet nga të dhënat e provës.','Hapat:'],
  ['Pritshmëria: Pres rikthimin e kartave të udhëtimit.',''],
  ['Vëzhgimi: U shfaqën të gjitha kartat e ruajtura.','Vëzhgimi:'],
  ['## Ndryshimi i ri\nNdryshova filtrin e qytetit në Prizren sepse dua të provoj listën bosh.',''],
  ['## Ndihma nga AI\nNuk përdora AI.','']
 ]) {
  const result=await checkFiles({owner:'arta',repo:'r',week:7},week7Api({reportText:week7Report().replace(...replacement)}).github);
  assert.equal(result.checks[2].ok,false,JSON.stringify(replacement));
 }
});
test('week 7 rejects missing, unsafe or excluded source paths and repository-mismatched commit links',async()=>{
 for(const options of [
  {omitSource:true},
  {source:'../app/page.tsx'},
  {source:'node_modules/a.ts'},
  {source:'.next/server/a.js'},
  {source:'public/data.json'},
  {nested:true,reportText:week7Report()},
  {reportText:week7Report().replaceAll('github.com/arta/r/commit','github.com/other/r/commit')},
  {reportText:week7Report().replaceAll('github.com/arta/r/commit','github.com/arta/other/commit')},
  {reportText:week7Report().replace(week7Final,week7Base)},
  {reportText:week7Report().replace(week7Final,'abcdef')},
  {reportText:week7Report().replace('Skedari: `src/app/page.tsx`','Skedari: `src/app/page.tsx`\nSkedari: `src/app/other.tsx`')}
 ]) {
  const result=await checkFiles({owner:'arta',repo:'r',week:7},week7Api(options).github);
  assert.equal(result.checks[3].ok,false,JSON.stringify(options));
 }
});
test('week 7 rejects reversed/diverged/unreachable commits and accepts final equal to pinned latest',async()=>{
 for(const compareStatus of [['behind','ahead'],['diverged','ahead'],['identical','ahead'],['ahead','behind'],['ahead','diverged']]){
  const result=await checkFiles({owner:'arta',repo:'r',week:7},week7Api({compareStatus}).github);
  assert.equal(result.checks[3].ok,false,JSON.stringify(compareStatus));
 }
 const {github,calls}=week7Api({reportText:week7Report().replace(week7Final,week7Latest)});
 github.rest.repos.compareCommitsWithBasehead=async args=>{calls.push(['compare',args]);assert.equal(args.basehead,`${week7Base}...${week7Latest}`);return {data:{status:'ahead'}};};
 const result=await checkFiles({owner:'arta',repo:'r',week:7},github);
 assert.equal(result.checks[3].ok,true);assert.equal(calls.filter(([kind])=>kind==='compare').length,1);
});
test('week 7 checks env filenames, rejects truncated trees, and never reads env contents',async()=>{
 const result=await checkFiles({owner:'arta',repo:'r',week:7},week7Api({env:['.env.local','aplikacioni/.env.production']}).github);
 assert.equal(result.checks[4].ok,false);assert.match(result.checks[4].message,/\.env.local/);
 const {github}=week7Api();github.rest.git.getTree=async()=>({data:{truncated:true,tree:[]}});
 await assert.rejects(checkFiles({owner:'arta',repo:'r',week:7},github),/shumë skedarë/);
});
test('week 7 missing commits are structural failures; transient comparison errors do not become cached failures',async()=>{
 const missing=await checkFiles({owner:'arta',repo:'r',week:7},week7Api({compareError:404}).github);
 assert.equal(missing.checks[3].ok,false);assert.match(missing.checks[3].message,/commit/);
 for(const status of [403,429,503])await assert.rejects(checkFiles({owner:'arta',repo:'r',week:7},week7Api({compareError:status}).github),error=>error.status===status);
});
test('week 7 invalidates its former generic cache without changing old week cache keys',async()=>{
 const {github,calls}=week7Api();const sub={owner:'arta',repo:'r',week:7};
 const old=`<!-- semester-v6-pwa:arta/r:7:${week7Latest} -->`;
 const result=await checkFiles(sub,github,old);assert.equal(result.checks.length,5);assert.match(result.key,/semester-v7-mvp/);
 const count=calls.length;assert.deepEqual(await checkFiles(sub,github,report(result)),{unchanged:true});assert.equal(calls.length,count);
 const week6=await checkFiles({...sub,week:6},week6Api().github);assert.match(week6.key,/semester-v6-pwa/);
});
test('week 7 accepts CRLF, case/spacing in labels and unquoted source paths',async()=>{
 const text=week7Report().replace('GitHub: arta','  github : @ARTA').replace('Skedari: `src/app/page.tsx`','skedari : src/app/page.tsx').replace('### Prova 2','### prova 2  ').replaceAll('Hapat:','  hapat :').replaceAll('\n','\r\n');
 const result=await checkFiles({owner:'arta',repo:'r',week:7},week7Api({reportText:text}).github);
 assert.ok(result.checks.every(check=>check.ok),JSON.stringify(result.checks));
});
test('week 7 API error reports do not suppress a later recheck at the same commit',async()=>{
 let body;const {github}=week7Api({compareError:503});
 const submissionIssue=issue('https://github.com/arta/r');submissionIssue.body=submissionIssue.body.replace('Java 1','Java 7');
 github.rest.issues={get:async()=>({data:submissionIssue}),listComments:()=>{},createComment:async args=>{body=args.body;},updateComment:async args=>{body=args.body;}};
 github.paginate=async()=>body?[{id:7,user:{login:'github-actions[bot]'},body}]:[];
 const context={repo:{owner:'arbenl',repo:'course'},issue:{number:1},eventName:'issues'};
 await run({github,context});assert.match(body,/Provo më vonë/);assert.doesNotMatch(body,/semester-v7-mvp/);
 github.rest.repos.compareCommitsWithBasehead=async()=>({data:{status:'ahead'}});
 await run({github,context});assert.match(body,/5\/5 kontrolle teknike/);assert.match(body,/semester-v7-mvp/);
});
test('week 7 accepts a CSS correction in root/nested apps only when its file exists',async()=>{
 for(const nested of [false,true]) {
  const settings={nested,source:'src/app/globals.css'};
  const result=await checkFiles({owner:'arta',repo:'r',week:7},week7Api(settings).github);
  assert.equal(result.checks.length,5);assert.ok(result.checks.every(check=>check.ok),JSON.stringify(result.checks));
  const missing=await checkFiles({owner:'arta',repo:'r',week:7},week7Api({...settings,omitSource:true}).github);
  assert.equal(missing.checks[3].ok,false);assert.match(missing.checks[3].message,/\.css/);
 }
});

function week8Api({text,broken=false,nested=false}={}) {
 const good='# Java 8\n'+[1,2,3].map(n=>`### Prova ${n}: kontroll\nHapat: hapa faqen dhe provova veprimin.\nPritshmëria: mesazhi i duhur.\nVëzhgimi: rezultati u regjistrua nga prova ime.\n`).join('')+'\n## Prova me një hyrje të re\n- Hyrja që provova: hapësira\n- Parashikimi im para klikimit: mesazh plotësimi\n- Çfarë pashë realisht: mesazh plotësimi\n- Skedari dhe funksioni që e shpjegojnë: components/Vendtakimi.tsx, konfirmo\n- Çfarë kuptova ose korrigjova: trim heq hapësirat\n';
 const github=api([]);let reads=0;
 github.rest.repos.getContent=async({path,ref})=>{
  reads++;assert.equal(ref,'abc');
  if(!path)return {data:[file('java-08.md'),nested?{name:'aplikacioni',type:'dir'}:file('package.json')]};
  if(path==='aplikacioni')return {data:[{...file('package.json'),path:'aplikacioni/package.json'}]};
  return {data:{encoding:'base64',content:Buffer.from(path.endsWith('package.json')?(broken?'bad':JSON.stringify({dependencies:{next:'16'},scripts:{dev:'next dev',build:'next build'}})):(text??good)).toString('base64')}};
 };
 return {github,good,reads:()=>reads};
}
test('week 8 reports six bounded structural checks for root and nested projects',async()=>{
 for(const nested of [false,true]){const a=week8Api({nested});const r=await checkFiles({owner:'arta',repo:'r',week:8},a.github);assert.equal(r.checks.length,6);assert.ok(r.checks.every(c=>c.ok));assert.ok(a.reads()<=4);assert.match(report(r),/Çfarë kaloi/);assert.match(report(r),/Çfarë duhet të përmirësosh/);assert.match(report(r),/Demonstro/);}
});
test('week 8 identifies each missing probe and empty new-input field',async()=>{
 const {good}=week8Api();
 for(const n of [1,2,3]){const a=week8Api({text:good.replace(new RegExp(`### Prova ${n}[^]*?(?=###|## Prova|$)`),'')});const r=await checkFiles({owner:'arta',repo:'r',week:8},a.github);assert.equal(r.checks[n+1].ok,false);assert.match(r.checks[n+1].message,new RegExp(`Prova ${n}`));}
 const a=week8Api({text:good.replace('Hyrja që provova: hapësira','Hyrja që provova:')});const r=await checkFiles({owner:'arta',repo:'r',week:8},a.github);assert.equal(r.checks[5].ok,false);assert.match(r.checks[5].message,/Hyrja që provova/);
});
test('week 8 rejects template and malformed package, invalidates old cache',async()=>{
 const a=week8Api({text:'[PLOTËSO] '.repeat(20),broken:true});const r=await checkFiles({owner:'arta',repo:'r',week:8},a.github);assert.ok(r.checks.every(c=>!c.ok));assert.match(report(r),/Ende asnjë/);
 const b=week8Api();const sub={owner:'arta',repo:'r',week:8};const good=await checkFiles(sub,b.github,'<!-- semester-v6-pwa:arta/r:8:abc -->');assert.equal(good.checks.length,6);assert.deepEqual(await checkFiles(sub,b.github,report(good)),{unchanged:true});
});
test('week 8 rejects misnumbered headings and empty labels; accepts CRLF reports',async()=>{
 const {good}=week8Api();
 for(const text of [good.replace('### Prova 1:','### Prova 10:'),good.replace(/### Prova 1[^]*?(?=### Prova 2)/,'### Prova 1\nHapat:\nPritshmëria:\nVëzhgimi:\n')]) {
  const r=await checkFiles({owner:'arta',repo:'r',week:8},week8Api({text}).github);assert.equal(r.checks[2].ok,false);
 }
 const r=await checkFiles({owner:'arta',repo:'r',week:8},week8Api({text:good.replaceAll('\n','\r\n')}).github);assert.ok(r.checks.every(c=>c.ok));
});
