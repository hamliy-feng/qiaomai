import {execSync} from "child_process";
for(const cmd of ['python -c "from PIL import Image; print(\'PIL OK\', Image.__version__)"','python -c "import cv2; print(\'CV2 OK\',cv2.__version__)"']){
 try{console.log(cmd,execSync(cmd,{encoding:"utf8",stdio:["ignore","pipe","pipe"]}));}
 catch(e){console.log("FAIL",cmd,String(e.stderr||e.message));}
}