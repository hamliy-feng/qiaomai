const u="https://sfcca.sg/%E4%BC%9A%E9%A6%86%E7%9B%AE%E5%BD%95/";
const r=await fetch(u,{headers:{"User-Agent":"Mozilla/5.0 QiaomaiCoursework/1.0"}});
let t=await r.text();
function strip(x){return x.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/g,"&").replace(/&#8211;|&ndash;/g,"-").replace(/\s+/g," ").trim();}
const trs=[...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>strip(m[1])).filter(Boolean);
console.log("TRS",trs.length);
for(const x of trs.slice(0,120)) console.log(x);