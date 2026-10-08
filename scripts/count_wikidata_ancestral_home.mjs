const provinces=[["Guangdong","Q15175"],["Fujian","Q41705"]];
const signals=[
["foreign_citizenship","?item wdt:P27 ?target. FILTER(?target != wd:Q148 && ?target != wd:Q8646 && ?target != wd:Q14773)"],
["foreign_residence","?item wdt:P551 ?target. ?target wdt:P17 ?country. FILTER(?country != wd:Q148 && ?country != wd:Q8646 && ?country != wd:Q14773)"],
["death_abroad","?item wdt:P20 ?target. ?target wdt:P17 ?country. FILTER(?country != wd:Q148 && ?country != wd:Q8646 && ?country != wd:Q14773)"],
["employer_abroad","?item wdt:P108 ?target. ?target wdt:P17 ?country. FILTER(?country != wd:Q148 && ?country != wd:Q8646 && ?country != wd:Q14773)"],
["work_location_abroad","?item wdt:P937 ?target. ?target wdt:P17 ?country. FILTER(?country != wd:Q148 && ?country != wd:Q8646 && ?country != wd:Q14773)"]
];
for(const [pname,pqid] of provinces){
 for(const [sname,pat] of signals){
   const q=`SELECT (COUNT(DISTINCT ?item) AS ?count) WHERE {
     ?item wdt:P31 wd:Q5; wdt:P66 ?home.
     ?home wdt:P131* wd:${pqid}.
     ${pat}
   }`;
   const url="https://query.wikidata.org/sparql?format=json&query="+encodeURIComponent(q);
   let ok=false;
   for(let a=0;a<4&&!ok;a++){
     try{
       const r=await fetch(url,{headers:{"User-Agent":"QiaomaiAcademicProject/1.0","Accept":"application/sparql-results+json"}});
       if(r.status===429){await new Promise(x=>setTimeout(x,3000*(a+1)));continue;}
       const j=await r.json(); console.log(pname,sname,j.results.bindings[0]?.count?.value); ok=true;
     }catch(e){if(a===3)console.error(pname,sname,e.message); else await new Promise(x=>setTimeout(x,2000*(a+1)));}
   }
   await new Promise(x=>setTimeout(x,700));
 }
}