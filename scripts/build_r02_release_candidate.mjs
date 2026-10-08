import fs from "fs";import path from "path";import crypto from "crypto";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."),P=path.join(ROOT,"data","presentation","R02"),R=path.join(ROOT,"data","collection","R02");
const OUT=path.join(ROOT,"data","release","R02");fs.mkdirSync(OUT,{recursive:true});
const files=[
 ["persons_1000_basic_cards.jsonl","persons_1000_basic_cards.jsonl"],
 ["persons_top100_basic_ready.jsonl","persons_top100_basic_ready.jsonl"],
 ["organizations_basic_ready.jsonl","organizations_basic_ready.jsonl"],
 ["events_frontend_candidates.jsonl","events_frontend_candidates.jsonl"],
 ["places_map_ready.jsonl","places_map_ready.jsonl"],
 ["places_text_ready.jsonl","places_text_ready.jsonl"]
];
const manifest={generated_at:new Date().toISOString(),status:"release_candidate_not_production",files:[],media_policy:"qiaopi images excluded unless clean_original + no watermark + no alteration + full_page + rights allowed",qiaopi_media_included:0};
for(const [src,dst] of files){
 const s=path.join(P,src),d=path.join(OUT,dst);if(!fs.existsSync(s))continue;const b=fs.readFileSync(s);fs.writeFileSync(d,b);
 const rows=b.toString("utf8").split(/\r?\n/).filter(Boolean).length;manifest.files.push({file:dst,records:rows,sha256:crypto.createHash("sha256").update(b).digest("hex")});
}
const clean=path.join(R,"qiaopi_media_publishable.jsonl");
if(fs.existsSync(clean)){
 const b=fs.readFileSync(clean);const rows=b.toString("utf8").split(/\r?\n/).filter(Boolean).length;
 manifest.qiaopi_media_included=rows;
 if(rows>0){fs.writeFileSync(path.join(OUT,"qiaopi_media_publishable.jsonl"),b);manifest.files.push({file:"qiaopi_media_publishable.jsonl",records:rows,sha256:crypto.createHash("sha256").update(b).digest("hex")});}
}
manifest.release_blockers=["1000人物仍是basic/candidate分层，不是1000学术reviewed","侨批clean_original正式媒体仍需单独过门禁","3000份侨批规范全文未完成"];
fs.writeFileSync(path.join(OUT,"MANIFEST.json"),JSON.stringify(manifest,null,2),"utf8");
console.log(JSON.stringify(manifest,null,2));