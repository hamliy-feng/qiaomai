import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const base=fs.readFileSync(path.join(ROOT,"data","canonical","R02","organizations_merged.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const add=fs.readFileSync(path.join(ROOT,"data","collection","R02","malaysia_org_candidates.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const out=[...base], ids=new Set(base.map(x=>x.id));
for(const x of add){if(!ids.has(x.id)){out.push(x);ids.add(x.id)}}
const p=path.join(ROOT,"data","canonical","R02","organizations_merged_v2.jsonl");
fs.writeFileSync(p,out.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const summary={
 base:base.length,malaysia_added:add.length,total:out.length,
 reviewed:out.filter(x=>x.review_status==="reviewed").length,
 reviewed_basic:out.filter(x=>x.review_status==="reviewed_basic").length,
 candidate_normalized:out.filter(x=>x.review_status==="candidate_normalized").length,
 malaysia:out.filter(x=>x.country==="马来西亚").length,
 singapore:out.filter(x=>x.headquarters_place_id==="place_singapore"||x.country==="新加坡").length
};
fs.writeFileSync(path.join(ROOT,"data","canonical","R02","organizations_merged_v2_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));
