
const {chromium}=require('playwright');
const path=require('node:path');const {pathToFileURL}=require('node:url');const fs=require('node:fs');
const ROOT=path.resolve(__dirname,'..'),front=path.join(ROOT,'frontend'),out=path.join(ROOT,'data','frontend_demo','BROWSER_SMOKE.json');
const routes=['index','person','family','place','event','org','archive','qiaopi','research','search'];
(async()=>{const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});
 const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 for(const r of routes){const before=errors.length;const url=pathToFileURL(path.join(front,r+'.html')).href;const t=Date.now();await page.goto(url);await page.waitForFunction(()=>document.body.dataset.ready==='true',{timeout:20000});const state=await page.evaluate(()=>({errorCards:document.querySelectorAll('.error-card').length,appText:document.querySelector('#app')?.innerText?.slice(0,300)||'',stats:window.QM_REPO?null:null}));results.push({route:r,load_ms:Date.now()-t,errorCards:state.errorCards,newErrors:errors.slice(before),pass:state.errorCards===0&&errors.length===before})}
 await page.goto(pathToFileURL(path.join(front,'person.html')).href);await page.waitForFunction(()=>document.body.dataset.ready==='true');await page.locator('[data-list-search]').fill('丘成桐');const personHits=await page.locator('[data-record-id]').count();if(personHits)await page.locator('[data-record-id]').first().click();const personTitle=personHits?await page.locator('.person-dossier h2').innerText():null;
 await page.goto(pathToFileURL(path.join(front,'qiaopi.html')).href);await page.waitForFunction(()=>document.body.dataset.ready==='true');await page.locator('[data-record-id]').first().click();const qimg=await page.locator('.viewer img').count();const qtext=await page.locator('.viewer').innerText();
 await page.goto(pathToFileURL(path.join(front,'index.html')).href);await page.waitForFunction(()=>document.body.dataset.ready==='true');const stats=await page.evaluate(()=>QM_REPO.stats());
 const report={generated_at:new Date().toISOString(),routes:results,errors,stats,interaction:{personHits,personTitle,qiaopiViewerImageCount:qimg,qiaopiViewerText:qtext.slice(0,120)},pass:results.every(x=>x.pass)&&personHits>0&&personTitle?.includes('丘成桐')&&qimg===0&&/暂无可公开原件/.test(qtext)};
 fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();if(!report.pass)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
