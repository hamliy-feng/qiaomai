window.QM_TREE={
 render(f,generation=2){
  const Q=window.QM,known=Q.resolve('person',f.memberIds),nodes=f.treeNodes||known.map((p,i)=>({id:p.id,personId:p.id,name:p.title,years:p.years,generation:2,relation:'已关联成员',x:(i+1)/(known.length+1)*100}));
  // Missing ancestors are slots, never inferred historical relatives.
  const slots=[{id:'slot-father',name:'父系资料未录入',generation:1,x:35,relation:'暂无资料'},{id:'slot-mother',name:'母系资料未录入',generation:1,x:65,relation:'暂无资料'},{id:'slot-child',name:'后代资料未录入',generation:3,x:50,relation:'暂无资料'}];
  const visible=[...slots,...nodes].filter(n=>n.generation<=generation);const ys={1:8,2:123,3:238};const height=generation===1?105:generation===2?225:340;
  return `<div class="family-tree"><div class="tree-canvas" style="height:${height}px;min-width:${Math.max(680,nodes.length*190)}px"><svg viewBox="0 0 1000 ${height}" preserveAspectRatio="none" aria-hidden="true">${generation>=2?'<path d="M350 86V105H650V86M500 105V123" fill="none" stroke="#b99871" stroke-width="1" stroke-dasharray="4 4"/>':''}${generation===3?'<path d="M500 201V238" fill="none" stroke="#b99871" stroke-width="1" stroke-dasharray="4 4"/>':''}</svg>${visible.map(n=>{const p=Q.get('person',n.personId);return `<${p?'a':'div'} ${p?`href="${Q.href('person',p.id)}"`:''} class="tree-node ${p?'':'unverified'}" style="left:${n.x||50}%;top:${ys[n.generation]}px">${Q.thumb(p||{},'person')}<span><strong>${Q.e(n.name)}</strong><small>${Q.e(n.years||'生卒未详')}<br>${Q.e(n.relation||'')}</small></span></${p?'a':'div'}>`}).join('')}<span class="tree-state">仅展示当前已录入的家族关系资料。</span></div></div>`;
 },
 bind(f,root){root.querySelectorAll('[data-generation]').forEach(b=>b.onclick=()=>{root.querySelectorAll('[data-generation]').forEach(n=>n.classList.toggle('active',b===n));root.querySelector('[data-tree]').innerHTML=this.render(f,Number(b.dataset.generation));window.QM.refresh(root.querySelector('[data-tree]'))})}
};
