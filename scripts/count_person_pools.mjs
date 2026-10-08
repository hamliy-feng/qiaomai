import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
for(const f of ["person_candidates_all.jsonl","person_candidates_1000.jsonl","person_candidates_1000_enriched.jsonl"]){
 const p=path.join(ROOT,"data","collection","R02",f);
 const n=fs.readFileSync(p,"utf8").split(/\r?\n/).filter(Boolean).length;
 console.log(f,n);
}
