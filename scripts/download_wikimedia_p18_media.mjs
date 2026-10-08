
import fs from "fs";
import path from "path";
import crypto from "crypto";
import vm from "vm";
import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const DATA=path.join(ROOT,"data"),ACQ=path.join(DATA,"media_acquisition"),OUT=path.join(DATA,"media"),WEB=path.join(ROOT,"frontend","assets","media","entities");
fs.mkdirSync(OUT,{recursive:true});fs.mkdirSync(WEB,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const jl=p=>fs.existsSync(p)?fs.readFileSync(p,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse):[];
const html=s=>String(s||"").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
const safe=s=>String(s).replace(/[<>:"/\\|?*\x00-\x1F]/g,"_").slice(0,150);
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");

const box={window:{}};vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(ROOT,"frontend","assets","data.js"),"utf8"),box);const db=box.window.QM_DEMO;
const cp=JSON.parse(fs.readFileSync(path.join(ACQ,"WIKIMEDIA_P18_CHECKPOINT.json"),"utf8"));
const qidToFile=cp.qid_to_file||{};
const entities=[];
for(const p of db.persons){const qid=p.qid||(/^person_wd_(Q\d+)$/.exec(p.id)?.[1]);if(qid&&qidToFile[qid])entities.push({entity_type:"person",entity_id:p.id,title:p.title,qid,file_name:qidToFile[qid]})}
for(const p of db.places){const qid=/^place_wd_(Q\d+)$/.exec(p.id)?.[1];if(qid&&qidToFile[qid])entities.push({entity_type:"place",entity_id:p.id,title:p.title,qid,file_name:qidToFile[qid]})}
console.log("entities_with_p18",entities.length);

async function getJson(url){
 for(let a=0;a<7;a++){
  try{const r=await fetch(url,{headers:{"User-Agent":"QiaomaiMediaResearch/1.0","Accept":"application/json"}});
   if(r.status===429||r.status===503){const ms=Math.min(45000,3000*Math.pow(1.6,a));console.error("api backoff",r.status,Math.round(ms/1000));await sleep(ms);continue}
   if(!r.ok)throw new Error("HTTP "+r.status);return await r.json();
  }catch(e){if(a===6)throw e;await sleep(1800*(a+1))}
 }
}
const uniqueFiles=[...new Set(entities.map(x=>x.file_name))];
const metaPath=path.join(ACQ,"WIKIMEDIA_FILE_METADATA.jsonl");
const old=jl(metaPath),metaMap=new Map(old.map(x=>[x.file_name,x]));
const need=uniqueFiles.filter(x=>!metaMap.has(x));
for(let i=0;i<need.length;i+=8){
 const batch=need.slice(i,i+8),titles=batch.map(f=>"File:"+f).join("|");
 const url="https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|mime|extmetadata&titles="+encodeURIComponent(titles)+"&origin=*";
 const j=await getJson(url);
 for(const page of Object.values(j.query?.pages||{})){
  const ii=page.imageinfo?.[0];if(!ii)continue;const file=String(page.title).replace(/^File:/,"");
  metaMap.set(file,{file_name:file,page_title:page.title,original_url:ii.url,description_url:ii.descriptionurl,width:ii.width,height:ii.height,size_bytes:ii.size,mime:ii.mime,extmetadata:ii.extmetadata||{}});
 }
 if((i/8)%5===0){fs.writeFileSync(metaPath,[...metaMap.values()].map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");console.log("metadata",Math.min(i+8,need.length),"/",need.length,"total",metaMap.size)}
 await sleep(850);
}
fs.writeFileSync(metaPath,[...metaMap.values()].map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");

function free(meta){const lic=html(meta?.extmetadata?.LicenseShortName?.value||meta?.extmetadata?.UsageTerms?.value||"").toLowerCase();return /public domain|cc0|cc by|cc-by|creative commons attribution|gfdl/.test(lic)}
function ext(ct,url){const t=(ct||"").toLowerCase();if(t.includes("jpeg"))return".jpg";if(t.includes("png"))return".png";if(t.includes("webp"))return".webp";if(t.includes("gif"))return".gif";if(t.includes("svg"))return".svg";try{return path.extname(new URL(url).pathname)||".img"}catch{return".img"}}
async function dl(url,base){
 for(let a=0;a<6;a++){
  try{const r=await fetch(url,{headers:{"User-Agent":"QiaomaiMediaResearch/1.0"}});
   if(r.status===429||r.status===503){await sleep(Math.min(30000,2500*Math.pow(1.6,a)));continue}
   if(!r.ok)throw new Error("HTTP "+r.status);const b=Buffer.from(await r.arrayBuffer());const dest=base+ext(r.headers.get("content-type"),r.url||url);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,b);return{dest,bytes:b.length,sha256:sha(b),mime:r.headers.get("content-type")||null,final_url:r.url||url};
  }catch(e){if(a===5)throw e;await sleep(1200*(a+1))}
 }
}

const manifestPath=path.join(OUT,"media_manifest.jsonl");let manifest=jl(manifestPath);
const have=new Set(manifest.map(x=>x.entity_type+"|"+x.entity_id+"|"+x.role));
let ok=0,nonfree=0,fail=0,missingMeta=0;
for(let i=0;i<entities.length;i++){
 const e=entities[i],key=e.entity_type+"|"+e.entity_id+"|primary";if(have.has(key))continue;
 const m=metaMap.get(e.file_name);if(!m){missingMeta++;continue}if(!free(m)){nonfree++;continue}
 const enc=encodeURIComponent(e.file_name);
 const masterUrl="https://commons.wikimedia.org/wiki/Special:Redirect/file/"+enc+"?width="+(e.entity_type==="person"?1000:1440);
 const thumbUrl="https://commons.wikimedia.org/wiki/Special:Redirect/file/"+enc+"?width="+(e.entity_type==="person"?360:400);
 const dir=path.join(WEB,e.entity_type,safe(e.entity_id));
 try{
  const a=await dl(masterUrl,path.join(dir,"primary"));
  const b=await dl(thumbUrl,path.join(dir,"thumb"));
  const md=m.extmetadata||{},lic=html(md.LicenseShortName?.value||md.UsageTerms?.value||""),artist=html(md.Artist?.value||md.Credit?.value||""),licUrl=md.LicenseUrl?.value||null,desc=html(md.ImageDescription?.value||"");
  const rel=f=>path.relative(path.join(ROOT,"frontend"),f).replaceAll("\\","/");
  const row={image_id:"img_"+crypto.createHash("sha1").update(key+"|"+e.file_name).digest("hex").slice(0,16),entity_type:e.entity_type,entity_id:e.entity_id,role:"primary",is_primary:true,title:e.file_name,caption:desc||e.title,source_institution:"Wikimedia Commons",source_page_url:m.description_url,original_url:m.original_url,author:artist,license:lic,license_url:licUrl,rights_basis:/public domain/i.test(lic)?"public_domain":/cc0/i.test(lic)?"cc0":/by-sa/i.test(lic)?"cc_by_sa":/cc by|cc-by|attribution/i.test(lic)?"cc_by":"free_license",original_width:m.width,original_height:m.height,original_size_bytes:m.size_bytes,mime_type:m.mime,local_display:rel(a.dest),display_bytes:a.bytes,display_sha256:a.sha256,local_thumb:rel(b.dest),thumb_bytes:b.bytes,thumb_sha256:b.sha256,wikidata_qid:e.qid,media_basis:"wikidata_p18_commons",retrieved_at:new Date().toISOString()};
  manifest.push(row);have.add(key);ok++;
  if(ok%20===0){fs.writeFileSync(manifestPath,manifest.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");console.log("download",ok,"at",i+1,"/",entities.length)}
  await sleep(120);
 }catch(err){fail++;console.error("FAIL",e.entity_id,e.file_name,err.message)}
}
fs.writeFileSync(manifestPath,manifest.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const summary={generated_at:new Date().toISOString(),p18_entities:entities.length,metadata_files:metaMap.size,manifest_total:manifest.length,new_downloaded:ok,nonfree_skipped:nonfree,missing_metadata:missingMeta,failed:fail,by_type:{person:manifest.filter(x=>x.entity_type==="person"&&x.role==="primary").length,place:manifest.filter(x=>x.entity_type==="place"&&x.role==="primary").length}};
fs.writeFileSync(path.join(ACQ,"WIKIMEDIA_DOWNLOAD_SUMMARY.json"),JSON.stringify(summary,null,2),"utf8");console.log(JSON.stringify(summary,null,2));
