import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url)); const ROOT=path.resolve(HERE,"..");
const p=path.join(ROOT,"data","canonical","R02","places_candidate_enriched.jsonl");
const rows=fs.readFileSync(p,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const need=["Q334","Q1861","Q869","Q170462"].filter(q=>!rows.some(x=>x.wikidata_qid===q));
const UA="QiaomaiAcademicProject/1.0";
function vals(claims,p){return (claims?.[p]||[]).map(c=>c?.mainsnak?.datavalue?.value).filter(Boolean)}
if(need.length){
 const u="https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids="+need.join("|")+"&props=labels|aliases|descriptions|claims&languages=zh|zh-hant|en&languagefallback=1&origin=*";
 const r=await fetch(u,{headers:{"User-Agent":UA}}); if(!r.ok)throw new Error("HTTP "+r.status);
 const j=await r.json();
 for(const q of need){
   const e=j.entities[q]; const co=vals(e.claims,"P625")[0];
   const country=vals(e.claims,"P17").filter(x=>x?.id).map(x=>x.id);
   const parent=vals(e.claims,"P131").filter(x=>x?.id).map(x=>x.id);
   const image=vals(e.claims,"P18").find(x=>typeof x==="string")||null;
   rows.push({
    id:"place_wd_"+q,wikidata_qid:q,
    canonical_name:e?.labels?.zh?.value||e?.labels?.["zh-hant"]?.value||e?.labels?.en?.value||q,
    traditional_name:e?.labels?.["zh-hant"]?.value||null,english_name:e?.labels?.en?.value||null,
    aliases:[...(e?.aliases?.zh||[]),...(e?.aliases?.["zh-hant"]||[]),...(e?.aliases?.en||[])].map(x=>x.value).slice(0,30),
    description_zh:e?.descriptions?.zh?.value||null,
    roles:["historical_alias_authority"],person_ids:[],source_ids:["source_wd_"+q],
    coordinates:co?{lat:co.latitude,long:co.longitude,precision:co.precision}:null,
    country_qids:country,admin_parent_qids:parent,
    image_file_name:image,image_review_status:image?"candidate_requires_license_and_visual_cleanliness_check":"none",
    source_url:"https://www.wikidata.org/wiki/"+q,review_status:"candidate_authority",linked_person_count:0
   });
 }
 fs.writeFileSync(p,rows.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
}
console.log(JSON.stringify({added:need.length,total:rows.length,added_qids:need},null,2));
