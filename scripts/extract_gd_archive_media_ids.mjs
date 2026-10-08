const u="https://da.gd.gov.cn/portal_home/archives/viewImg/370056";
const r=await fetch(u,{headers:{"User-Agent":"Mozilla/5.0 QiaomaiCoursework/1.0"}});
const t=await r.text();
const ids=[...t.matchAll(/file\/getById\?fileId=(\d+)/g)].map(m=>m[1]);
const srcs=[...t.matchAll(/<img[^>]+src="([^"]+)"/gi)].map(m=>m[1]).filter(x=>x.includes("file"));
console.log(JSON.stringify({status:r.status,file_ids:[...new Set(ids)],srcs:[...new Set(srcs)]},null,2));