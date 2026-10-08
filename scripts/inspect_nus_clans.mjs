const urls=[
"https://nus.edu.sg/nuslibraries/dsprojects/sfcca/clans/locality/",
"https://nus.edu.sg/nuslibraries/dsprojects/sfcca/clans/name/",
"https://nus.edu.sg/nuslibraries/dsprojects/sfcca/clans/kinship/"
];
for(const u of urls){
 const r=await fetch(u,{headers:{"User-Agent":"Mozilla/5.0 QiaomaiCoursework/1.0"}});
 const t=await r.text();
 console.log("URL",u,"status",r.status,"len",t.length);
 console.log(t.slice(0,5000).replace(/\s+/g," "));
}