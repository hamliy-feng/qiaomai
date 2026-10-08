import {execFileSync,execSync} from "child_process";
import fs from "fs";import path from "path";import {fileURLToPath} from "url";
execSync("python -m pip install --quiet Pillow",{stdio:["ignore","ignore","pipe"]});
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const SRC=path.join(ROOT,"data","collection","R02","qiaopi_media_samples","commons");
const OUT=path.join(ROOT,"data","collection","R02","qiaopi_review_thumbnails");
fs.mkdirSync(OUT,{recursive:true});
const py=`
from PIL import Image
from pathlib import Path
import sys, json, hashlib
src=Path(sys.argv[1]); out=Path(sys.argv[2])
im=Image.open(src)
info={"file":src.name,"format":im.format,"size":im.size,"mode":im.mode,"exif":{}}
try:
    ex=im.getexif()
    for k,v in ex.items():
        if k in [271,272,305,306,315]:
            info["exif"][str(k)]=str(v)
except Exception:
    pass
thumb=im.copy()
thumb.thumbnail((1200,1200), Image.Resampling.LANCZOS)
if thumb.mode not in ("RGB","L"): thumb=thumb.convert("RGB")
thumb.save(out,"JPEG",quality=88,optimize=True)
info["thumb_size"]=thumb.size
info["sha256"]=hashlib.sha256(src.read_bytes()).hexdigest()
print(json.dumps(info,ensure_ascii=False))
`;
for(const f of fs.readdirSync(SRC).filter(x=>x.toLowerCase().endsWith(".jpg"))){
  const src=path.join(SRC,f), out=path.join(OUT,f.replace(/\.jpg$/i,"_review.jpg"));
  const ret=execFileSync("python",["-c",py,src,out],{encoding:"utf8"});
  console.log(ret.trim());
  const b=fs.readFileSync(out);
  fs.writeFileSync(out+".b64",b.toString("base64"),"utf8");
}
