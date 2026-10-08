
import fs from "fs";import vm from "vm";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const code=fs.readFileSync(path.join(ROOT,"frontend","assets","data.js"),"utf8");
const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(code,sandbox);
const db=sandbox.window.QM_DEMO,cfg=sandbox.window.QM_CONFIG;
const errors=[],warnings=[];
if(!db)errors.push("QM_DEMO missing");
const keys=["persons","families","places","orgs","events","documents","qiaopi"];
for(const k of keys)if(!Array.isArray(db[k]))errors.push(k+" not array");
const map={person:new Map(db.persons.map(x=>[x.id,x])),family:new Map(db.families.map(x=>[x.id,x])),place:new Map(db.places.map(x=>[x.id,x])),org:new Map(db.orgs.map(x=>[x.id,x])),event:new Map(db.events.map(x=>[x.id,x])),document:new Map(db.documents.map(x=>[x.id,x])),qiaopi:new Map(db.qiaopi.map(x=>[x.id,x]))};
for(const [t,m] of Object.entries(map)){if(m.size!==db[t==="person"?"persons":t==="family"?"families":t==="place"?"places":t==="org"?"orgs":t==="event"?"events":t==="document"?"documents":"qiaopi"].length)errors.push("duplicate "+t+" id")}
const refs=[
 ["persons","familyIds","family"],["persons","placeIds","place"],["persons","orgIds","org"],["persons","eventIds","event"],["persons","documentIds","document"],["persons","qiaopiIds","qiaopi"],
 ["families","memberIds","person"],["families","placeIds","place"],["families","documentIds","document"],
 ["places","personIds","person"],["places","orgIds","org"],["places","eventIds","event"],["places","documentIds","document"],
 ["orgs","personIds","person"],["orgs","placeIds","place"],["orgs","eventIds","event"],["orgs","documentIds","document"],
 ["events","personIds","person"],["events","placeIds","place"],["events","orgIds","org"],["events","documentIds","document"],
 ["documents","personIds","person"],["documents","placeIds","place"],["documents","eventIds","event"],["documents","orgIds","org"],["documents","qiaopiIds","qiaopi"],
 ["qiaopi","personIds","person"],["qiaopi","placeIds","place"],["qiaopi","eventIds","event"],["qiaopi","documentIds","document"]
];
for(const [collection,field,target] of refs){for(const x of db[collection])for(const id of x[field]||[])if(!map[target].has(id))errors.push(collection+":"+x.id+" "+field+" dangling "+id)}
for(const p of db.persons){if(!p.title)errors.push("person title missing "+p.id)}
for(const p of db.places){if(p.coordinates&&(!Array.isArray(p.coordinates)||p.coordinates.length!==2||!p.coordinates.every(Number.isFinite)))errors.push("bad coordinates "+p.id)}
for(const q of db.qiaopi){for(const pg of q.pages||[]){if(!(pg.watermark_status==="none"&&pg.alteration_status==="none"&&pg.crop_status==="full_page"&&pg.rights_status==="allowed"&&pg.media_state==="clean_original"))errors.push("unsafe qiaopi page "+q.id)}}
if((db.meta?.qiaopiCleanOriginal||0)!==(db.qiaopi.flatMap(q=>q.pages||[]).length))warnings.push("qiaopi clean-original count differs from page count");
const banned=/待核|待核验|人工复核|待考|关系状态：/;const exposed=JSON.stringify(db);if(banned.test(exposed))errors.push("frontend database still contains visible review-state wording");for(const group of keys.map(k=>db[k]))for(const x of group){for(const f of ["reviewStatus","qualityStatus","publicationStatus","scopeAuditStatus","frontendReadiness","sourceReadiness","readiness"])if(Object.prototype.hasOwnProperty.call(x,f))errors.push("frontend record exposes audit field "+f+" on "+x.id)}const report={generated_at:new Date().toISOString(),config:cfg,counts:Object.fromEntries(keys.map(k=>[k,db[k].length])),errors,warnings,validation_passed:errors.length===0};
const out=path.join(ROOT,"data","frontend_demo","VALIDATION.json");fs.writeFileSync(out,JSON.stringify(report,null,2),"utf8");console.log(JSON.stringify(report,null,2));
