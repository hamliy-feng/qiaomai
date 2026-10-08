import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const C=path.join(ROOT,"data","canonical","R02");
const rows=fs.readFileSync(path.join(C,"organizations_merged_v3.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const candidates=rows.filter(x=>x.review_status==="candidate_normalized"&&x.sfcca_directory?.website).slice(0,30);
const out=[];
function strip(s){return s.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/g," ").replace(/\s+/g," ").trim();}
function tokens(name){return String(name||"").replace(/新加坡|会馆|公会|总会|宗亲会|同乡会|聯誼會|联谊会|协会|協會|Singapore|Association|Guild|Huay Kuan/gi,"").split(/[（）()\s·-]+/).filter(x=>x.length>=2);}
for(const x of candidates){
 const url=x.sfcca_directory.website;
 try{
  const ctl=new AbortController(); const tm=setTimeout(()=>ctl.abort(),10000);
  const r=await fetch(url,{redirect:"follow",signal:ctl.signal,headers:{"User-Agent":"Mozilla/5.0 QiaomaiCoursework/1.0","Accept-Language":"zh-CN,zh;q=0.9,en;q=0.7"}});
  clearTimeout(tm);
  const body=(await r.text()).slice(0,250000); const txt=strip(body).slice(0,50000);
  const ts=tokens(x.canonical_name);
  const matched=ts.filter(t=>txt.includes(t));
  const title=(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.replace(/<[^>]+>/g," ").trim()||null;
  out.push({id:x.id,name:x.canonical_name,url,status:r.status,final_url:r.url,title,matched_tokens:matched,verified:r.ok&&matched.length>0,text_sample:txt.slice(0,500)});
 }catch(e){out.push({id:x.id,name:x.canonical_name,url,status:null,verified:false,error:e.name+":"+e.message});}
 await new Promise(r=>setTimeout(r,400));
}
fs.writeFileSync(path.join(ROOT,"data","collection","R02","organization_official_site_checks.jsonl"),out.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
console.log(JSON.stringify({checked:out.length,verified:out.filter(x=>x.verified).length,verified_items:out.filter(x=>x.verified).map(x=>({id:x.id,name:x.name,url:x.final_url,title:x.title,matched:x.matched_tokens}))},null,2));
