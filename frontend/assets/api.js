window.QM_REPO=(()=>{
const cfg=window.QM_CONFIG||{mode:"demo",apiBase:"/api/v1"};
const plural={person:"persons",family:"families",place:"places",org:"orgs",event:"events",document:"documents",qiaopi:"qiaopi"};
const demo=window.QM_DEMO;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function all(type){return demo?.[plural[type]||type]||[]}
async function request(path){const res=await fetch((cfg.apiBase||"")+path,{headers:{Accept:"application/json"}});if(!res.ok)throw new Error("HTTP "+res.status);return res.json()}
async function list(type){if(cfg.mode==="backend"){const payload=await request("/"+(plural[type]||type));return payload.data||payload.items||payload}await sleep(40);return all(type)}
async function get(type,id){if(cfg.mode==="backend"){const payload=await request("/"+(plural[type]||type)+"/"+encodeURIComponent(id));return payload.data||payload}await sleep(20);return all(type).find(x=>x.id===id)||null}
async function stats(){if(cfg.mode==="backend"){const payload=await request("/stats");return payload.data||payload}return {person:all("person").length,family:all("family").length,place:all("place").length,event:all("event").length,org:all("org").length,document:all("document").length,qiaopi:all("qiaopi").length}}
function href(type,id){const map={person:"person.html",family:"family.html",place:"place.html",event:"event.html",org:"org.html",document:"archive.html",qiaopi:"qiaopi.html"};return (map[type]||"search.html")+"?id="+encodeURIComponent(id)}
async function resolve(ids,type){if(!Array.isArray(ids))return[];const xs=await list(type);return ids.map(id=>xs.find(x=>x.id===id)).filter(Boolean)}
async function search(query="",type="all"){const q=String(query).trim().toLowerCase();const types=["person","family","place","org","event","document","qiaopi"];let out=[];for(const t of types){if(type!=="all"&&type!==t)continue;const xs=await list(t);out.push(...xs.filter(x=>!q||[x.title,x.summary,x.origin,x.area,x.kind,x.from,x.to,x.sender,x.receiver,x.batchNo,x.date,x.source,...(x.aliases||[]),...(x.roles||[])].filter(Boolean).join(" ").toLowerCase().includes(q)).map(x=>({...x,_type:t})))}return out}
return {list,get,stats,resolve,search,href,mode:cfg.mode,meta:demo?.meta||{}};
})();