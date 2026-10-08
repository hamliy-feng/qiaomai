const q = `
SELECT ?item ?itemLabel ?birthDate ?birthPlace ?birthPlaceLabel ?citizenship ?citizenshipLabel WHERE {
  ?item wdt:P31 wd:Q5;
        wdt:P19 ?birthPlace;
        wdt:P27 ?citizenship.
  ?birthPlace wdt:P131* wd:Q15175.
  FILTER(?citizenship != wd:Q148)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "zh,en". }
}
LIMIT 20
`;
const url="https://query.wikidata.org/sparql?format=json&query="+encodeURIComponent(q);
const r=await fetch(url,{headers:{"User-Agent":"QiaomaiAcademicProject/1.0 (non-commercial coursework; contact via project operator)","Accept":"application/sparql-results+json"}});
console.log("status",r.status);
const t=await r.text();
console.log(t.slice(0,12000));
