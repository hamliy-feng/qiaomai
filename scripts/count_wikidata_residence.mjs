const countries=["Q30","Q16","Q334","Q833","Q252","Q928","Q869","Q881","Q408","Q145","Q258","Q419","Q241","Q804","Q1027","Q836","Q424","Q921","Q664","Q142","Q55","Q148","Q8646","Q14773"];
for (const [label,prov] of [["Guangdong","Q15175"],["Fujian","Q41705"]]){
 const q=`SELECT (COUNT(DISTINCT ?item) AS ?count) WHERE {
  ?item wdt:P31 wd:Q5; wdt:P19 ?birthPlace; wdt:P551 ?res.
  ?birthPlace wdt:P131* wd:${prov}.
  ?res wdt:P17 ?country.
  FILTER(?country != wd:Q148 && ?country != wd:Q8646 && ?country != wd:Q14773)
 }`;
 const url="https://query.wikidata.org/sparql?format=json&query="+encodeURIComponent(q);
 const r=await fetch(url,{headers:{"User-Agent":"QiaomaiAcademicProject/1.0","Accept":"application/sparql-results+json"}});
 const j=await r.json();
 console.log(label,j.results.bindings[0]?.count?.value);
}
