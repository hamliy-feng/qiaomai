const u="https://da.gd.gov.cn/portal_home/archives/viewImg/370056";
const r=await fetch(u,{headers:{"User-Agent":"Mozilla/5.0 QiaomaiCoursework/1.0"}});
const t=await r.text();
for(const key of ["197-012-00997","file-name","main-content","catalogue"]){
 let pos=0,n=0;
 console.log("KEY",key);
 while((pos=t.indexOf(key,pos))>=0 && n<10){
   console.log("IDX",pos,t.slice(Math.max(0,pos-1000),Math.min(t.length,pos+2500)).replace(/\s+/g," "));
   pos+=key.length;n++;
 }
}