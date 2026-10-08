import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createProvider } from './provider.mjs';

const MAX_FILE = 20 * 1024 * 1024, TTL = 30 * 60 * 1000;
const id = () => randomBytes(24).toString('base64url');
function problem(status, message) { return Object.assign(new Error(message), { status }); }
async function readBody(request, limit) {
  if (Number(request.headers['content-length'] || 0) > limit) throw problem(413, '文件或文字过大。');
  const chunks = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > limit) throw problem(413, '文件或文字过大。'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
function mimeType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  throw problem(415, '只接受 JPG、PNG 或 WebP 图片。');
}

export function createWorkbenchServer({ provider = null, allowedOrigins = ['https://xn--8sqt71j.wiki'], dailyLimit = 50, trustProxy = false } = {}) {
  const sessions = new Map(), jobs = new Map(), clients = new Map();
  let daily = { date: '', count: 0 }, running = 0;
  function cleanup() {
    const cutoff = Date.now() - TTL;
    for (const [key, session] of sessions) if (session.at < cutoff) sessions.delete(key);
    for (const [key, job] of jobs) if (job.at < cutoff) { job.controller.abort(); jobs.delete(key); }
    for (const [key, client] of clients) if (client.at < Date.now() - 86400000) clients.delete(key);
  }
  const timer = setInterval(cleanup, 60000); timer.unref();
  const server = http.createServer(async (request, response) => {
    const origin = request.headers.origin;
    const send = (status, value) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(JSON.stringify(value)); };
    if (origin && !allowedOrigins.includes(origin)) { send(403, { error: { message: '此来源未获允许。' } }); return; }
    if (origin) { response.setHeader('Access-Control-Allow-Origin', origin); response.setHeader('Vary', 'Origin'); }
    if (request.method === 'OPTIONS') { response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); send(204); return; }
    const path = new URL(request.url, 'http://localhost').pathname.replace(/^\/api/, '');
    try {
      if (path === '/health' && request.method === 'GET') { send(200, { status: 'ok', configured: Boolean(provider) }); return; }
      if (!provider) throw problem(503, '自动识读服务暂不可用，请先保存草稿。');
      cleanup();
      const ip = trustProxy ? String(request.headers['x-forwarded-for'] || request.socket.remoteAddress).split(',')[0].trim() : request.socket.remoteAddress;
      let client = clients.get(ip);
      if (!client || client.at < Date.now() - 86400000) { client = { at: Date.now(), sessions: 0, jobs: 0 }; clients.set(ip, client); }
      if (path === '/sessions' && request.method === 'POST') {
        if (client.sessions >= 20 || sessions.size >= 500) throw problem(429, '本日会话次数较多，请稍后重试。');
        client.sessions++; const token = id(); sessions.set(token, { at: Date.now(), ip, jobs: 0 }); send(201, { sessionToken: token }); return;
      }
      const token = String(request.headers.authorization || '').replace(/^Bearer /, ''), session = sessions.get(token);
      if (!session || session.ip !== ip) throw problem(401, '本次会话已过期，请重新尝试。');
      session.at = Date.now();
      const existing = path.match(/^\/(recognition|translation)-jobs\/([\w-]+)$/) || path.match(/^\/jobs\/([\w-]+)\/(cancel)$/);
      if (existing) {
        const cancel = existing[2] === 'cancel', job = jobs.get(cancel ? existing[1] : existing[2]);
        if (!job || job.session !== token || !cancel && job.kind !== existing[1]) throw problem(404, '本次任务不存在或已过期。');
        if (cancel && request.method === 'POST') { job.controller.abort(); if (['queued', 'running'].includes(job.status)) job.status = 'cancelled'; send(200, { status: job.status }); return; }
        if (!cancel && request.method === 'GET') { send(200, { jobId: job.id, status: job.status, ...(job.status === 'completed' ? { result: job.result } : {}), ...(job.error ? { error: { message: job.error } } : {}) }); return; }
      }
      const kind = path === '/recognition-jobs' ? 'recognition' : path === '/translation-jobs' ? 'translation' : null;
      if (!kind || request.method !== 'POST') throw problem(404, '接口不存在。');
      const today = new Date().toISOString().slice(0, 10); if (daily.date !== today) daily = { date: today, count: 0 };
      if (running >= 2) throw problem(429, '当前识读任务较多，请稍后重试。');
      if (daily.count >= dailyLimit || client.jobs >= 10 || session.jobs >= 10) throw problem(429, '本日识读次数已达上限，原图与草稿仍可整理。');
      let payload;
      if (kind === 'recognition') {
        if (!String(request.headers['content-type']).startsWith('multipart/form-data;')) throw problem(415, '请使用图片上传表单。');
        const body = await readBody(request, MAX_FILE + 65536);
        let form; try { form = await new Request('http://localhost/upload', { method: 'POST', headers: { 'Content-Type': request.headers['content-type'] }, body }).formData(); } catch { throw problem(400, '图片表单格式错误。'); }
        const file = form.get('file'), rotation = Number(form.get('rotation') || 0);
        if (!file || typeof file.arrayBuffer !== 'function' || !file.size || file.size > MAX_FILE) throw problem(413, '请选择一张不超过20MB的有效图片。');
        if (![0, 90, 180, 270].includes(rotation)) throw problem(400, '图片方向参数错误。');
        const bytes = Buffer.from(await file.arrayBuffer()); payload = { bytes, mimeType: mimeType(bytes), rotation };
      } else {
        let json; try { json = JSON.parse((await readBody(request, 100000)).toString()); } catch (error) { if (error.status) throw error; throw problem(400, '转译请求格式错误。'); }
        if (typeof json.text !== 'string' || !json.text.trim() || json.text.length > 16000 || json.target !== 'modern-zh') throw problem(400, '请提供不超过16000字的校订原文。');
        payload = { text: json.text };
      }
      // Recheck after the asynchronous upload; concurrent uploads cannot exceed the cap.
      if (running >= 2 || daily.count >= dailyLimit || client.jobs >= 10 || session.jobs >= 10) throw problem(429, '当前识读额度或并发已达上限，请稍后重试。');
      const job = { id: id(), session: token, kind, at: Date.now(), status: 'running', controller: new AbortController() };
      jobs.set(job.id, job); running++; daily.count++; client.jobs++; session.jobs++;
      const timeout = setTimeout(() => { job.controller.abort(); if (job.status === 'running') { job.status = 'failed'; job.error = '本次识读超时，请重试。'; } }, 170000); timeout.unref();
      Promise.resolve().then(() => kind === 'recognition' ? provider.recognize(payload, job.controller.signal) : provider.translate(payload, job.controller.signal)).then(result => {
        if (job.status !== 'running') return;
        if (typeof result?.text !== 'string') throw new Error('识读没有返回有效文字。');
        job.result = { text: result.text, ...(kind === 'recognition' ? { rawText: result.rawText || result.text, notes: Array.isArray(result.notes) ? result.notes.filter(x => typeof x === 'string') : [] } : {}) }; job.status = 'completed';
      }).catch(() => { if (job.status === 'running') { job.status = 'failed'; job.error = '本次识读未完成，请稍后重试。'; } }).finally(() => { clearTimeout(timeout); payload = null; running--; });
      send(202, { jobId: job.id, status: job.status });
    } catch (error) { send(error.status || 500, { error: { message: error.status ? error.message : '本次请求未完成，请稍后重试。' } }); }
  });
  server.headersTimeout = 15000; server.requestTimeout = 60000;
  server.on('close', () => { clearInterval(timer); for (const job of jobs.values()) job.controller.abort(); sessions.clear(); jobs.clear(); clients.clear(); });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const provider = createProvider({ baseURL: process.env.QM_AI_BASE_URL, apiKey: process.env.QM_AI_KEY, recognitionModel: process.env.QM_OCR_MODEL, translationModel: process.env.QM_TRANSLATION_MODEL });
  const allowedOrigins = (process.env.QM_ALLOWED_ORIGINS || 'https://xn--8sqt71j.wiki,http://127.0.0.1:8767').split(',').map(x => x.trim());
  const server = createWorkbenchServer({ provider, allowedOrigins, dailyLimit: Number(process.env.QM_DAILY_LIMIT) || 50, trustProxy: process.env.QM_TRUST_PROXY === 'true' });
  server.listen(Number(process.env.PORT) || 8787, process.env.QM_BIND || '127.0.0.1', () => console.log('Workbench API ready; provider ' + (provider ? 'configured' : 'not configured') + '.'));
}
