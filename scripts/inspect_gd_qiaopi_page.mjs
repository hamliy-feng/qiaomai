const urls=[
"https://da.gd.gov.cn/portal_home/archives/viewImg/370056",
"https://www.da.gd.gov.cn/portal_home/wap/archivesDetail/5252"
];
for(const u of urls){
 try{
  const r=await fetch(u,{headers:{"User-Agent":"Mozilla/5.0 QiaomaiCoursework/1.0"}});
  const t=await r.text();
  console.log("URL",u,"status",r.status,"len",t.length);
  console.log(t.slice(0,8000).replace(/\s+/g," "));
 }catch(e){console.error("ERR",u,e.message)}
}