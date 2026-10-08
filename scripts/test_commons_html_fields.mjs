
import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");const cp=JSON.parse(fs.readFileSync(path.join(ROOT,"data","media_acquisition","WIKIMEDIA_P18_CHECKPOINT.json"),"utf8"));const file=Object.values(cp.qid_to_file)[0];
const s=await (await fetch("https://commons.wikimedia.org/wiki/File:"+encodeURIComponent(file.replaceAll(" ","_")),{headers:{"User-Agent":"QiaomaiMediaResearch/1.0"}})).text();
for(const key of ["fileinfotpl_aut","Author</td>","licensetpl","Permission","Source</td>"]){const i=s.indexOf(key);console.log("\\nKEY",key,i,i>=0?s.slice(Math.max(0,i-400),i+1800):"")}
