import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const R=path.join(ROOT,"data","collection","R02");
const P=path.join(ROOT,"data","presentation","R02");
fs.mkdirSync(P,{recursive:true});
const read=p=>fs.readFileSync(p,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const rows=read(path.join(R,"person_candidates_1000_scope_audited.jsonl"));
function score(x){
 let s=(x.diaspora_signal_score||0)*10;
 if(x.scope_audit_status==="keep_high")s+=100;
 if(x.historical_priority)s+=30;
 if(x.wikipedia_zh)s+=20;
 if(x.wikipedia_en)s+=8;
 if(x.image_file_name)s+=5;
 if(x.birth_date)s+=3;
 if((x.ancestral_home_qids||[]).length)s+=10;
 return s;
}
const selected=[...rows]
 .filter(x=>x.scope_audit_status==="keep_high" && x.wikipedia_zh)
 .sort((a,b)=>score(b)-score(a) || String(a.canonical_name).localeCompare(String(b.canonical_name),"zh"))
 .slice(0,100);
fs.writeFileSync(path.join(R,"person_priority_top100.jsonl"),selected.map(x=>JSON.stringify({...x,priority_score:score(x)})).join("\n")+"\n","utf8");
fs.writeFileSync(path.join(R,"person_priority_top100_summary.json"),JSON.stringify({
 count:selected.length,
 Guangdong:selected.filter(x=>x.province_scope==="Guangdong").length,
 Fujian:selected.filter(x=>x.province_scope==="Fujian").length,
 with_image:selected.filter(x=>x.image_file_name).length,
 with_ancestral:selected.filter(x=>(x.ancestral_home_qids||[]).length).length,
 min_score:Math.min(...selected.map(score)),
 max_score:Math.max(...selected.map(score))
},null,2),"utf8");
console.log(JSON.stringify({count:selected.length,top:selected.slice(0,10).map(x=>({qid:x.qid,name:x.canonical_name,score:score(x)}))},null,2));
