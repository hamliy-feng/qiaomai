import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const DIR=path.join(ROOT,"data","collection","R02");
const p=path.join(DIR,"person_candidates_1000_enriched.jsonl");
const rows=fs.readFileSync(p,"utf8").split(String.fromCharCode(10)).map(x=>x.replace(String.fromCharCode(13),"")).filter(Boolean).map(JSON.parse);
const ids=new Set();
for(const x of rows){
 for(const k of ["gender_qids","occupation_qids","citizenship_qids","father_qids","mother_qids","spouse_qids","child_qids"]){
  for(const q of x[k]||[])ids.add(q);
 }
}
console.log(JSON.stringify({persons:rows.length,unique_related_qids:ids.size},null,2));