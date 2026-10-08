import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const C=path.join(ROOT,"data","canonical","R02");
const rows=fs.readFileSync(path.join(C,"organizations_merged_v3.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const upgrades={
"org_sfcca_5492d540d6":{src:"SRC-CSWK-OFFICIAL",summary:"1848年成立的新加坡四邑陈氏会馆，由广东四邑陈氏宗亲组织发展而来，长期参与宗亲互助与文化传承。"},
"org_sfcca_681d9807bf":{src:"SRC-CHANGCHOW-OFFICIAL",summary:"新加坡漳州籍社群组织，官方页面持续提供会馆历史、会员与活动资料。"},
"org_sfcca_51211aa709":{src:"SRC-HAKKACHONG-OFFICIAL",summary:"新加坡客属张氏宗亲组织，官网保存组织沿革、宗族源流与历届理事资料。"},
"org_sfcca_0334dc3022":{src:"SRC-NHF-OFFICIAL",summary:"新加坡客属总会（南洋客属总会）是客家社群联合组织，持续开展文化、慈善和属会协作。"},
"org_sfcca_d9c407f99a":{src:"SRC-SAMSUI-OFFICIAL",summary:"三水会馆是新加坡广东三水籍社群组织，官网自述历史可追溯至1886年。"},
"org_sfcca_a7e704db98":{src:"SRC-TEOCHEW-FED-OFFICIAL",summary:"新加坡潮州总会为潮州社群联合组织，官网公开属会、活动与组织资料。"},
"org_sfcca_bbaaeadb66":{src:"SRC-KONGCHOW-OFFICIAL",summary:"岡州会馆由广东新会同乡在新加坡创立，是当地较早的广东会馆之一。",founding_conflict:["1839（SFCCA目录）","1840（会馆官网）"],founded_date_display:"约1839–1840"},
"org_sfcca_440bd30235":{src:"SRC-BAOSHU-OFFICIAL",summary:"1957年成立的新加坡客属宝树谢氏公会，由客家谢氏族人组成，重视宗族文化、教育与家谱研究。"},
"org_sfcca_77b628c63b":{src:"SRC-TEOANN-FED",summary:"潮安会馆筹组始于1950年前后，历经多年联络后于1964年正式举行成立典礼。"},
"org_sfcca_69e41b090d":{src:"SRC-SKTHK-MEMBERS",summary:"1936年成立的新加坡广东黄氏宗亲会，是新加坡广东会馆团体会员之一。"},
"org_sfcca_cd2a88227d":{src:"SRC-CULTUREPAEDIA-HOKKIEN",summary:"新加坡福建杨氏公会属于福建血缘会馆体系，文化百科资料记其形成于20世纪中叶。"},
"org_sfcca_adfeb96725":{src:"SRC-SIMCLAN-SITE",extra:"SRC-NLB-SIMCLAN-2002",summary:"新加坡潮州沈氏联合会是潮州沈氏宗亲组织，公开年鉴与报刊可确认其长期社团活动。"}
};
let n=0;
for(const x of rows){
 const u=upgrades[x.id]; if(!u)continue;
 x.source_ids=[...new Set([...(x.source_ids||[]),u.src,...(u.extra?[u.extra]:[])])];
 x.review_status="reviewed_basic";
 x.short_summary=u.summary;
 if(u.founding_conflict){x.founded_date_conflict=u.founding_conflict;x.founded_date_display=u.founded_date_display;}
 n++;
}
const out=path.join(C,"organizations_merged_v4.jsonl");
fs.writeFileSync(out,rows.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const summary={
 total:rows.length,upgraded_this_round:n,
 reviewed:rows.filter(x=>x.review_status==="reviewed").length,
 reviewed_basic:rows.filter(x=>x.review_status==="reviewed_basic").length,
 front_end_basic_ready:rows.filter(x=>["reviewed","reviewed_basic"].includes(x.review_status)).length,
 candidate_normalized:rows.filter(x=>x.review_status==="candidate_normalized").length,
 with_founding_conflict:rows.filter(x=>x.founded_date_conflict?.length).length
};
fs.writeFileSync(path.join(C,"organizations_merged_v4_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));
