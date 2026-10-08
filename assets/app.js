document.addEventListener('DOMContentLoaded',async()=>{
 const Q=window.QM,page=document.body.dataset.page;
 Q.$('#app').innerHTML='<div class="loading" role="status">正在整理档案…</div>';
 window.QM_NAV();
 try{await Q.load();const renderer=window.QM_PAGES[page];if(!renderer)throw new Error('页面模块未加载');await renderer();Q.refresh();document.body.dataset.ready="true"}
 catch(err){console.error(err);Q.$('#app').innerHTML=`<section class="wrap card error-card"><h2>资料暂时无法载入</h2><p style="margin:14px 0">${Q.e(QM_REPO.mode==='backend'?'数据库服务暂不可用，请稍后重试。':err.message)}</p><button class="btn" onclick="location.reload()">重新载入</button></section>`;Q.refresh();document.body.dataset.ready="true"}
});
