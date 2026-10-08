import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const r01=path.join(ROOT,"data","canonical","R01","organizations.jsonl");
const r02=path.join(ROOT,"data","collection","R02","sfcca_gd_fj_candidates.jsonl");
const OUT=path.join(ROOT,"data","canonical","R02");
fs.mkdirSync(OUT,{recursive:true});
const read=p=>fs.readFileSync(p,"utf8").split(String.fromCharCode(10)).map(x=>x.replace(String.fromCharCode(13),"")).filter(Boolean).map(JSON.parse);
function norm(s){
 return String(s||"").replace(/^新加坡/,"").replace(/^南洋/,"").replace(/^星洲/,"").replace(/[\s·・（）()]/g,"").replace(/總/g,"总").replace(/會/g,"会").replace(/館/g,"馆").replace(/閩/g,"闽").replace(/廣/g,"广").replace(/東/g,"东").replace(/龍/g,"龙").replace(/興/g,"兴").replace(/陽/g,"阳").replace(/縣/g,"县").toLowerCase();
}
const base=read(r01), sf=read(r02);
const byNorm=new Map();
for(const o of base)byNorm.set(norm(o.canonical_name),o);
let merged=0,added=0;
for(const x of sf){
 const n=norm(x.name);
 let o=byNorm.get(n);
 if(o){
   merged++;
   o.sfcca_directory={name:x.name,founded_year:x.founded_year,members_raw:x.members_raw,address:x.address,website:x.website,image_url:x.image_url,source_updated:x.source_updated};
   o.source_ids=[...new Set([...(o.source_ids||[]),"SRC-SFCCA-DIRECTORY-2024"])];
   if(!o.founded_date&&x.founded_year)o.founded_date=x.founded_year;
 }else{
   const h=crypto.createHash("sha1").update(x.name).digest("hex").slice(0,10);
   o={
     id:"org_sfcca_"+h,
     canonical_name:x.name,
     english_name:null,
     aliases:[],
     org_type:x.name.includes("宗亲")||x.name.includes("氏")?"clan_association":"hometown_association",
     founded_date:x.founded_year||null,
     headquarters_place_id:"place_singapore",
     locality_group:x.scope_relation,
     scope_relation:x.scope_relation,
     source_ids:["SRC-SFCCA-DIRECTORY-2024"],
     sfcca_directory:{name:x.name,founded_year:x.founded_year,members_raw:x.members_raw,address:x.address,website:x.website,image_url:x.image_url,source_updated:x.source_updated},
     review_status:"candidate_normalized"
   };
   base.push(o);byNorm.set(n,o);added++;
 }
}
fs.writeFileSync(path.join(OUT,"organizations_merged.jsonl"),base.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const summary={r01_orgs:read(r01).length,sfcca_scoped:sf.length,merged_existing:merged,added_new:added,total_after_merge:base.length,reviewed:base.filter(x=>x.review_status==="reviewed").length,candidate_normalized:base.filter(x=>x.review_status==="candidate_normalized").length};
fs.writeFileSync(path.join(OUT,"organizations_merged_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));
