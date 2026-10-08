const u="https://sfcca.sg/%E4%BC%9A%E9%A6%86%E7%9B%AE%E5%BD%95/";
const r=await fetch(u,{headers:{"User-Agent":"Mozilla/5.0 QiaomaiCoursework/1.0"}});
const t=await r.text();
console.log("status",r.status,"len",t.length);
console.log(t.slice(0,12000).replace(/\s+/g," "));