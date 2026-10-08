import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const DIR=path.join(ROOT,"data","canonical","R02");
const p=path.join(DIR,"places_candidate.jsonl");
const rows=fs.readFileSync(p,"utf8").split(String.fromCharCode(10)).map(x=>x.replace(String.fromCharCode(13),"")).filter(Boolean).map(JSON.parse);
const byQ=new Map(rows.map(x=>[x.wikidata_qid,x]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function qids(claims,p,limit=10){
 const out=[];for(const c of claims?.[p]||[]){const v=c?.mainsnak?.datavalue?.value;if(v&&typeof v==="object"&&v.id)out.push(v.id);if(out.length>=limit)break;}return [...new Set(out)];
}
function coord(claims){
 for(const c of claims?.P625||[]){const v=c?.mainsnak?.datavalue?.value;if(v&&typeof v.latitude==="number")return {lat:v.latitude,long:v.longitude,precision:v.precision??null};}return null;
}
function strClaim(claims,p){for(const c of claims?.[p]||[]){const v=c?.mainsnak?.datavalue?.value;if(typeof v==="string")return v;}return null;}
for(let i=0;i<rows.length;i+=40){
 const batch=rows.slice(i,i+40);
 const url="https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids="+encodeURIComponent(batch.map(x=>x.wikidata_qid).join("|"))+"&props=labels|aliases|descriptions|claims&languages=zh|zh-hant|zh-cn|en&languagefallback=1&origin=*";
 let j=null;
 for(let k=0;k<5;k++){
  const r=await fetch(url,{headers:{"User-Agent":"QiaomaiAcademicProject/1.0 (non-commercial coursework)","Accept":"application/json"}});
  if(r.status===429){await sleep(5000*(k+1));continue;}
  if(!r.ok){await sleep(2000*(k+1));continue;}
  j=await r.json();break;
 }
 if(!j)throw new Error("failed batch "+i);
 for(const x of batch){
  const e=j.entities?.[x.wikidata_qid]||{};
  x.canonical_name=e.labels?.["zh-cn"]?.value||e.labels?.zh?.value||x.canonical_name;
  x.traditional_name=e.labels?.["zh-hant"]?.value||null;
  x.english_name=e.labels?.en?.value||null;
  x.aliases=[...new Set([...(e.aliases?.zh||[]).map(a=>a.value),...(e.aliases?.["zh-hant"]||[]).map(a=>a.value),...(e.aliases?.en||[]).map(a=>a.value)])].slice(0,20);
  x.description_zh=e.descriptions?.zh?.value||e.descriptions?.["zh-cn"]?.value||null;
  x.coordinates=coord(e.claims);
  x.country_qids=qids(e.claims,"P17",3);
  x.admin_parent_qids=qids(e.claims,"P131",5);
  x.image_file_name=strClaim(e.claims,"P18");
  x.image_review_status=x.image_file_name?"candidate_requires_license_and_visual_cleanliness_check":"none";
  x.source_url="https://www.wikidata.org/wiki/"+x.wikidata_qid;
 }
 console.log("places",Math.min(i+40,rows.length),"/",rows.length);
 await sleep(1200);
}
fs.writeFileSync(path.join(DIR,"places_candidate_enriched.jsonl"),rows.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const summary={count:rows.length,with_coordinates:rows.filter(x=>x.coordinates).length,with_country:rows.filter(x=>x.country_qids?.length).length,with_admin_parent:rows.filter(x=>x.admin_parent_qids?.length).length,with_aliases:rows.filter(x=>x.aliases?.length).length,with_image_candidate:rows.filter(x=>x.image_file_name).length};
fs.writeFileSync(path.join(DIR,"places_candidate_enriched_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));
