import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const OUT=path.join(ROOT,"data","collection","R02","qiaopi_media_samples");
fs.mkdirSync(OUT,{recursive:true});
const samples=[
 {id:"G2013-侨批-0159",url:"https://www.da.gd.gov.cn/portal_home/file/getById?fileId=12988",name:"G2013-QP-0159-01.jpg"}
];
for(const x of samples){
 const r=await fetch(x.url,{headers:{"User-Agent":"Mozilla/5.0 QiaomaiCoursework/1.0","Referer":"https://www.da.gd.gov.cn/"}});
 console.log(x.id,"status",r.status,"type",r.headers.get("content-type"),"len",r.headers.get("content-length"));
 if(!r.ok)continue;
 const buf=Buffer.from(await r.arrayBuffer());
 fs.writeFileSync(path.join(OUT,x.name),buf);
 console.log("saved",x.name,buf.length);
}