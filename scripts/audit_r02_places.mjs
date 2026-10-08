import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));const ROOT=path.resolve(HERE,"..");
const input=path.join(ROOT,"data","canonical","R02","places_candidate_enriched.jsonl");
const rows=fs.readFileSync(input,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const out=rows.map(x=>{
 const hasCoord=Number.isFinite(x?.coordinates?.lat)&&Number.isFinite(x?.coordinates?.long);
 const hasCountry=(x.country_qids||[]).length>0;
 const hasSource=!!x.source_url||(x.source_ids||[]).length>0;
 const hasName=!!x.canonical_name&&!/^Q\d+$/.test(x.canonical_name);
 const hasAdmin=(x.admin_parent_qids||[]).length>0;
 const hasAlias=(x.aliases||[]).length>0;
 let quality;
 if(hasCoord&&hasCountry&&hasSource&&hasName)quality="map_ready";
 else if(hasCountry&&hasSource&&hasName)quality="text_ready_no_coordinates";
 else quality="needs_authority_review";
 const score=(hasCoord?3:0)+(hasCountry?2:0)+(hasAdmin?1:0)+(hasAlias?1:0)+(hasSource?1:0)+Math.min(3,Math.log2((x.linked_person_count||0)+1));
 return {...x,place_quality_status:quality,place_quality_score:Number(score.toFixed(2)),map_publishable:quality==="map_ready",media_publishable:false};
}).sort((a,b)=>b.place_quality_score-a.place_quality_score);
fs.writeFileSync(path.join(ROOT,"data","canonical","R02","places_quality_audited.jsonl"),out.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const summary={
 count:out.length,
 map_ready:out.filter(x=>x.place_quality_status==="map_ready").length,
 text_ready_no_coordinates:out.filter(x=>x.place_quality_status==="text_ready_no_coordinates").length,
 needs_authority_review:out.filter(x=>x.place_quality_status==="needs_authority_review").length,
 with_aliases:out.filter(x=>(x.aliases||[]).length).length,
 historical_alias_authorities:out.filter(x=>(x.roles||[]).includes("historical_alias_authority")).length,
 top20:out.slice(0,20).map(x=>({id:x.id,name:x.canonical_name,linked_person_count:x.linked_person_count||0,status:x.place_quality_status,score:x.place_quality_score}))
};
fs.writeFileSync(path.join(ROOT,"data","canonical","R02","places_quality_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));
