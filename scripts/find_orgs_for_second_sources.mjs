import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const p=path.join(ROOT,"data","canonical","R02","organizations_merged_v3.jsonl");
const rows=fs.readFileSync(p,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
for(const term of ["岡州","宝树谢氏","潮安会馆","广东黄氏","福建杨氏","潮州沈氏"]){
 console.log("TERM",term);
 for(const x of rows.filter(x=>String(x.canonical_name||"").includes(term)))console.log(JSON.stringify({id:x.id,name:x.canonical_name,status:x.review_status,founded:x.founded_date,sources:x.source_ids,website:x.sfcca_directory?.website}));
}
