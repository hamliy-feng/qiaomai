import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const R=path.join(ROOT,"data","collection","R02");
const input=fs.readFileSync(path.join(R,"person_candidates_1000_scope_audited.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const checkpointPath=path.join(R,"person_wikidata_reference_checkpoint.json");
const outPath=path.join(R,"person_wikidata_claim_references.jsonl");
let checkpoint={done_qids:[]};
if(fs.existsSync(checkpointPath)) checkpoint=JSON.parse(fs.readFileSync(checkpointPath,"utf8"));
const done=new Set(checkpoint.done_qids||[]);
let rows=[];
if(fs.existsSync(outPath)) rows=fs.readFileSync(outPath,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const existing=new Set(rows.map(x=>x.qid));
for(const q of existing)done.add(q);
const props=new Set(["P19","P20","P27","P551","P69","P108","P463","P569","P570"]);
function sval(s){if(!s?.datavalue)return null;const v=s.datavalue.value;if(typeof v==="string")return v;if(v?.id)return v.id;if(v?.time)return v.time;return null}
function refValue(snaks){const urls=[],items=[],other=[];
 for(const [pid,list] of Object.entries(snaks||{})){
  for(const s of list||[]){const v=sval(s);if(v==null)continue;
   if(pid==="P854")urls.push(v); else if(pid==="P248")items.push(v); else if(["P813","P577","P123","P1476"].includes(pid))other.push({property:pid,value:v});
  }
 }
 return {urls:[...new Set(urls)],stated_in_qids:[...new Set(items)],other};
}
const pending=input.filter(x=>!done.has(x.qid));
for(let i=0;i<pending.length;i+=10){
 const batch=pending.slice(i,i+10),ids=batch.map(x=>x.qid).join("|");
 const url="https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids="+encodeURIComponent(ids);
 let js=null;
 for(let attempt=0;attempt<8;attempt++){
  try{
   const r=await fetch(url,{headers:{"User-Agent":"QiaomaiAcademicProject/1.0 (coursework research)","Accept":"application/json"}});
   if(r.status===429){const waitMs=Math.min(60000,8000*Math.pow(1.6,attempt));console.error("429 wait",Math.round(waitMs/1000),"sec");await new Promise(r=>setTimeout(r,waitMs));continue;}
   if(!r.ok)throw new Error("HTTP "+r.status);
   js=await r.json();break;
  }catch(e){if(attempt===7)throw e;await new Promise(r=>setTimeout(r,3000*(attempt+1)))}
 }
 if(!js) throw new Error("No response after retries");
 for(const p of batch){
  const ent=js.entities?.[p.qid]||{}, refs=[];
  for(const [pid,claims] of Object.entries(ent.claims||{})){
   if(!props.has(pid))continue;
   for(const claim of claims||[]){
    const value=sval(claim.mainsnak);
    for(const ref of claim.references||[]){
      const parsed=refValue(ref.snaks);
      if(parsed.urls.length||parsed.stated_in_qids.length||parsed.other.length) refs.push({property:pid,value,...parsed,hash:ref.hash||null});
    }
   }
  }
  const domains=[...new Set(refs.flatMap(r=>r.urls).map(u=>{try{return new URL(u).hostname.replace(/^www\./,"")}catch{return null}}).filter(Boolean))];
  const stated=[...new Set(refs.flatMap(r=>r.stated_in_qids))];
  rows.push({qid:p.qid,canonical_name:p.canonical_name,scope_status:p.scope_audit_status,wikipedia_zh:p.wikipedia_zh||null,wikipedia_en:p.wikipedia_en||null,reference_count:refs.length,reference_url_count:[...new Set(refs.flatMap(r=>r.urls))].length,reference_domains:domains,stated_in_qids:stated,references:refs,retrieved_at:new Date().toISOString()});
  done.add(p.qid);
 }
 fs.writeFileSync(outPath,rows.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
 fs.writeFileSync(checkpointPath,JSON.stringify({done_qids:[...done],total:input.length,updated_at:new Date().toISOString()},null,2),"utf8");
 console.log("done",done.size,"/",input.length);
 await new Promise(r=>setTimeout(r,1200));
}
const summary={count:rows.length,with_any_reference:rows.filter(x=>x.reference_count>0).length,with_reference_url:rows.filter(x=>x.reference_url_count>0).length,with_stated_in:rows.filter(x=>x.stated_in_qids?.length).length,with_wikipedia_zh:rows.filter(x=>x.wikipedia_zh).length,with_wikipedia_en:rows.filter(x=>x.wikipedia_en).length,with_2plus_ref_domains:rows.filter(x=>x.reference_domains?.length>=2).length,with_3plus_ref_domains:rows.filter(x=>x.reference_domains?.length>=3).length};
fs.writeFileSync(path.join(R,"person_wikidata_claim_references_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));
