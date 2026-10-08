const u="https://sfcca.sg/%E4%BC%9A%E9%A6%86%E7%9B%AE%E5%BD%95/";
const r=await fetch(u,{headers:{"User-Agent":"Mozilla/5.0 QiaomaiCoursework/1.0"}});
const t=await r.text();
for(const k of ["AMOY ASSOCIATION","厦门","安溪","member","会员目录"]){
 const i=t.toLowerCase().indexOf(k.toLowerCase()); console.log("KEY",k,"IDX",i); if(i>=0)console.log(t.slice(Math.max(0,i-1200),i+4000).replace(/\s+/g," "));
}