QM_PAGES.org=()=>{
 const Q=QM,{e,title}=Q;
 return Q.directory('org','连接会馆、学校、商会与侨社网络',x=>{
  const people=Q.resolve('person',x.personIds),places=Q.resolve('place',x.placeIds),evs=Q.resolve('event',x.eventIds),docs=Q.resolve('document',[...new Set([...(x.documentIds||[]),...people.flatMap(p=>p.documentIds||[])])]);
  return `<article class="card dossier org-dossier">${Q.thumb(x,'org')}<div class="dossier-copy"><h2>${e(title(x))}</h2><div class="chips">${[x.kind,places[0]?.area,'近现代'].filter(Boolean).map(v=>Q.chip(v)).join('')}</div><p class="line-clamp">${e(x.summary)}</p></div></article><div class="org-middle">${Q.section('核心人物',Q.minis(people.slice(0,3),'person'),'person.html')}${Q.section('关联地点',Q.minis(places.slice(0,3),'place'),'place.html')}${Q.section('重要事件',`<div class="v-timeline">${Q.rows(evs.slice(0,4),'event')}</div>`,'event.html')}</div><div class="org-bottom">${Q.section('历史档案 / 侨批',Q.minis(docs.slice(0,4),'document',4),'archive.html')}${Q.section('关联网络',QM_GRAPH.organization(x))}</div>`;
 },{defaultId:'org_xiamen_university',filters:`<div class="filter-row">${Q.select('类型',Q.D.org.map(x=>x.kind),'data-filter')}${Q.select('地区',['福建','新加坡','美国'],'data-filter')}${Q.select('时期',['近现代'],'data-filter')}</div>`});
};
