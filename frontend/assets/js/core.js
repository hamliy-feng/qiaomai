/* Shared presentation helpers. Data enters exclusively through QM_REPO. */
window.QM_PAGES={};
window.QM=(()=>{
 const $=(s,c=document)=>c.querySelector(s),$$=(s,c=document)=>[...c.querySelectorAll(s)];
 const e=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const labels={home:'首页',person:'人物',family:'家族',place:'地点',event:'事件',org:'组织',document:'历史档案',qiaopi:'侨批',research:'研究工具'};
 const routes={home:'index.html',person:'person.html',family:'family.html',place:'place.html',event:'event.html',org:'org.html',document:'archive.html',qiaopi:'qiaopi.html',research:'research.html'};
 const icons={person:'user-round',family:'users-round',place:'map-pin',event:'calendar-days',org:'landmark',document:'archive',qiaopi:'mail',research:'chart-no-axes-combined'};
 const D={}; let stats={};
 const icon=(n,cls='')=>`<i data-lucide="${e(icons[n]||n)}" class="icon ${cls}" aria-hidden="true"></i>`;
 const chip=(v,active=false)=>`<span class="chip${active?' active':''}">${e(v)}</span>`;
 const href=(type,id)=>window.QM_REPO.href(type,id);
 const get=(t,id)=>(D[t]||[]).find(x=>x.id===id);
 const resolve=(t,ids)=>(ids||[]).map(id=>get(t,id)).filter(Boolean);
 const title=x=>(x?.title||'').replace(/（演示结构）|（演示元数据）/g,'');
 const mediaKeys={'p-chen-jiageng':'chen','p-li-guangqian':'lee','p-situ-meitang':'situ','p-hu-wenhu':'hu','p-ronghong':'rong','pl-singapore':'harbour','pl-xiamen':'xmu','pl-jimei':'jimei','pl-yongding':'tulou','o-xmu':'xmu','o-jimei':'jimei'};
 function media(x){const m=x?.media;if(m?.url){if(x.type==='qiaopi'&&!cleanOriginal(m))return null;return{path:m.url,title:m.caption||x.title}}return window.QM_REPO.mode==='demo'?window.QM_MEDIA?.[mediaKeys[x?.id]]:null}
 const cleanOriginal=m=>m?.watermark_status==='none'&&m.alteration_status==='none'&&m.crop_status==='full_page'&&m.rights_status==='allowed'&&m.media_state==='clean_original';
 const safeURL=s=>/^(assets\/|\.\.?\/|https?:\/\/)/.test(s||'')?s:'';
 function thumb(x,t=x?.type||'document',cls=''){
  const m=media(x),p=m&&safeURL(m.path);return `<div class="thumb ${t==='person'?'portrait':t==='document'||t==='qiaopi'?'document':''} ${cls}">${p?`<img src="${e(p)}" alt="${e(m.title||title(x))}" loading="lazy" title="${e(m.author||'')} · ${e(m.license||'')}">${m.demo?'<span class="media-note">演示影像</span>':''}`:`<div class="no-image">${icon(t)}<span>暂无可公开影像</span></div>`}</div>`;
 }
 const arrow=()=>`<span class="arrow" aria-hidden="true">${icon('chevron-right')}</span>`;
 const empty=(s='暂无已关联记录')=>`<div class="empty">${icon('book-open')}${e(s)}</div>`;
 function section(name,body,more='',cls='') {return `<section class="card ${cls}"><div class="card-head"><h3>${e(name)}</h3>${more?`<a class="more" href="${e(more)}">查看更多 ${icon('arrow-right')}</a>`:''}</div>${body}</section>`}
 function summary(x,t=x.type){return t==='person'?x.years:t==='family'?x.origin:t==='place'?[x.area,x.kind?.split('/')[0]].filter(Boolean).join(' · '):t==='qiaopi'?`${x.from||''} → ${x.to||''}`:[x.date,x.kind].filter(Boolean).join(' · ')}
 function minis(xs,t,cols=3){return xs.length?`<div class="mini-grid ${cols===2?'two':cols===4?'four':''}">${xs.map(x=>`<a class="mini-card" href="${href(t,x.id)}">${thumb(x,t)}<div class="mini-body"><h4 class="line-clamp">${e(title(x))}</h4><small>${e(summary(x,t)||x.source||'关联记录')}</small></div></a>`).join('')}</div>`:empty()}
 function rows(xs,t){return xs.length?xs.map(x=>`<a class="link-row" href="${href(t,x.id)}">${thumb(x,t)}<span class="row-text"><strong class="line-clamp">${e(title(x))}</strong><small>${e(summary(x,t))}</small></span>${arrow()}</a>`).join(''):empty()}
 function kv(values){return `<dl class="kv">${values.map(([k,v])=>`<dt>${e(k)}</dt><dd>${e(v||'—')}</dd>`).join('')}</dl>`}
 function searchbox(placeholder,button='',value='',attr='data-list-search'){return `<${button?'form':'div'} class="searchbox" ${button?'data-search-form':''}>${icon('search')}<input ${attr} value="${e(value)}" aria-label="${e(placeholder)}" placeholder="${e(placeholder)}" autocomplete="off">${button?`<button type="submit">${e(button)}</button>`:''}</${button?'form':'div'}>`}
 const select=(name,values,attr)=>`<select aria-label="${e(name)}" ${attr}><option value="">${e(name)}</option>${[...new Set(values.filter(Boolean))].map(x=>`<option value="${e(x)}">${e(x)}</option>`).join('')}</select>`;
 function hero(t,sub,extra='',cls=''){
  const key=t==='org'||t==='person'?'xmu':'harbour',m=window.QM_MEDIA?.[key];
  const archival=['document','qiaopi','event'].includes(t);
  return `<section class="page-hero ${cls} ${archival?'archive-theme':''}">${m?`<img class="hero-image" src="${e(m.path)}" alt="" aria-hidden="true">`:''}${archival?'<img class="hero-document" src="assets/demo-letter.svg" alt="" aria-hidden="true"><span class="hero-document-note">书信装饰为自制演示图</span>':''}<img class="hero-compass" src="assets/media/compass.svg" alt=""><div class="hero-calligraphy" aria-hidden="true">海内海外<br>侨连四方</div><div class="wrap hero-inner"><h1>${e(labels[t]||t)}</h1><p>${e(sub)}</p>${extra}</div></section>`;
 }
 function listItem(x,t,current){return `<button type="button" class="record-item${current===x.id?' active':''}" data-record-id="${e(x.id)}" aria-pressed="${current===x.id}">${thumb(x,t)}<span class="record-copy"><h3 class="line-clamp">${e(title(x))}</h3><p class="line-clamp">${e(summary(x,t))}</p>${t==='person'?`<span class="chips">${(x.roles||[]).slice(0,2).map(v=>chip(v)).join('')}</span>`:t==='org'?`<span class="chips">${chip(x.kind)}</span>`:''}</span>${arrow()}</button>`}
 function queryText(x){return [x.title,x.summary,x.origin,x.area,x.kind,x.from,x.to,x.date,...(x.aliases||[]),...(x.roles||[]),...(x.residence||[])].filter(Boolean).join(' ').toLowerCase()}
 function toast(msg){let t=$('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.append(t)}t.textContent=msg;t.classList.add('show');clearTimeout(t.timer);t.timer=setTimeout(()=>t.classList.remove('show'),2300)}
 function dialog(name,body){const d=document.createElement('dialog');d.innerHTML=`<div class="dialog-head"><h2>${e(name)}</h2><button class="btn icon-only" data-close aria-label="关闭">${icon('x')}</button></div>${body}`;document.body.append(d);$('[data-close]',d).onclick=()=>d.close();d.addEventListener('close',()=>d.remove());d.showModal();refresh(d);return d}
 const renderers=[];
 function refresh(root=document){window.lucide?.createIcons({root});window.QM_MAP?.mount(root);window.QM_VIEWER?.mount(root);$$('img',root).forEach(img=>{img.addEventListener('error',()=>{const t=img.closest('.thumb');if(t)t.innerHTML=`<div class="no-image">${icon('image-off')}<span>影像暂不可用</span></div>`},{once:true})});renderers.forEach(fn=>fn(root))}
 function backButton(){return `<button class="btn small mobile-detail-back" data-back-list>${icon('arrow-left')} 返回列表</button>`}
 async function directory(t,sub,detail,options={}){
  const items=D[t]||[],params=new URLSearchParams(location.search);let current=items.find(x=>x.id===params.get('id'))||items.find(x=>x.id===options.defaultId)||items[0];let renderVersion=0;
  const filters=options.filters||`<div class="filter-row">${select('地区',t==='person'?['广东','福建','新加坡']:items.map(x=>x.origin||x.kind),'data-filter')}${select('排序',['名称升序','名称降序'],'data-sort')}</div>`;
  $('#app').innerHTML=hero(t,sub,'',options.heroClass||(['person','family'].includes(t)?'compact':''))+`<div class="wrap page-content"><div class="directory ${t}-directory${params.has('id')?' has-selection':''}" data-directory><aside class="directory-side">${t==='family'?'<h2>家族列表</h2>':''}${searchbox(`搜索${labels[t]}名称、关键词…`)}${filters}<div class="list-count"><span data-list-count></span><small>${window.QM_REPO.mode==='demo'?'演示数据':''}</small></div><div class="record-list" data-record-list></div></aside><div class="detail-pane" data-detail></div></div></div>`;
  const host=$('[data-directory]'),list=$('[data-record-list]'),detailHost=$('[data-detail]');
  async function paintDetail(){const v=++renderVersion;window.QM_MAP?.disposeWithin(detailHost);const content=current?await detail(current):empty('当前没有可显示的记录');if(v!==renderVersion)return;detailHost.innerHTML=backButton()+content;refresh(detailHost);$('[data-back-list]',detailHost).onclick=()=>{host.classList.remove('has-selection');history.replaceState(null,'',location.pathname);list.scrollIntoView({block:'start',behavior:'smooth'})};options.afterDetail?.(current,detailHost)}
  function filterText(x){const related=[...resolve('person',x.memberIds||x.personIds),...resolve('place',x.placeIds)];return queryText(x)+' '+related.map(v=>queryText(v)+' '+(v.years||'')).join(' ')}
  function filtered(){let xs=items.filter(x=>filterText(x).includes($('[data-list-search]').value.trim().toLowerCase()));$$('[data-filter]').forEach(s=>{if(s.value)xs=xs.filter(x=>{if(s.dataset.field)return String(x[s.dataset.field]||'').includes(s.value);if(s.value==='近现代')return /1[89]\d\d|近现代|20世纪/.test(filterText(x));return filterText(x).includes(s.value.toLowerCase())})});const s=$('[data-sort]')?.value;if(s)xs.sort((a,b)=>title(a).localeCompare(title(b),'zh-CN')*(s==='名称降序'?-1:1));return xs}
  function paintList(){const xs=filtered();list.innerHTML=xs.map(x=>listItem(x,t,current?.id)).join('')||empty('没有匹配记录');$('[data-list-count]').textContent=`共 ${xs.length} 条${labels[t]}`;refresh(list)}
  list.addEventListener('click',async ev=>{const b=ev.target.closest('[data-record-id]');if(!b)return;current=items.find(x=>x.id===b.dataset.recordId);history.replaceState(null,'','?id='+encodeURIComponent(current.id));host.classList.add('has-selection');paintList();await paintDetail();if(matchMedia('(max-width:899px)').matches&&t==='qiaopi')detailHost.scrollIntoView({block:'start'})});
  $('[data-list-search]').addEventListener('input',paintList);$$('[data-filter],[data-sort]').forEach(s=>s.addEventListener('change',paintList));paintList();await paintDetail();
 }
 async function load(){const ts=['person','family','place','event','org','document','qiaopi'];await Promise.all(ts.map(async t=>{D[t]=await window.QM_REPO.list(t)}));stats=await window.QM_REPO.stats()}
 return {$,$$,e,D,labels,routes,icons,icon,chip,href,get,resolve,title,thumb,media,safeURL,arrow,empty,section,summary,minis,rows,kv,searchbox,select,hero,listItem,queryText,toast,dialog,refresh,directory,backButton,load,get stats(){return stats}};
})();
