import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const D=path.join(ROOT,"data","collection","R02");
const rows=fs.readFileSync(path.join(D,"person_ancestral_replacements_raw.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const NAT=/^[\u3400-\u9FFF]{2,6}$/;
function year(s){const m=String(s||"").match(/([+-]?\d{3,4})-/);return m?Number(m[1]):9999}
const filtered=rows.filter(x=>NAT.test(x.canonical_name||"") && !/^Q\d+$/.test(x.canonical_name||""));
filtered.sort((a,b)=>{
 const ya=year(a.birth_date),yb=year(b.birth_date);
 const pa=(ya<=1950?0:ya<=1980?1:2),pb=(yb<=1950?0:yb<=1980?1:2);
 return pa-pb||ya-yb||(a.province_scope||"").localeCompare(b.province_scope||"")||(a.canonical_name||"").localeCompare(b.canonical_name||"");
});
const sel=filtered.slice(0,65);
const summary={raw:rows.length,natural_chinese:filtered.length,selected:sel.length,before_1950:sel.filter(x=>year(x.birth_date)<=1950).length,gd:sel.filter(x=>x.province_scope==="Guangdong").length,fj:sel.filter(x=>x.province_scope==="Fujian").length,samples:sel.slice(0,20).map(x=>({qid:x.qid,name:x.canonical_name,birth:x.birth_date,home:x.ancestral_home_label,citizenships:x.citizenships}))};
fs.writeFileSync(path.join(D,"person_ancestral_replacements_selected65.jsonl"),sel.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
fs.writeFileSync(path.join(D,"person_ancestral_replacements_selected65_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));