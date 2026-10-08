import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const OUT=path.join(ROOT,"data","collection","R02");
const terms=["侨批","qiaopi","yinxin overseas chinese","overseas chinese remittance letter","Chinese remittance letter","華僑 書信"];
const ua={"User-Agent":"QiaomaiAcademicProject/1.0 (coursework research)","Accept":"application/json"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(params){
 const u=new URL("https://commons.wikimedia.org/w/api.php");
 for(const [k,v] of Object.entries({action:"query",format:"json",origin:"*",...params}))u.searchParams.set(k,String(v));
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),15000);
 try{const r=await fetch(u,{headers:ua,signal:ac.signal});if(!r.ok)throw new Error("HTTP "+r.status);return await r.json()}finally{clearTimeout(timer)}
}
const titles=new Map();
for(const term of terms){
 try{
  const j=await api({list:"search",srnamespace:"6",srlimit:"100",srsearch:term});
  for(const x of j.query?.search||[])titles.set(x.title,{title:x.title,search_terms:[...(titles.get(x.title)?.search_terms||[]),term]});
 }catch(e){console.error("search failed",term,e.message)}
 await sleep(500);
}
const arr=[...titles.values()];
const out=[];
for(let i=0;i<arr.length;i+=25){
 const batch=arr.slice(i,i+25);
 try{
  const j=await api({prop:"imageinfo",titles:batch.map(x=>x.title).join("|"),iiprop:"url|size|mime|extmetadata"});
  for(const p of Object.values(j.query?.pages||{})){
   const ii=p.imageinfo?.[0]||{},m=ii.extmetadata||{},seed=titles.get(p.title)||{};
   const license=m.LicenseShortName?.value||m.License?.value||null;
   const usage=m.UsageTerms?.value||null;
   const desc=m.ImageDescription?.value||null;
   out.push({
    media_id:"commons_"+String(p.pageid||"").replace(/\D/g,""),
    title:p.title,source_page:"https://commons.wikimedia.org/wiki/"+encodeURIComponent(p.title.replaceAll(" ","_")),
    original_url:ii.url||null,width:ii.width||null,height:ii.height||null,mime:ii.mime||null,
    license,usage_terms:usage,artist:m.Artist?.value||null,credit:m.Credit?.value||null,description_html:desc,
    search_terms:seed.search_terms||[],rights_status:(license||usage)?"free_license_claim_present":"needs_license_review",
    watermark_status:"unknown",alteration_status:"unknown",crop_status:"unknown",media_state:"pending_manual_review",
    review_note:"仅完成Commons元数据收集。必须人工确认无水印、未裁切、未修图/生成式填充且确为单件完整侨批原件后，才可进入clean_original。"
   });
  }
 }catch(e){console.error("metadata batch failed",i,e.message)}
 await sleep(500);
}
out.sort((a,b)=>(b.width*b.height)-(a.width*a.height));
fs.writeFileSync(path.join(OUT,"qiaopi_commons_candidates.jsonl"),out.map(x=>JSON.stringify(x)).join("\n")+(out.length?"\n":""),"utf8");
fs.writeFileSync(path.join(OUT,"qiaopi_commons_candidates_summary.json"),JSON.stringify({search_terms:terms,unique_file_candidates:out.length,with_license:out.filter(x=>x.rights_status==="free_license_claim_present").length,manual_review_required:out.length,clean_original_promoted:0},null,2),"utf8");
console.log(JSON.stringify({unique_candidates:out.length,top:out.slice(0,12).map(x=>({title:x.title,size:[x.width,x.height],license:x.license}))},null,2));
