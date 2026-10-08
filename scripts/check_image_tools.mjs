import {execSync} from "child_process";
for(const cmd of ["magick -version","convert -version","python --version","python3 --version"]){
  try{console.log("CMD",cmd);console.log(execSync(cmd,{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).slice(0,500));}
  catch(e){console.log("FAIL",cmd,e.status,String(e.stderr||e.message).slice(0,300));}
}