import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const C=path.join(ROOT,"data","canonical","R02");
const rows=fs.readFileSync(path.join(C,"organizations_merged_v2.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
let promoted=0;
for(const x of rows){
  const src=new Set(x.source_ids||[]);
  const twoIndex=src.has("SRC-NUS-SFCCA-INDEX")&&src.has("SRC-SFCCA-DIRECTORY-2024");
  const hasCore=!!x.canonical_name&&!!x.founded_date&&!!x.sfcca_directory?.address;
  if(x.review_status==="candidate_normalized"&&twoIndex&&hasCore){
    x.review_status="reviewed_basic";
    const scope=x.scope_relation==="Fujian"?"福建":x.scope_relation==="Guangdong"?"广东/潮州/客家":"粤闽";
    x.short_summary=x.short_summary||`${x.founded_date}年成立于新加坡的${scope}社群组织。现有官方会员目录可确认其名称、成立年份与会址；完整组织史、代表人物与历史事件仍在继续补证。`;
    x.basic_review_basis=["SRC-NUS-SFCCA-INDEX","SRC-SFCCA-DIRECTORY-2024"];
    promoted++;
  }
}
const out=path.join(C,"organizations_merged_v3.jsonl");
fs.writeFileSync(out,rows.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const summary={
 total:rows.length,promoted,
 reviewed:rows.filter(x=>x.review_status==="reviewed").length,
 reviewed_basic:rows.filter(x=>x.review_status==="reviewed_basic").length,
 candidate_normalized:rows.filter(x=>x.review_status==="candidate_normalized").length,
 front_end_basic_ready:rows.filter(x=>["reviewed","reviewed_basic"].includes(x.review_status)).length,
 with_founded_date:rows.filter(x=>x.founded_date).length,
 with_address:rows.filter(x=>x.sfcca_directory?.address||x.address).length,
 malaysia:rows.filter(x=>x.country==="马来西亚").length,
 singapore:rows.filter(x=>x.headquarters_place_id==="place_singapore"||x.country==="新加坡").length
};
fs.writeFileSync(path.join(C,"organizations_merged_v3_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));
