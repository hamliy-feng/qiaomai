import {execSync} from "child_process";
try{
  console.log(execSync("python -m pip install --quiet Pillow",{encoding:"utf8",stdio:["ignore","pipe","pipe"]}));
  console.log(execSync("python -c \"from PIL import Image; print(Image.__version__)\"",{encoding:"utf8"}));
}catch(e){console.error(String(e.stderr||e.message));process.exit(1);}
