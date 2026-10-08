/* Shared service adapter. Never substitutes sample text for recognition results. */
(() => {
  const config = () => window.QM_WORKBENCH_CONFIG || {};
  let session = '', sessionPending;
  function base() {
    const value = String(config().apiBase || '').replace(/\/$/, '');
    if (!value) throw new Error('自动识读暂不可用，请先保存草稿或手动整理原文。');
    const url = new URL(value, location.href);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('识读服务地址必须使用 HTTPS。');
    return url.href.replace(/\/$/, '');
  }
  async function request(path, options = {}) {
    const controller = new AbortController(), relay = () => controller.abort();
    if (options.signal?.aborted) throw new DOMException('已取消', 'AbortError');
    options.signal?.addEventListener('abort', relay, { once: true });
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
    const response = await fetch(base() + path, { credentials: 'omit', ...options, signal: controller.signal });
    let payload;
    try { payload = await response.json(); } catch { throw new Error('识读服务未返回有效结果。'); }
    if (!response.ok) {
      if (response.status === 401) session = '';
      throw new Error(payload.error?.message || payload.message || '识读请求未能完成，请稍后重试。');
    }
    return payload;
    } catch (error) {
      if (controller.signal.aborted && !options.signal?.aborted) throw new Error('识读服务连接超时，请稍后重试。');
      throw error;
    } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', relay); }
  }
  async function authorize() {
    if (session) return session;
    if (!sessionPending) sessionPending = request('/sessions', { method: 'POST' }).then(x => {
      if (!x.sessionToken) throw new Error('无法建立本次识读会话。');
      session = x.sessionToken; return session;
    }).finally(() => { sessionPending = null; });
    return sessionPending;
  }
  const delay = (ms, signal) => new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('已取消', 'AbortError')); return; }
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    function abort() { clearTimeout(timer); reject(new DOMException('已取消', 'AbortError')); }
    signal.addEventListener('abort', abort, { once: true });
  });
  async function job(kind, body, signal, onStage) {
    const token = await authorize(), headers = { Authorization: 'Bearer ' + token };
    if (signal.aborted) throw new DOMException('已取消', 'AbortError');
    if (!(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
    const created = await request('/' + kind + '-jobs', { method: 'POST', headers, body, signal });
    if (!created.jobId) throw new Error('识读服务未返回任务编号。');
    const id = encodeURIComponent(created.jobId), deadline = Date.now() + (config().timeout || 180000);
    const cancel = () => { request('/jobs/' + id + '/cancel', { method: 'POST', headers, keepalive: true }).catch(() => {}); };
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    try {
      while (Date.now() < deadline) {
        if (signal.aborted) throw new DOMException('已取消', 'AbortError');
        const result = await request('/' + kind + '-jobs/' + id, { headers, signal });
        if (result.status === 'completed') {
          if (typeof result.result?.text !== 'string') throw new Error('本次任务没有返回可用文字。');
          return result.result;
        }
        if (['failed', 'cancelled'].includes(result.status)) throw new Error(result.error?.message || result.error || '本次识读未完成。');
        if (!['queued', 'running'].includes(result.status)) throw new Error('识读服务返回了未知任务状态。');
        onStage?.(result.status === 'queued' ? '正在排队' : kind === 'recognition' ? '正在识别原文' : '正在生成白话转译');
        await delay(Math.max(500, config().pollInterval || 1500), signal);
      }
      cancel(); throw new Error('本次识读用时较长，已停止等待。原图和已完成的原文仍然保留。');
    } finally { signal.removeEventListener('abort', cancel); }
  }
  window.QM_REPO.workbench = {
    configured: () => Boolean(config().apiBase),
    recognize(file, rotation, signal, onStage) {
      const form = new FormData(); form.append('file', file, file.name); form.append('rotation', String(rotation));
      return job('recognition', form, signal, onStage);
    },
    translate(text, signal, onStage) { return job('translation', { text, target: 'modern-zh' }, signal, onStage); },
    async loadImage(url, title) {
      const resolved = new URL(url, location.href);
      if (!['http:', 'https:', 'file:'].includes(resolved.protocol)) throw new Error('原件地址不可用，请上传本地图片。');
      const response = await fetch(resolved.href, { credentials: 'omit' });
      if (!response.ok) throw new Error('本件原图暂时无法读取，请上传本地图片。');
      const blob = await response.blob(); return new File([blob], title || '侨批原件', { type: blob.type });
    }
  };
})();
