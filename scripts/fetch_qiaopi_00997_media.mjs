import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const OUT=path.join(ROOT,"data","collection","R02","qiaopi_media_samples");
fs.mkdirSync(OUT,{recursive:true});
for(const id of ["208366","208367","208368"]){
 const u="https://www.da.gd.gov.cn/portal_home/file/getById?fileId="+id;
 const r=await fetch(u,{headers:{"User-Agent":"Mozilla/5.0 QiaomaiCoursework/1.0","Referer":"https://da.gd.gov.cn/portal_home/archives/viewImg/370056"}});
 if(!r.ok){console.log(id,r.status);continue;}
 const b=Buffer.from(await r.arrayBuffer());
 const ext=(r.headers.get("content-type")||"").includes("png")?"png":"jpg";
 const p=path.join(OUT,"197-012-00997-"+id+"."+ext);
 fs.writeFileSync(p,b);
 fs.writeFileSync(p+".b64",b.toString("base64"),"utf8");
 console.log(id,r.status,r.headers.get("content-type"),b.length,p);
}