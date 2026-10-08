import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const OUT=path.join(ROOT,"data","collection","R02","qiaopi_media_samples","commons");
fs.mkdirSync(OUT,{recursive:true});
const files=[
"Birth certificate of Tjiong Joen Foeng.jpg",
"侨批1.jpg",
"侨批2.jpg"
];
for(const name of files){
 const u="https://commons.wikimedia.org/wiki/Special:Redirect/file/"+encodeURIComponent(name);
 const r=await fetch(u,{redirect:"follow",headers:{"User-Agent":"QiaomaiAcademicProject/1.0"}});
 console.log(name,r.status,r.url,r.headers.get("content-type"),r.headers.get("content-length"));
 if(!r.ok)continue;
 const b=Buffer.from(await r.arrayBuffer());
 const safe=name.replace(/[\\/:*?"<>|]/g,"_");
 const p=path.join(OUT,safe);
 fs.writeFileSync(p,b);
 fs.writeFileSync(p+".b64",b.toString("base64"),"utf8");
 console.log("saved",safe,b.length);
}
