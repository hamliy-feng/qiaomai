import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const DIR=path.join(ROOT,"data","collection","R02");
const inputName=fs.existsSync(path.join(DIR,"person_candidates_1000_cleaned_enriched.jsonl"))?"person_candidates_1000_cleaned_enriched.jsonl":"person_candidates_1000_enriched.jsonl";
const rows=fs.readFileSync(path.join(DIR,inputName),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);

const CJK=/[\u3400-\u9FFF]/g;
const NATURAL_CN=/^[\u3400-\u9FFF]{2,6}$/;
const diasporaRe=/(华裔|華裔|华侨|華僑|华人|華人|華商|华商|中國裔|中国裔|Chinese|of Chinese origin|overseas Chinese)/i;
const chineseSurnameRe=/(^|[ .'-])(Liu|Lew|Lau|Lo|Lu|Li|Lee|Lin|Lam|Lim|Ling|Chen|Chan|Chin|Cheng|Cheung|Chang|Chong|Chung|Wong|Huang|Hwang|Ho|Hu|Woo|Wu|Ng|Eng|Ong|Fong|Fung|Feng|Yap|Yip|Yeung|Yuen|Yee|Yu|Yeo|Yau|Tsai|Cai|Choi|Choy|Chow|Chou|Chiu|Chu|Chua|Koh|Goh|Khoo|Koo|Kwek|Quek|Seah|Sim|Soh|Soo|Teo|Toh|Tay|Tan|Tjong|Tong|Tang|T'ang|Pang|Poon|Pua|Phua|Mak|Kwok|Kwan|Leong|Leung|Law|Mah|Mok|Moy|Oei|Oey|Tjoa)([ .'-]|$)/i;
const chinaRe=/(中国|中國|Chinese)/i;
function countCJK(s){return (String(s||"").match(CJK)||[]).length}
function plainChineseName(x){
 const arr=[x.canonical_name,x.traditional_name,...(x.aliases||[])].filter(Boolean);
 return arr.some(v=>NATURAL_CN.test(v));
}
function westernizedLabel(x){
 const n=String(x.canonical_name||"");
 return n.includes("·")||n.includes("・")||(/^[A-Za-z][A-Za-z .'-]+$/.test(n)&&!plainChineseName(x));
}
function desc(x){return [x.description_zh,x.description_en].filter(Boolean).join(" | ")}
function meaningfulOverseas(x){
 return (x.diaspora_signals||[]).some(s=>["foreign_citizenship","foreign_residence","death_abroad","employer_abroad","member_abroad","work_location_abroad"].includes(s));
}
const out=[];
for(const x of rows){
 const d=desc(x);
 const natural=plainChineseName(x);
 const diasporaDesc=diasporaRe.test(d);
 const western=westernizedLabel(x);
 const englishIdentity=[x.english_name,...(x.aliases||[])].filter(Boolean).join(" ");
 const chineseSurname=chineseSurnameRe.test(englishIdentity);
 const onlyEducation=(x.diaspora_signals||[]).length===1 && x.diaspora_signals.includes("educated_abroad");
 let status, reasons=[];
 if(western&&!diasporaDesc&&!natural&&!chineseSurname){
   status="likely_out_of_scope";reasons.push("western_identity_without_chinese_name_description_or_surname_signal");
 } else if(western&&!diasporaDesc&&(chineseSurname||natural)){
   status="manual_review";reasons.push("english_or_transliterated_name_with_chinese_surname_or_name_signal");
 } else if(onlyEducation&&!diasporaDesc){
   status="manual_review";reasons.push("only_education_abroad_signal");
 } else if(natural&&meaningfulOverseas(x)&&(diasporaDesc||x.wikipedia_zh)){
   status="keep_high";reasons.push("natural_chinese_name_plus_overseas_signal");
 } else if(natural&&meaningfulOverseas(x)){
   status="keep_medium";reasons.push("natural_chinese_name_plus_overseas_signal_needs_biography");
 } else if(diasporaDesc){
   status="keep_medium";reasons.push("diaspora_identity_in_description");
 } else {
   status="manual_review";reasons.push("insufficient_identity_context");
 }
 out.push({...x,scope_audit_status:status,scope_audit_reasons:reasons});
}
const counts=Object.fromEntries(["keep_high","keep_medium","manual_review","likely_out_of_scope"].map(s=>[s,out.filter(x=>x.scope_audit_status===s).length]));
fs.writeFileSync(path.join(DIR,"person_candidates_1000_scope_audited.jsonl"),out.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const rejects=out.filter(x=>x.scope_audit_status==="likely_out_of_scope");
fs.writeFileSync(path.join(DIR,"person_candidates_scope_reject_queue.jsonl"),rejects.map(x=>JSON.stringify(x)).join("\n")+(rejects.length?"\n":""),"utf8");
const review=out.filter(x=>x.scope_audit_status==="manual_review");
fs.writeFileSync(path.join(DIR,"person_candidates_manual_review_queue.jsonl"),review.map(x=>JSON.stringify(x)).join("\n")+(review.length?"\n":""),"utf8");
const summary={count:out.length,...counts,likely_out_of_scope_samples:rejects.slice(0,20).map(x=>({qid:x.qid,name:x.canonical_name,description_zh:x.description_zh,description_en:x.description_en,birth_place:x.birth_place_label,diaspora_signals:x.diaspora_signals}))};
fs.writeFileSync(path.join(DIR,"person_scope_audit_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));
