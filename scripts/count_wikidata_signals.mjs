for (const [sig,prop] of [["education","P69"],["employer","P108"],["work_location","P937"],["member","P463"]]){
 for (const [label,prov] of [["Guangdong","Q15175"],["Fujian","Q41705"]]){
  const q=`SELECT (COUNT(DISTINCT ?item) AS ?count) WHERE {
    ?item wdt:P31 wd:Q5; wdt:P19 ?birthPlace; wdt:${prop} ?x.
    ?birthPlace wdt:P131* wd:${prov}.
    ?x wdt:P17 ?country.
    FILTER(?country != wd:Q148 && ?country != wd:Q8646 && ?country != wd:Q14773)
  }`;
  const url="https://query.wikidata.org/sparql?format=json&query="+encodeURIComponent(q);
  const r=await fetch(url,{headers:{"User-Agent":"QiaomaiAcademicProject/1.0","Accept":"application/sparql-results+json"}});
  const j=await r.json();
  console.log(sig,label,j.results.bindings[0]?.count?.value);
  await new Promise(res=>setTimeout(res,1000));
 }
}
