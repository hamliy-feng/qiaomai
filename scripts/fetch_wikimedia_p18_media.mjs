
import fs from "fs";
import path from "path";
import crypto from "crypto";
import vm from "vm";
import {fileURLToPath} from "url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const DATA=path.join(ROOT,"data");
const OUT=path.join(DATA,"media");
const ACQ=path.join(DATA,"media_acquisition");
const WEB=path.join(ROOT,"frontend","assets","media","entities");
fs.mkdirSync(OUT,{recursive:true});fs.mkdirSync(WEB,{recursive:true});

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cleanHtml=s=>String(s||"").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
const safe=s=>String(s).replace(/[<>:"/\\|?*\x00-\x1F]/g,"_").slice(0,160);
const hashBuf=b=>crypto.createHash("sha256").update(b).digest("hex");
const readJL=p=>fs.existsSync(p)?fs.readFileSync(p,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse):[];

const box={window:{}};vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(ROOT,"frontend","assets","data.js"),"utf8"),box);
const db=box.window.QM_DEMO;
const tasks=readJL(path.join(ACQ,"IMAGE_QUEUE.jsonl"));
const taskByEntity=new Map(tasks.map(x=>[x.entity_id,x]));

const entities=[];
for(const p of db.persons){
 const qid=p.qid||(/^person_wd_(Q\d+)$/.exec(p.id)?.[1]);
 if(qid)entities.push({entity_type:"person",entity_id:p.id,title:p.title,qid,targetWidth:1000,thumbWidth:360});
}
for(const p of db.places){
 const qid=/^place_wd_(Q\d+)$/.exec(p.id)?.[1];
 if(qid)entities.push({entity_type:"place",entity_id:p.id,title:p.title,qid,targetWidth:1440,thumbWidth:400});
}
console.log("entities_with_qid",entities.length);

const checkpointPath=path.join(ACQ,"WIKIMEDIA_P18_CHECKPOINT.json");
let checkpoint={qid_to_file:{},done_qids:[],updated_at:null};
if(fs.existsSync(checkpointPath)){try{checkpoint=JSON.parse(fs.readFileSync(checkpointPath,"utf8"))}catch{}}
const doneQ=new Set(checkpoint.done_qids||[]);
const qidToFile=checkpoint.qid_to_file||{};

async function fetchJson(url,attempts=8){
 for(let a=0;a<attempts;a++){
  try{
   const r=await fetch(url,{headers:{"User-Agent":"QiaomaiMediaResearch/1.0 (academic demo; sourced Wikimedia media)","Accept":"application/json"}});
   if(r.status===429||r.status===503){const ms=Math.min(60000,2500*Math.pow(1.7,a));console.error("backoff",r.status,Math.round(ms/1000));await sleep(ms);continue}
   if(!r.ok)throw new Error("HTTP "+r.status);
   return await r.json();
  }catch(e){if(a===attempts-1)throw e;await sleep(Math.min(30000,1500*(a+1)))}
 }
}

const qids=[...new Set(entities.map(x=>x.qid))];
for(let i=0;i<qids.length;i+=50){
 const batch=qids.slice(i,i+50).filter(q=>!doneQ.has(q));
 if(!batch.length)continue;
 const url="https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids="+batch.join("|")+"&origin=*";
 const j=await fetchJson(url);
 for(const q of batch){
  const e=j.entities?.[q];
  const file=e?.claims?.P18?.[0]?.mainsnak?.datavalue?.value||null;
  if(file)qidToFile[q]=file;
  doneQ.add(q);
 }
 checkpoint={qid_to_file:qidToFile,done_qids:[...doneQ],updated_at:new Date().toISOString()};
 fs.writeFileSync(checkpointPath,JSON.stringify(checkpoint,null,2),"utf8");
 console.log("P18",doneQ.size,"/",qids.length,"files",Object.keys(qidToFile).length);
 await sleep(450);
}

const fileEntities=new Map();
for(const e of entities){
 const f=qidToFile[e.qid];if(!f)continue;
 if(!fileEntities.has(f))fileEntities.set(f,[]);
 fileEntities.get(f).push(e);
}
const fileNames=[...fileEntities.keys()];
console.log("unique_p18_files",fileNames.length);

const metaPath=path.join(ACQ,"WIKIMEDIA_P18_METADATA.jsonl");
const oldMeta=readJL(metaPath);
const metaByFile=new Map(oldMeta.map(x=>[x.file_name,x]));

async function queryImageInfo(names,width){
 const out=[];
 for(let i=0;i<names.length;i+=20){
  const batch=names.slice(i,i+20);
  const titles=batch.map(f=>"File:"+f).join("|");
  const url="https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth="+width+"&titles="+encodeURIComponent(titles)+"&origin=*";
  const j=await fetchJson(url);
  for(const page of Object.values(j.query?.pages||{})){
   const ii=page.imageinfo?.[0];if(!ii)continue;
   const file=String(page.title||"").replace(/^File:/,"");
   out.push({file_name:file,page_title:page.title,original_url:ii.url,description_url:ii.descriptionurl,width:ii.width,height:ii.height,size_bytes:ii.size,mime:ii.mime,thumb_url:ii.thumburl||ii.url,thumb_width:ii.thumbwidth||ii.width,thumb_height:ii.thumbheight||ii.height,extmetadata:ii.extmetadata||{}});
  }
  await sleep(350);
 }
 return out;
}

const needMeta=fileNames.filter(f=>!metaByFile.has(f));
if(needMeta.length){
 const infos=await queryImageInfo(needMeta,1440);
 for(const x of infos)metaByFile.set(x.file_name,x);
 fs.writeFileSync(metaPath,[...metaByFile.values()].map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
 console.log("metadata",metaByFile.size);
}

// Query small thumbnail URLs separately.
const smallMap=new Map();
for(let i=0;i<fileNames.length;i+=20){
 const batch=fileNames.slice(i,i+20);
 const titles=batch.map(f=>"File:"+f).join("|");
 const url="https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=400&titles="+encodeURIComponent(titles)+"&origin=*";
 const j=await fetchJson(url);
 for(const page of Object.values(j.query?.pages||{})){
  const ii=page.imageinfo?.[0];if(!ii)continue;
  smallMap.set(String(page.title).replace(/^File:/,""),ii.thumburl||ii.url);
 }
 await sleep(300);
}

function licenseOk(meta){
 const md=meta.extmetadata||{};
 const lic=cleanHtml(md.LicenseShortName?.value||md.UsageTerms?.value||"");
 const lower=lic.toLowerCase();
 return /public domain|cc0|cc by|cc-by|creative commons attribution|gfdl/.test(lower);
}
function getExt(contentType,url){
 const t=(contentType||"").toLowerCase();
 if(t.includes("jpeg"))return ".jpg";if(t.includes("png"))return ".png";if(t.includes("webp"))return ".webp";if(t.includes("gif"))return ".gif";if(t.includes("svg"))return ".svg";
 try{const e=path.extname(new URL(url).pathname);return e&&e.length<8?e:".img"}catch{return ".img"}
}
async function download(url,destBase){
 for(let a=0;a<6;a++){
  try{
   const r=await fetch(url,{headers:{"User-Agent":"QiaomaiMediaResearch/1.0"}});
   if(r.status===429||r.status===503){await sleep(Math.min(45000,3000*Math.pow(1.7,a)));continue}
   if(!r.ok)throw new Error("HTTP "+r.status);
   const buf=Buffer.from(await r.arrayBuffer());
   const ext=getExt(r.headers.get("content-type"),url);
   const dest=destBase+ext;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,buf);
   return {dest,bytes:buf.length,sha256:hashBuf(buf),mime:r.headers.get("content-type")||null};
  }catch(e){if(a===5)throw e;await sleep(1200*(a+1))}
 }
}

const manifestPath=path.join(OUT,"media_manifest.jsonl");
let manifest=readJL(manifestPath);
const existing=new Map(manifest.map(x=>[x.entity_type+"|"+x.entity_id+"|"+x.role,x]));
let successes=0,skippedLicense=0,failed=0;

for(let idx=0;idx<entities.length;idx++){
 const e=entities[idx], file=qidToFile[e.qid];
 if(!file)continue;
 const key=e.entity_type+"|"+e.entity_id+"|primary";
 if(existing.has(key))continue;
 const meta=metaByFile.get(file);if(!meta)continue;
 if(!licenseOk(meta)){skippedLicense++;continue}
 const md=meta.extmetadata||{};
 const lic=cleanHtml(md.LicenseShortName?.value||md.UsageTerms?.value||"");
 const artist=cleanHtml(md.Artist?.value||md.Credit?.value||"");
 const licUrl=md.LicenseUrl?.value||null;
 const desc=cleanHtml(md.ImageDescription?.value||"");
 const date=cleanHtml(md.DateTimeOriginal?.value||md.DateTime?.value||"");
 const entityDir=path.join(WEB,e.entity_type,safe(e.entity_id));
 const masterBase=path.join(entityDir,"primary-1440");
 const thumbBase=path.join(entityDir,e.entity_type==="person"?"thumb-360":"thumb-400");
 try{
  const master=await download(meta.thumb_url,masterBase);
  const smUrl=smallMap.get(file)||meta.thumb_url;
  const thumb=await download(smUrl,thumbBase);
  const rel=x=>path.relative(path.join(ROOT,"frontend"),x).replaceAll("\\","/");
  const row={
   image_id:"img_"+crypto.createHash("sha1").update(key+"|"+file).digest("hex").slice(0,16),
   entity_type:e.entity_type,entity_id:e.entity_id,role:"primary",is_primary:true,title:file,
   caption:desc||e.title,source_institution:"Wikimedia Commons",source_page_url:meta.description_url,
   original_url:meta.original_url,author:artist,license:lic,license_url:licUrl,
   rights_basis:/public domain/i.test(lic)?"public_domain":/cc0/i.test(lic)?"cc0":/by-sa/i.test(lic)?"cc_by_sa":/cc by|cc-by|attribution/i.test(lic)?"cc_by":"free_license",
   original_width:meta.width,original_height:meta.height,original_size_bytes:meta.size_bytes,mime_type:meta.mime,
   local_display:rel(master.dest),display_width:meta.thumb_width,display_height:meta.thumb_height,display_bytes:master.bytes,display_sha256:master.sha256,
   local_thumb:rel(thumb.dest),thumb_bytes:thumb.bytes,thumb_sha256:thumb.sha256,
   wikidata_qid:e.qid,historical_date:date||null,media_basis:"wikidata_p18_commons",retrieved_at:new Date().toISOString()
  };
  manifest.push(row);existing.set(key,row);successes++;
  if(successes%25===0){
   fs.writeFileSync(manifestPath,manifest.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
   console.log("downloaded",successes,"entity",idx+1,"/",entities.length);
  }
  await sleep(90);
 }catch(err){failed++;console.error("FAIL",e.entity_id,file,err.message)}
}
fs.writeFileSync(manifestPath,manifest.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");

const result={
 generated_at:new Date().toISOString(),entities_with_qid:entities.length,p18_found:Object.keys(qidToFile).length,
 unique_p18_files:fileNames.length,manifest_total:manifest.length,new_downloaded:successes,skipped_nonfree_license:skippedLicense,failed,
 by_type:{person:manifest.filter(x=>x.entity_type==="person"&&x.role==="primary").length,place:manifest.filter(x=>x.entity_type==="place"&&x.role==="primary").length}
};
fs.writeFileSync(path.join(ACQ,"WIKIMEDIA_P18_RUN_SUMMARY.json"),JSON.stringify(result,null,2),"utf8");
console.log(JSON.stringify(result,null,2));
