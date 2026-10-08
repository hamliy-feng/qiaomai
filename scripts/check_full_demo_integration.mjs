
import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const rows=fs.readFileSync(path.join(ROOT,"data","presentation","R02","persons_1000_basic_cards.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
for(const n of ["陈嘉庚","李光前","胡文虎","黄乃裳","容闳"]){const x=rows.find(v=>v.title===n);console.log(n,x?.qid||"NOT_FOUND",x?.id||"")}
const code=fs.readFileSync(path.join(ROOT,"frontend","assets","data.js"),"utf8");console.log("data_js_bytes",Buffer.byteLength(code));
const pageDir=path.join(ROOT,"frontend","assets","js","pages");const all=fs.readdirSync(pageDir).filter(f=>f.endsWith(".js")).map(f=>fs.readFileSync(path.join(pageDir,f),"utf8")).join("\n");
for(const old of ["pl-singapore","pl-jimei","pl-sanfrancisco","pl-us","o-xmu","q-001"])console.log(old,all.includes(old)?"FOUND":"OK");
