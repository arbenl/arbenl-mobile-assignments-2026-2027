const VERSION = 'semester-v6-pwa';
const MARKER = '<!-- mobile-submission-check-v1 -->';
function field(body, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (body.match(new RegExp(`^### ${escaped}\\s*\\n([\\s\\S]*?)(?=^### |$(?![\\s\\S]))`, 'm'))?.[1] || '').trim();
}
function parseSubmission(issue) {
  if (!/^\[MOBILE (?:DORËZIM|J02)\]/u.test(issue.title || '')) return null;
  const body = issue.body || '';
  const week = issue.title.startsWith('[MOBILE J02]') ? 2 : Number(field(body, 'Java').match(/^Java (1[0-5]|[1-9])(?:\s|$)/)?.[1]);
  if (!Number.isInteger(week) || week < 1 || week > 15) throw new Error('Zgjidh javën përkatëse (1–15) në formular.');
  const raw = field(body, 'Linku i punës në GitHub');
  const match = raw.match(/^https:\/\/github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9_.-]+)\/?$/);
  if (!match || match[2]==='.' || match[2]==='..') throw new Error('Kopjo linkun kryesor të repository-t: https://github.com/llogaria/rideshare-mobile. Jo linkun e një skedari, dosjeje ose Pull Request.');
  if (match[1].toLowerCase() !== issue.user.login.toLowerCase()) throw new Error('Dorëzo repository-n në llogarinë tënde GitHub. Hape formularin me të njëjtën llogari që zotëron repository-n.');
  return {week, owner:match[1], repo:match[2]};
}
const names = {
  1: [
    {label:'Exit Ticket', files:['exit-ticket.md','exit-ticket.pdf','exit-ticket.docx','exit-ticket.txt','exit_ticket_lecture1.md']},
    {label:'PRD', files:['prd.md','prd.pdf','prd.docx','prd.txt','prd_template_aab_mobile_2026.md']}
  ],
  2: [
    {label:'PRD e javës 2', files:['java-02.md','java-02.pdf','java-02.docx','java-02.txt']},
    {label:'Skica', files:['skica.jpg','skica.jpeg','skica.png','skica.pdf']}
  ],
  6: [{label:'Raporti i javës 6',files:['java-06.md']}],
  7: [{label:'Raporti i javës 7',files:['java-07.md']}]
};
function cacheKey({owner,repo,week},ref) {return `<!-- ${week===8?'semester-v8-evidence':week===7?'semester-v7-mvp':VERSION}:${owner.toLowerCase()}/${repo.toLowerCase()}:${week}:${ref} -->`;}
function week7Case(owner) {
  let hash=0;
  for(const character of owner.trim().toLowerCase())hash=(hash*31+character.charCodeAt(0))%1000;
  return `P7-${String(hash).padStart(3,'0')}`;
}
// These helpers inspect report structure only, never whether a student's claims are true.
function section(text,title,depth=2) {
  const heading='#'.repeat(depth);
  const pattern=new RegExp(`^${heading}[ \\t]+${title}[ \\t]*\\r?\\n([\\s\\S]*?)(?=^#{1,${depth}}[ \\t]+|$(?![\\s\\S]))`,'gimu');
  const matches=[...text.matchAll(pattern)];
  return matches.length===1?matches[0][1].trim():'';
}
function labelledLines(text,label) {
  return [...text.matchAll(new RegExp(`^[ \\t]*${label}[ \\t]*:[ \\t]*([^\\r\\n]*)$`,'gimu'))].map(match=>match[1].trim());
}
function labelledValue(text,label) {
  const values=labelledLines(text,label);
  return values.length===1?values[0]:'';
}
function week7Evidence(text,owner) {
  const missing=[];
  const identity=section(text,'Rasti im');
  const codes=identity.match(/\bP7-\d{3}\b/giu) || [];
  if(codes.length!==1 || codes[0].toUpperCase()!==week7Case(owner) || labelledValue(identity,'GitHub').replace(/^@/,'').toLowerCase()!==owner.toLowerCase())missing.push(`Rasti im (${week7Case(owner)}, GitHub: ${owner})`);
  for(const title of ['Parashikimi','Ndryshimi i ri','Ndihma nga AI'])if(!section(text,title))missing.push(title);
  const issues=section(text,'Dy probleme');
  if(!/^[ \t]*1[.)][ \t]+\S.+$/mu.test(issues) || !/^[ \t]*2[.)][ \t]+\S.+$/mu.test(issues))missing.push('Dy probleme (1. dhe 2.)');
  const correction=section(text,'Korrigjimi');
  if(!correction.replace(/^[ \t]*Skedari[ \t]*:[^\r\n]*$/gimu,'').trim())missing.push('Korrigjimi (arsyeja)');
  for(const number of [1,2,3]) {
    const evidence=section(text,`Prova[ \\t]+${number}`,3);
    if(['Hapat','Pritshmëria','Vëzhgimi'].some(label=>!labelledValue(evidence,label)))missing.push(`Prova ${number} (Hapat, Pritshmëria, Vëzhgimi)`);
  }
  return missing;
}
async function week7References(text,{owner,repo},root,paths,ref,github) {
  const value=labelledValue(section(text,'Korrigjimi'),'Skedari');
  const source=value.startsWith('`') && value.endsWith('`')?value.slice(1,-1):value;
  const parts=source.split('/');
  if(!source || source.startsWith('/') || /[\\:\x00-\x1f]/u.test(source) || parts.some(part=>['','..','.','node_modules','.next'].includes(part)) || !/\.(?:tsx?|jsx?|css)$/iu.test(source) || !source.startsWith(root) || !paths.has(source))return 'Korrigjimi: shkruaj një Skedari: me shteg relativ ndaj repository-t, .tsx/.ts/.js/.jsx/.css, që ekziston brenda projektit (jo node_modules ose .next).';
  const versions=section(text,'Versionet');
  const commits=['Para','Pas'].map(label=>{
    const match=labelledValue(versions,label).match(/^https:\/\/github\.com\/([a-z\d-]+)\/([a-z\d_.-]+)\/commit\/([a-f\d]{40})$/iu);
    return match && match[1].toLowerCase()===owner.toLowerCase() && match[2].toLowerCase()===repo.toLowerCase()?match[3].toLowerCase():null;
  });
  if(commits.some(commit=>!commit) || commits[0]===commits[1])return 'Versionet: plotëso Para: dhe Pas: me dy linke commit të ndryshme nga repository yt; secili SHA duhet të ketë 40 shenja.';
  const [before,after]=commits;
  try {
    // Page 2 omits first-page file patches; only bounded comparison metadata is needed.
    const comparison=await github.rest.repos.compareCommitsWithBasehead({owner,repo,basehead:`${before}...${after}`,per_page:1,page:2});
    if(comparison.data.status!=='ahead')return 'Versionet: commit Para duhet të jetë paraardhës i commit Pas; kontrollo rendin e linkeve dhe historikun.';
    if(after!==ref.toLowerCase()) {
      const latest=await github.rest.repos.compareCommitsWithBasehead({owner,repo,basehead:`${after}...${ref}`,per_page:1,page:2});
      if(!['ahead','identical'].includes(latest.data.status))return 'Versionet: commit Pas duhet të jetë në historikun e versionit të kontrolluar në degën kryesore. Bëj Commit → Push origin dhe korrigjo linkun.';
    }
  }catch(error) {
    if(error.status===404)return 'Versionet: një commit nuk u gjet në repository. Kontrollo linket Para/Pas dhe bëj Push origin.';
    throw error; // Temporary API failures must remain retryable, without a cached verdict.
  }
  return '';
}
async function checkFiles(submission, github, previousBody='') {
  const {owner,repo,week}=submission;
  const metadata=await github.rest.repos.get({owner,repo});
  if(metadata.data.private) throw new Error('Kontrolli automatik lexon vetëm repository publik. Mos publiko të dhëna private. Nëse duhet ta mbash privat, kërko dorëzim të asistuar nga profesori.');
  const branch=await github.rest.repos.getBranch({owner,repo,branch:metadata.data.default_branch});
  const ref=branch.data.commit.sha;
  const key=cacheKey(submission,ref);
  if(previousBody.includes(key))return {unchanged:true};
  const listing=await github.rest.repos.getContent({owner,repo,path:'',ref});
  if(!Array.isArray(listing.data)) throw new Error('Nuk u lexua lista e skedarëve. Provoje përsëri.');
  const checks=[];
  let weeklyReport='';
  for(const item of (names[week] || [{label:`Raporti i javës ${week}`,files:[`java-${String(week).padStart(2,'0')}.md`,`java-${String(week).padStart(2,'0')}.txt`]}])) {
    const file=listing.data.find(f=>f.type==='file' && item.files.includes(f.name.toLowerCase()));
    if(!file){checks.push({ok:false,message:`${item.label}: mungon. Me Add file → Upload files, ngarko ${item.files[0]} në faqen kryesore të repository-t, jo brenda ZIP-it.`});continue;}
    if(!file.size || file.size>10*1024*1024){checks.push({ok:false,message:`${item.label}: skedari duhet të ketë përmbajtje dhe të jetë më i vogël se 10 MB.`});continue;}
    if(/\.(md|txt)$/i.test(file.name)) {
      if(file.size>100000){checks.push({ok:false,message:`${item.label}: dokumenti tekst duhet të jetë më i vogël se 100 KB.`});continue;}
      const result=await github.rest.repos.getContent({owner,repo,path:file.path,ref});
      if(result.data.encoding!=='base64'){checks.push({ok:false,message:`${item.label}: nuk u lexua përmbajtja. Ruaje si .md ose .txt të zakonshëm.`});continue;}
      const text=Buffer.from(result.data.content,'base64').toString('utf8');
      if(text.trim().length<80 || /\[PLOTËSO\]/iu.test(text)){checks.push({ok:false,message:`${item.label}: plotëso përgjigjet, hiq shenjat [PLOTËSO] dhe ruaje përsëri. Mos dorëzo modelin bosh.`});continue;}
      if(week>=3 && week<=8)weeklyReport=text;
    }
    checks.push({ok:true,message:`${item.label}: skedari u gjet dhe nuk është bosh. Përmbajtja dhe cilësia nuk janë vlerësuar nga ky kontroll.`});
  }
  if(week>=3) {
    let source=listing.data;
    let packageFile=source.find(f=>f.type==='file' && f.name==='package.json');
    if(!packageFile && source.some(f=>f.type==='dir' && f.name==='aplikacioni')) {
      const nested=await github.rest.repos.getContent({owner,repo,path:'aplikacioni',ref});
      source=Array.isArray(nested.data)?nested.data:[];
      packageFile=source.find(f=>f.type==='file' && f.name==='package.json');
    }
    let valid=false;
    let pkg;
    if(packageFile && packageFile.size>0 && packageFile.size<=100000) {
      const result=await github.rest.repos.getContent({owner,repo,path:packageFile.path,ref});
      if(result.data.encoding==='base64')try {
        pkg=JSON.parse(Buffer.from(result.data.content,'base64').toString('utf8'));
        valid=Boolean((pkg.dependencies?.next || pkg.devDependencies?.next) && typeof pkg.scripts?.dev==='string' && typeof pkg.scripts?.build==='string');
      }catch{/* Invalid JSON is a failed check; no student code is executed. */}
    }
    checks.push({ok:valid,message:valid?'Projekti Next.js: u gjet package.json me komandat dev/build. Ky kontroll nuk e ekzekuton ose vlerëson aplikacionin.':'Projekti Next.js: mungon package.json i vlefshëm në rrënjë ose në aplikacioni/. Ruaj kodin me GitHub Desktop → Commit → Push origin; mos ngarko ZIP ose node_modules.'});
    if(week===8) {
      const purposes=['hapjen pa kërkesë lejeje dhe pranimin pas klikimit','refuzimin me vendtakim manual dhe simulimin e pritjes së përfunduar','kontrollin që dëshmitë nuk publikojnë vendndodhjen reale ose sekrete'];
      for(const number of [1,2,3]) {
        const evidence=section(weeklyReport,`Prova[ \t]+${number}[^\n]*`,3);
        const meaningful=evidence.replace(/^[ \t]*(?:[-*][ \t]*)?(?:Hapat|Pritshmëria|Vëzhgimi)[ \t]*:[ \t]*$/gimu,'').trim();
        const ok=meaningful.length>=25;
        checks.push({ok,message:ok?`Prova ${number}: u gjet përshkrimi për ${purposes[number-1]}. Kontrolli lexon tekstin; rezultatin e demonstron ti.`:`Prova ${number}: te java-08.md plotëso seksionin “### Prova ${number}” me hapat, pritshmërinë dhe atë që pe realisht për ${purposes[number-1]}. Mos lër vetëm titullin ose etiketa bosh.`});
      }
      const changed=section(weeklyReport,'Prova me një hyrje të re');
      const labels=['Hyrja që provova','Parashikimi im para klikimit','Çfarë pashë realisht','Skedari dhe funksioni që e shpjegojnë','Çfarë kuptova ose korrigjova'];
      const missing=labels.filter(label=>!labelledValue(changed.replace(/^[ \t]*[-*][ \t]+/gm,''),label));
      checks.push({ok:missing.length===0,message:missing.length?`Prova me një hyrje të re: plotëso fushat ${missing.join(', ')} te java-08.md. Provoje në aplikacionin tënd dhe shkruaj vëzhgimin real.`:'Prova me një hyrje të re: u gjetën hyrja, parashikimi, vëzhgimi, skedari/funksioni dhe reflektimi. Përgatitu ta përsëritësh dhe ta shpjegosh në klasë.'});
    }
    if(week===7) {
      const missing=week7Evidence(weeklyReport,owner);
      checks.push({ok:missing.length===0,message:missing.length===0?'Raporti i MVP-së: u gjetën rasti, parashikimi, dy probleme, arsyeja e korrigjimit, tri provat me hapa/pritshmëri/vëzhgime, ndryshimi i ri dhe deklarimi i ndihmës nga AI. Ky është kontroll strukturor; saktësinë e demonstron ti në klasë.':`Raporti i MVP-së: plotëso në java-07.md seksionet ${missing.join('; ')}. Ky kontroll lexon strukturën, jo vërtetësinë e përgjigjeve.`});
      const treeSha=branch.data.commit.commit?.tree?.sha;
      if(!treeSha)throw new Error('GitHub nuk ktheu skedarët për Javën 7. Provo përsëri me rikontrollo.');
      const tree=await github.rest.git.getTree({owner,repo,tree_sha:treeSha,recursive:'1'});
      if(tree.data.truncated)throw new Error('Repository ka shumë skedarë për kontrollin. Hiq node_modules dhe .next nga GitHub ose kërko ndihmë.');
      const paths=new Set(tree.data.tree.filter(item=>item.type==='blob').map(item=>item.path));
      const root=packageFile?.path==='aplikacioni/package.json'?'aplikacioni/':'';
      const referenceError=await week7References(weeklyReport,submission,root,paths,ref,github);
      checks.push({ok:!referenceError,message:referenceError || 'Referencat: skedari burimor ekziston dhe commit-et Para/Pas janë në rendin e kërkuar, brenda historikut të versionit të kontrolluar. Kjo nuk provon autorësinë, përdorimin e AI ose funksionimin e korrigjimit.'});
      const envFiles=[...paths].filter(path=>/(^|\/)\.env(?:$|\.(?!(?:example|sample|template)$))/i.test(path));
      checks.push({ok:envFiles.length===0,message:envFiles.length===0?'Skedarët privatë: nuk u gjet emër skedari .env i publikuar. Përmbajtja e skedarëve burimorë dhe sekreteve nuk lexohet; kontrolli i emrave nuk zbulon çdo sekret.':`Skedarë privatë në GitHub: ${envFiles.join(', ')}. Ndalo publikimin e kredencialeve, ndërro kredencialet nëse u ekspozuan dhe kërko ndihmën e profesorit. Shto .env* te .gitignore; mos e shkruaj sekretin në Issue.`});
    }
    if(week===3) {
      const missing=[1,2,3].filter(number=>{
        const section=weeklyReport.match(new RegExp(`^###\\s+Prova\\s+${number}\\b[^\\n]*\\n([\\s\\S]*?)(?=^#{2,3}\\s|$(?![\\s\\S]))`,'mi'))?.[1] || '';
        return section.trim().length<25;
      });
      checks.push({ok:missing.length===0,message:missing.length===0?'Tri provat: raporti përmban një rezultat të shkruar për secilën provë. Kontrollo vetë që rezultatet janë të vërteta.':`Tri provat: plotëso seksionet Prova ${missing.join(', ')} në java-03.md me hapat dhe rezultatin real (të paktën një fjali secila).`});
      const treeSha=branch.data.commit.commit?.tree?.sha;
      if(!treeSha)throw new Error('GitHub nuk ktheu listën e skedarëve për kontrollin e Javës 3. Provo përsëri me rikontrollo.');
      const tree=await github.rest.git.getTree({owner,repo,tree_sha:treeSha,recursive:'1'});
      if(tree.data.truncated)throw new Error('Repository ka shumë skedarë për kontrollin e Javës 3. Hiq node_modules dhe .next nga GitHub ose kërko ndihmë nga profesori.');
      const paths=new Set(tree.data.tree.filter(item=>item.type==='blob').map(item=>item.path));
      const root=packageFile?.path==='aplikacioni/package.json'?'aplikacioni/':'';
      const app=paths.has(`${root}src/app/page.tsx`)?`${root}src/app/`:`${root}app/`;
      const needed=[
        ['Lista',`${app}page.tsx`],
        ['Detajet',`${app}udhetimi/[id]/page.tsx`],
        ['Simulimi i kërkesës',`${app}udhetimi/[id]/kerkesa/page.tsx`]
      ];
      const absent=needed.filter(([,path])=>!paths.has(path));
      checks.push({ok:absent.length===0,message:absent.length===0?'Tri faqet e RideShare u gjetën në GitHub. Kontrolli nuk i ekzekuton.':`Faqet RideShare që mungojnë: ${absent.map(([name,path])=>`${name} (${path})`).join('; ')}. Krijoji, pastaj Commit → Push origin.`});
      const components=[`${root}src/components/`,`${root}components/`];
      const hasComponent=[...paths].some(path=>components.some(folder=>path.startsWith(folder) && /\.tsx$/.test(path)));
      checks.push({ok:hasComponent,message:hasComponent?'Komponenti: u gjet një skedar .tsx në dosjen components. Provo vetë që karta shfaqet dhe lidhjet punojnë.':`Komponenti: krijo ${root}src/components/KartaUdhetimi.tsx (ose components/ pa src), pastaj Commit → Push origin.`});
    }
    if(week>=4 && week<=6) {
      const missing=[1,2,3].filter(number=>{
        const section=weeklyReport.match(new RegExp(`^###\\s+Prova\\s+${number}\\b[^\\n]*\\n([\\s\\S]*?)(?=^#{2,3}\\s|$(?![\\s\\S]))`,'mi'))?.[1] || '';
        return section.trim().length<25;
      });
      checks.push({ok:missing.length===0,message:missing.length===0?(week===6?'Tri provat: raporti përmban rezultate të shkruara për manifestin, rifreskimin pa rrjet dhe rikthimin e lidhjes. Demonstroji në klasë; ky kontroll nuk verifikon funksionimin offline.':week===5?'Tri provat: u gjetën rezultatet për sesionin, ruajtjen e lejuar dhe refuzimin e veprimit pa leje. Demonstroji në klasë.':'Tri provat: u gjetën rezultatet e shkruara për ndryshimin, listën bosh dhe lidhjen e munguar. Demonstroji në klasë.'):`Tri provat: plotëso Prova ${missing.join(', ')} në java-0${week}.md me hapat dhe rezultatin real (të paktën një fjali secila).`});
      const treeSha=branch.data.commit.commit?.tree?.sha;
      if(!treeSha)throw new Error(`GitHub nuk ktheu skedarët për Javën ${week}. Provo përsëri me rikontrollo.`);
      const tree=await github.rest.git.getTree({owner,repo,tree_sha:treeSha,recursive:'1'});
      if(tree.data.truncated)throw new Error('Repository ka shumë skedarë për kontrollin. Hiq node_modules dhe .next nga GitHub ose kërko ndihmë.');
      const paths=new Set(tree.data.tree.filter(item=>item.type==='blob').map(item=>item.path));
      const root=packageFile?.path==='aplikacioni/package.json'?'aplikacioni/':'';
      const src=(week===6?['app/manifest.ts','app/layout.tsx','app/api/udhetimet/route.ts','components/Pwa.tsx'].some(path=>paths.has(`${root}src/${path}`)):paths.has(`${root}src/app/page.tsx`))?`${root}src/`:root;
      if(week===6) {
        const needed=[`${src}app/manifest.ts`,`${src}app/layout.tsx`,`${src}app/api/udhetimet/route.ts`,`${src}components/Pwa.tsx`,`${root}public/sw.js`,`${root}public/offline.html`,`${root}public/icons/icon-192.png`,`${root}public/icons/icon-512.png`];
        const absent=needed.filter(path=>!paths.has(path));
        checks.push({ok:absent.length===0,message:absent.length===0?'PWA: u gjetën manifesti, layout, rruga API, komponenti, Service Worker, faqja offline dhe ikonat. Kontrolli nuk ekzekuton kodin dhe nuk verifikon instalimin ose funksionimin offline.':`PWA: ruaj skedarët që mungojnë: ${absent.join(', ')}. Pastaj Commit → Push origin. Prania e skedarëve nuk verifikon funksionimin offline.`});
      } else {
        const needed=week===5?[`${root}schema-java05.sql`,`${src}lib/auth.ts`,`${src}lib/lejet.ts`,`${src}lib/db.ts`,`${src}app/page.tsx`,`${src}app/api/auth/[...nextauth]/route.ts`,`${src}app/panel/page.tsx`,`${src}app/panel/actions.ts`,`${src}components/Hyrja.tsx`]:[`${root}schema.sql`,`${src}lib/db.ts`,`${src}lib/udhetimet.ts`,`${src}app/page.tsx`,`${src}app/udhetimi/[id]/page.tsx`,`${src}app/udhetimi/[id]/kerkesa/page.tsx`];
        const absent=needed.filter(path=>!paths.has(path));
        const hasDriver=Boolean(pkg?.dependencies?.['@neondatabase/serverless']);
        const hasBoundary=Boolean(pkg?.dependencies?.['server-only']);
        const hasAuth=week!==5 || /^[~^]?4\./.test(pkg?.dependencies?.['next-auth'] || '');
        checks.push({ok:absent.length===0 && hasDriver && hasBoundary && hasAuth,message:absent.length===0 && hasDriver && hasBoundary && hasAuth?(week===5?'Hyrja dhe lejet: skedarët dhe paketat u gjetën. Sesionin, pronësinë dhe refuzimin real i provon ti; kontrolli nuk ekzekuton kodin.':'Neon: u gjetën schema.sql, helper-at, tri faqet dhe paketat. Lidhjen reale dhe pyetjet i provon ti; kontrolli nuk hap databazën.'):`${week===5?'Hyrja dhe lejet':'Neon'}: ${[...(!hasDriver || !hasBoundary?['në dosjen e aplikacionit ekzekuto npm install @neondatabase/serverless server-only']:[]),...(!hasAuth?['instalo npm install next-auth@4.24.15 sipas udhëzimit të Javës 5']:[]),...(absent.length?['ruaj skedarët '+absent.join(', ')]:[])].join('; ')}. Pastaj Commit → Push origin.`});
      }
      const envFiles=[...paths].filter(path=>/(^|\/)\.env(?:$|\.(?!(?:example|sample|template)$))/i.test(path));
      checks.push({ok:envFiles.length===0,message:envFiles.length===0?'Skedarët privatë: nuk u gjet skedar .env i publikuar. Ky kontroll i emrave nuk zbulon çdo sekret; kontrollo vetë kodin dhe pamjet.':`Skedarë privatë në GitHub: ${envFiles.join(', ')}. Ndalo publikimin e kredencialeve, ndërro kredencialet e Neon/GitHub ose sekretin e sesionit nëse u ekspozuan dhe kërko ndihmën e profesorit. Shto .env* te .gitignore; mos e shkruaj sekretin në Issue.`});
    }
  }
  return {checks,ref,key,week};
}
function report({checks=[],ref,key,error,week}={}) {
  const count=checks.filter(c=>c.ok).length;
  return `${MARKER}\n${key || ''}\n## Kontrolli automatik i dorëzimit\n\n${error?'⚠️ '+error:`**${count}/${checks.length} kontrolle teknike kaluan.**\n\n`+(week===8?['### Çfarë kaloi',...checks.filter(c=>c.ok).map(c=>'✅ '+c.message),...(checks.every(c=>!c.ok)?['Ende asnjë kontroll nuk kaloi.']:[]),'### Çfarë duhet të përmirësosh',...checks.filter(c=>!c.ok).map(c=>'❌ '+c.message),...(checks.every(c=>c.ok)?['Të gjitha kontrollet strukturore kaluan. Demonstro pranimin/refuzimin, vendtakimin manual dhe përfundimin e pritjes në aplikacion.']:[])].join('\n\n'):checks.map(c=>`${c.ok?'✅':'❌'} ${c.message}`).join('\n\n'))}\n\n${ref?`Versioni i kontrolluar: \`${ref}\`.\n\n`:''}Ky është kontroll i dorëzimit, **jo notë**. Kodi nuk ekzekutohet; funksionimi i faqeve dhe cilësia e provave duhet të verifikohen në klasë. PDF/DOCX dhe fotografia kontrollohen vetëm për praninë dhe madhësinë.\n\n**Si e rregulloj?** Hape repository-n tënd → korrigjo skedarët → Commit → Push origin. Pastaj këtu poshtë shkruaj vetëm **rikontrollo** dhe kliko Comment. Përditësohet ky raport; mos hap dorëzim tjetër për të njëjtën javë.\n\n[Udhëzimi me hapa](https://arbenl.github.io/lendet/2026-2027/mobile/dorezimet.html)`;
}
async function run({github,context}) {
  const args={...context.repo,issue_number:context.issue.number};
  const {data:issue}=await github.rest.issues.get(args);
  if(issue.pull_request)return;
  if(context.eventName==='issue_comment') {
    const comment=context.payload.comment;
    if(comment.body.trim().toLowerCase()!=='rikontrollo' || comment.user.login.toLowerCase()!==issue.user.login.toLowerCase())return;
  }
  // Only trust our bot's report. Student comments cannot suppress a check.
  const comments=await github.paginate(github.rest.issues.listComments,{...args,per_page:100});
  const prior=comments.find(c=>c.user.login==='github-actions[bot]' && c.body.startsWith(MARKER));
  let result;
  try {const submission=parseSubmission(issue);if(!submission)return;result=await checkFiles(submission,github,prior?.body || '');if(result.unchanged)return;}
  catch(error) {
    if(error.status===404)result={error:'Repository nuk u gjet ose është privat. Kontrollo linkun dhe qasjen publike. Nëse ende nuk ke repository, ndiq udhëzimin poshtë.'};
    else if(error.status)result={error:'GitHub nuk mund ta përfundonte kontrollin tani. Provo më vonë me komentin rikontrollo. Ky gabim nuk është notë.'};
    else result={error:error.message};
  }
  const body=report(result);
  if(prior)await github.rest.issues.updateComment({...context.repo,comment_id:prior.id,body});
  else await github.rest.issues.createComment({...args,body});
}
module.exports={parseSubmission,checkFiles,report,run};
