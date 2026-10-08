import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const dirs=[path.join(ROOT,"frontend"),path.join(ROOT,"scripts")];
const pats=[/待核/g,/待核验/g,/候选/g,/人工复核/g,/manual_review/g,/candidate/g,/reviewed_basic/g,/priority_review/g,/source_ready/g,/待考/g,/待审/g];
for(const dir of dirs){
 const stack=[dir];
 while(stack.length){const p=stack.pop();for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())stack.push(f);else if(/\.(js|mjs|cjs|html|css)$/.test(e.name)){const s=fs.readFileSync(f,"utf8");const hits=[];for(const re of pats){const m=s.match(re);if(m)hits.push(re.source+":"+m.length)}if(hits.length)console.log(path.relative(ROOT,f),hits.join(","));}}}
}
