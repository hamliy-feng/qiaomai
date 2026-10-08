import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const OUT=path.join(ROOT,"data","collection","R02");
fs.mkdirSync(OUT,{recursive:true});
const url="https://sfcca.sg/%E4%BC%9A%E9%A6%86%E7%9B%AE%E5%BD%95/";
const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 QiaomaiCoursework/1.0"}});
const html=await r.text();
function decode(s){
 return (s||"").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/g,"&").replace(/&#8211;|&ndash;/g,"-").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/\s+/g," ").trim();
}
const rx=/<div class="abcfslF20_7">([\s\S]*?)<\/div>/gi;
const matches=[...html.matchAll(rx)];
const rows=[];
for(let i=0;i<matches.length;i++){
 const m=matches[i];
 const name=decode(m[1]);
 const start=m.index;
 const end=i+1<matches.length?matches[i+1].index:Math.min(html.length,start+6000);
 const pre=html.slice(Math.max(0,start-1200),start);
 const chunk=html.slice(start,end);
 const founded=(chunk.match(/成立年份：\s*(\d{4})/)||[])[1]||null;
 const members=(chunk.match(/会员人数：[\s\S]*?abcfslSpanMP2">([^<]+)/)||[])[1]?.trim()||null;
 const address=decode((chunk.match(/地址：(?:&nbsp;)?<\/span><span>([\s\S]*?)<\/span>/)||[])[1]||"")||null;
 const website=(chunk.match(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>\s*<img[^>]+(?:title="link"|link\.png)/i)||[])[1]||null;
 const image=(pre.match(/<img[^>]+src="(https?:\/\/[^"]+wp-content\/uploads\/[^"]+)"/gi)||[]).pop();
 const imageUrl=image?(image.match(/src="([^"]+)"/)||[])[1]:null;
 rows.push({name,founded_year:founded,members_raw:members,address,website,image_url:imageUrl,source_url:url,source_name:"Singapore Federation of Chinese Clan Associations",source_updated:"2024-12",review_status:"candidate"});
}
const kwFJ=["福建","厦门","廈門","安溪","永春","晋江","晉江","南安","福州","福清","莆田","惠安","龙岩","龍岩","泉州","漳州","同安","闽","閩","兴安","興安","古宁","古寧","浯江","金门","金門"];
const kwGD=["广东","廣東","潮州","潮安","汕头","汕頭","揭阳","揭陽","惠来","惠來","普宁","普寧","海陆丰","海陸豐","客家","客属","客屬","大埔","兴宁","興寧","梅县","梅縣","嘉应","嘉應","五邑","四邑","台山","开平","開平","恩平","鹤山","鶴山","新会","新會","中山","香山","番禺","高要","肇庆","肇慶","东莞","東莞","惠州","河源","顺德","順德","南海","三水","增城","从化","從化","宝安","寶安","冈州","岡州","广肇","廣肇"];
for(const x of rows){
 const f=kwFJ.filter(k=>x.name.includes(k));
 const g=kwGD.filter(k=>x.name.includes(k));
 x.scope_keywords=[...f,...g];
 x.scope_relation=f.length&&g.length?"GD_FJ":f.length?"Fujian":g.length?"Guangdong":null;
}
const scoped=rows.filter(x=>x.scope_relation);
fs.writeFileSync(path.join(OUT,"sfcca_members_all.jsonl"),rows.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
fs.writeFileSync(path.join(OUT,"sfcca_gd_fj_candidates.jsonl"),scoped.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const summary={all_members:rows.length,gd_fj_candidates:scoped.length,fujian:scoped.filter(x=>x.scope_relation==="Fujian").length,guangdong:scoped.filter(x=>x.scope_relation==="Guangdong").length,both:scoped.filter(x=>x.scope_relation==="GD_FJ").length,with_founded_year:scoped.filter(x=>x.founded_year).length,with_address:scoped.filter(x=>x.address).length,with_website:scoped.filter(x=>x.website).length};
fs.writeFileSync(path.join(OUT,"sfcca_gd_fj_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));
