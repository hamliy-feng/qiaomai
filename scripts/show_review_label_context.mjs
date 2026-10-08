import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const files=["frontend/assets/js/core.js","frontend/assets/js/family-tree.js","frontend/assets/js/pages/archive.js","frontend/assets/js/pages/person.js","frontend/assets/js/pages/qiaopi.js","frontend/assets/js/legacy-app.js","scripts/build_frontend_full_demo_database.mjs"];
for(const f of files){const s=fs.readFileSync(path.join(ROOT,f),"utf8").split(/\r?\n/);console.log("\n###",f);s.forEach((line,i)=>{if(/待核|待考|候选|人工复核|manual_review|candidate|reviewed_basic|priority_review|source_ready/.test(line))console.log((i+1)+": "+line)})}
