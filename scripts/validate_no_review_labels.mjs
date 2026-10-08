import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const targets=["frontend/assets/data.js","frontend/assets/js/core.js","frontend/assets/js/family-tree.js","frontend/assets/js/pages/archive.js","frontend/assets/js/pages/person.js","frontend/assets/js/pages/qiaopi.js","frontend/assets/js/legacy-app.js"];
const bad=[];for(const f of targets){const s=fs.readFileSync(path.join(ROOT,f),"utf8");for(const term of ["待核","待核验","待考","候选","人工复核","manual_review","priority_review_ready","basic_source_ready","scope_manual_review"]){if(s.includes(term))bad.push({file:f,term,count:s.split(term).length-1})}}
console.log(JSON.stringify({bad,pass:bad.length===0},null,2));if(bad.length)process.exitCode=1;