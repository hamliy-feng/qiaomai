
import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const cp=JSON.parse(fs.readFileSync(path.join(ROOT,"data","media_acquisition","WIKIMEDIA_P18_CHECKPOINT.json"),"utf8"));
const file=Object.values(cp.qid_to_file)[0];console.log("FILE",file);
const url="https://commons.wikimedia.org/wiki/File:"+encodeURIComponent(file.replaceAll(" ","_"));
const r=await fetch(url,{headers:{"User-Agent":"QiaomaiMediaResearch/1.0"}});console.log("status",r.status);const s=await r.text();console.log("len",s.length);
for(const key of ["licensetpl_short","license","cc-by","public domain","mw-filepage-other-resolutions","fullMedia"]){const i=s.toLowerCase().indexOf(key.toLowerCase());console.log("\\nKEY",key,i,i>=0?s.slice(Math.max(0,i-500),i+1500):"")}
