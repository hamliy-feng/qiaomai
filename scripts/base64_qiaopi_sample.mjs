import fs from "fs";
const p="APP/侨脉/data/collection/R02/qiaopi_media_samples/G2013-QP-0159-01.jpg";
const b=fs.readFileSync(p);
fs.writeFileSync(p+".b64",b.toString("base64"),"utf8");
console.log(JSON.stringify({bytes:b.length,b64:fs.statSync(p+".b64").size}));