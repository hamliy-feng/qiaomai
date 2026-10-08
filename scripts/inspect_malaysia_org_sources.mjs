const urls=[
"https://www.maguanglianhui.com/branch",
"https://www.fujianmalaysia.com/",
"https://www.fujian-ren.com/?page_id=6322"
];
for(const u of urls){
 const r=await fetch(u,{headers:{"User-Agent":"Mozilla/5.0 QiaomaiCoursework/1.0","Accept-Language":"zh-CN,zh;q=0.9,en;q=0.8"}});
 const t=await r.text();
 console.log("URL",u,"STATUS",r.status,"LEN",t.length);
 console.log(t.slice(0,2500).replace(/\s+/g," "));
}
