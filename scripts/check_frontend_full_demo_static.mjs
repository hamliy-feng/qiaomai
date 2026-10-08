
import fs from "fs";import path from "path";import vm from "vm";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const files=["frontend/assets/data.js","frontend/assets/js/core.js","frontend/assets/js/image-viewer.js","frontend/assets/js/pages/home.js","frontend/assets/js/pages/place.js","frontend/assets/js/pages/org.js","frontend/assets/js/pages/research.js","frontend/assets/js/pages/qiaopi.js"];
const parse=[];
for(const f of files){const c=fs.readFileSync(path.join(ROOT,f),"utf8");try{new Function(c);parse.push({file:f,ok:true})}catch(e){parse.push({file:f,ok:false,error:e.message})}}
const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(ROOT,"frontend/assets/data.js"),"utf8"),sandbox);
const db=sandbox.window.QM_DEMO;
const names=["陈嘉庚","李光前","胡文虎","黄乃裳","容闳"];
const samples=names.map(n=>{const p=db.persons.find(x=>x.title===n);return{name:n,id:p?.id,reviewStatus:p?.reviewStatus,sourceReadiness:p?.sourceReadiness,events:p?.eventIds?.length||0,places:p?.placeIds?.length||0,sources:p?.sourceLinks?.length||0}});
const report={parse,samples,data_js_bytes:fs.statSync(path.join(ROOT,"frontend/assets/data.js")).size,old_q001_in_qiaopi_page:fs.readFileSync(path.join(ROOT,"frontend/assets/js/pages/qiaopi.js"),"utf8").includes("q-001"),pass:parse.every(x=>x.ok)&&samples.every(x=>x.id)&&!fs.readFileSync(path.join(ROOT,"frontend/assets/js/pages/qiaopi.js"),"utf8").includes("q-001")};
fs.writeFileSync(path.join(ROOT,"data","frontend_demo","STATIC_INTEGRATION_CHECK.json"),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
