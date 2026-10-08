QM_PAGES.workbench = () => {
  const Q = QM, id = new URLSearchParams(location.search).get('id');
  Q.$('#app').innerHTML = `<div class="wrap workbench-page"><h1 class="sr-only">侨批工作台</h1><div style="display:flex;gap:12px;margin-bottom:18px"><a class="more" href="research.html?tool=qiaopi">${Q.icon('arrow-left')} 返回研究工具</a><a class="more" href="qiaopi.html">浏览侨批库 ${Q.icon('arrow-right')}</a></div><div data-workbench-root></div></div>`;
  const link = Q.$('.nav-links a[href="research.html"]'); if (link) { link.classList.add('active'); link.setAttribute('aria-current', 'page'); }
  window.QM_CURRENT_WORKBENCH = QM_WORKBENCH.mount(Q.$('[data-workbench-root]'), { id });
};
