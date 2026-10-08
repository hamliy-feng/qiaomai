import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const rows=fs.readFileSync(path.join(ROOT,"data","canonical","R02","organizations_merged_v3.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
for(const term of ["福州","惠安","莆田","武吉班让客属","宝树谢氏"]){
 console.log("TERM",term);
 for(const x of rows.filter(x=>String(x.canonical_name||"").includes(term)))console.log(JSON.stringify({id:x.id,name:x.canonical_name,status:x.review_status,founded:x.founded_date,sources:x.source_ids,dir:x.sfcca_directory?.website}));
}
