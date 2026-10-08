import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const C=path.join(ROOT,"data","canonical","R02");
const P=path.join(ROOT,"data","presentation","R02");
fs.mkdirSync(P,{recursive:true});
const orgFile=fs.existsSync(path.join(C,"organizations_merged_v5.jsonl"))?"organizations_merged_v5.jsonl":"organizations_merged_v4.jsonl";
const orgs=fs.readFileSync(path.join(C,orgFile),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const ready=orgs.filter(x=>["reviewed","reviewed_basic"].includes(x.review_status)).map(x=>({
 id:x.id,type:"org",title:x.canonical_name,english_name:x.english_name||null,
 founded:x.founded_date_display||x.founded_date||null,
 org_type:x.org_type,location:x.country?([x.city,x.country].filter(Boolean).join(" · ")):"新加坡",
 summary:x.short_summary||((x.founded_date?x.founded_date+"年":"")+"成立的粤闽华人社团。"),
 address:x.sfcca_directory?.address||null,website:x.sfcca_directory?.website||null,
 source_ids:x.source_ids||[],review_status:x.review_status,
 conflict_note:x.founded_date_conflict?("成立年份存在不同记载："+x.founded_date_conflict.join("；")):null
}));
fs.writeFileSync(path.join(P,"organizations_basic_ready.jsonl"),ready.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
console.log(JSON.stringify({organizations_basic_ready:ready.length,reviewed:ready.filter(x=>x.review_status==="reviewed").length,reviewed_basic:ready.filter(x=>x.review_status==="reviewed_basic").length},null,2));
