/* One workspace shared by the research tab and the standalone route. */
window.QM_WORKBENCH = (() => {
  const MAX_BYTES = 20 * 1024 * 1024, MAX_PIXELS = 40 * 1000 * 1000;
  function draftStore(action, key, value) {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('浏览器未允许保存草稿，请下载结果。')); return; }
      const opening = indexedDB.open('qiaomai-qiaopi-workbench', 1);
      opening.onupgradeneeded = () => { if (!opening.result.objectStoreNames.contains('drafts')) opening.result.createObjectStore('drafts'); };
      opening.onerror = () => reject(new Error('本地草稿无法打开，请下载结果。'));
      opening.onsuccess = () => {
        const db = opening.result, tx = db.transaction('drafts', action === 'get' ? 'readonly' : 'readwrite');
        const store = tx.objectStore('drafts'), request = action === 'get' ? store.get(key) : store.put(value, key);
        let result;
        request.onsuccess = () => { result = request.result; };
        tx.oncomplete = () => { db.close(); resolve(result); };
        tx.onerror = () => { db.close(); reject(new Error('草稿没有保存成功，请下载结果。')); };
        tx.onabort = tx.onerror;
      };
    });
  }
  function confirmAction(message) {
    return new Promise(resolve => {
      const Q = window.QM, dialog = Q.dialog('保留当前内容', `<p>${Q.e(message)}</p><div class="wb-dialog-actions"><button class="btn" data-wb-keep>继续整理</button><button class="btn primary" data-wb-confirm>确认继续</button></div>`);
      let accepted = false;
      dialog.querySelector('[data-wb-keep]').onclick = () => dialog.close();
      dialog.querySelector('[data-wb-confirm]').onclick = () => { accepted = true; dialog.close(); };
      dialog.addEventListener('close', () => resolve(accepted), { once: true });
    });
  }
  async function inspectFile(file) {
    if (!file || !file.size) throw new Error('请选择一张有效的图片。');
    if (file.size > MAX_BYTES) throw new Error('图片超过 20MB，请选择较小的原图文件。');
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const png = [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n);
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
    const type = png ? 'image/png' : jpeg ? 'image/jpeg' : webp ? 'image/webp' : '';
    if (!type) throw new Error('请上传 JPG、PNG 或 WebP 图片；暂不支持 PDF 和 HEIC。');
    const normalized = new File([file], file.name || '侨批图片', { type, lastModified: file.lastModified || Date.now() });
    const url = URL.createObjectURL(normalized);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('图片无法解码，请更换文件。')); img.src = url;
      });
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > MAX_PIXELS) throw new Error('图片尺寸过大，请使用不超过 4000 万像素的图片。');
      return { file: normalized, url, width: image.naturalWidth, height: image.naturalHeight };
    } catch (error) { URL.revokeObjectURL(url); throw error; }
  }
  function mount(root, options = {}) {
    const Q = window.QM, e = Q.e, api = window.QM_REPO.workbench;
    const state = { file: null, url: '', width: 0, height: 0, rotation: 0, zoom: 1, raw: '', original: '', translated: '', translationSource: '', translationEdited: false, versions: [], notes: [], dirty: false, busy: '', revision: 0, readRevision: 0, controller: null, disposed: false, savedAt: '' };
    const draftKey = options.id ? 'record:' + options.id : 'upload';
    root.innerHTML = `<section class="wb" aria-label="侨批工作台"><div class="wb-top"><div><div class="wb-kicker">QIAOPI · READING DESK</div><h2>侨批工作台</h2><p>从一纸家书，读懂跨越山海的牵挂</p></div><div class="wb-primary-actions"><button class="btn primary" data-wb="start">${Q.icon('scan-text')} 开始识别并转译</button><button class="btn" data-wb="cancel" hidden>取消任务</button></div></div><p class="wb-record-label" data-wb-record hidden></p><div class="wb-draft-banner" data-wb-draft hidden><span>发现一份已保存的本地草稿</span><button data-wb="restore">恢复草稿</button><button data-wb="dismiss-draft">暂不恢复</button></div><div class="wb-status" role="status" aria-live="polite" data-wb-status>上传一张侨批图片，开始原文识读与白话转译。</div><div class="wb-grid"><section class="card wb-source" data-wb-source aria-label="原始影像"><div class="wb-panel-head"><span class="wb-step">01</span><h3>原始影像</h3><span class="wb-caption">保留原貌 · 完整呈现</span></div><div class="wb-source-actions"><button class="btn" data-wb="upload">${Q.icon('upload')} 上传图片</button><button class="btn" data-wb="replace" hidden>${Q.icon('replace')} 更换图片</button><input class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="选择侨批图片" data-wb-file tabindex="-1"></div><div class="wb-image-viewport" data-wb-viewport><button class="wb-drop-zone" data-wb="upload" aria-label="上传侨批图片">${Q.icon('image-up')}<strong>上传侨批图片</strong><p>拖放图片到这里，或点击选择文件</p><small>JPG / PNG / WebP · 单张不超过 20MB</small></button><div class="wb-image-surface" data-wb-surface hidden><img class="wb-image" data-wb-image alt="本次上传的侨批原图" draggable="false"></div></div><div class="wb-image-toolbar"><button data-wb="zoom-out" aria-label="缩小原图">${Q.icon('minus')}</button><span class="wb-zoom" data-wb-zoom>100%</span><button data-wb="zoom-in" aria-label="放大原图">${Q.icon('plus')}</button><button data-wb="fit">${Q.icon('maximize')}<span>适应窗口</span></button><button data-wb="rotate" aria-label="顺时针旋转原图">${Q.icon('rotate-cw')}</button><button data-wb="fullscreen" aria-label="全屏查看原图">${Q.icon('expand')}</button></div><div class="wb-file-meta" data-wb-file-meta>文件只在点击识别后提交；上传和结果不会自动公开。</div></section><div class="wb-results"><section class="card wb-text-panel"><div class="wb-panel-head"><span class="wb-step">02</span><h3><label for="wb-original">识别原文</label></h3><div class="wb-text-head-actions"><button data-wb="restore-raw">恢复识别</button><button data-wb="recognize">重新识别</button></div></div><textarea id="wb-original" data-wb-original spellcheck="false" lang="zh" placeholder="识别结果将在这里逐行呈现。也可以手动输入原文，再生成白话转译。"></textarea><div class="wb-notes" data-wb-notes hidden></div><div class="wb-text-foot"><span data-wb-original-count>0 字</span><button data-wb="copy-original">${Q.icon('copy')} 复制原文</button></div></section><section class="card wb-text-panel"><div class="wb-panel-head"><span class="wb-step">03</span><h3><label for="wb-translated">白话转译</label></h3><div class="wb-text-head-actions"><button data-wb="translate">重新转译</button></div></div><textarea id="wb-translated" data-wb-translated spellcheck="false" lang="zh" placeholder="将侨批原文转为易读的现代汉语，保留原有姓名、地名、日期和金额。"></textarea><div class="wb-text-foot"><span data-wb-translation-note>与原文分开保存</span><button data-wb="copy-translated">${Q.icon('copy')} 复制转译</button></div></section></div></div><div class="wb-footer"><span class="wb-local-note" data-wb-save-note>草稿仅保存在当前浏览器</span><div class="wb-footer-actions"><button class="btn" data-wb="save">${Q.icon('save')} 保存草稿</button><button class="btn" data-wb="download-txt">${Q.icon('download')} 下载 TXT</button><button class="btn" data-wb="download-json">下载 JSON</button><button class="btn" data-wb="clear">清空</button></div></div></section>`;
    const $ = selector => root.querySelector(selector), $$ = selector => [...root.querySelectorAll(selector)];
    const original = $('[data-wb-original]'), translated = $('[data-wb-translated]'), viewport = $('[data-wb-viewport]'), surface = $('[data-wb-surface]'), image = $('[data-wb-image]'), fileInput = $('[data-wb-file]');
    let pendingDraft, resizeObserver;
    function message(text, tone = '') { if (!state.disposed) { $('[data-wb-status]').textContent = text; $('[data-wb-status]').dataset.tone = tone; } }
    function textAreaSize(element) {
      if (matchMedia('(max-width:599px)').matches) { element.style.height = 'auto'; element.style.height = Math.max(260, element.scrollHeight) + 'px'; } else element.style.height = '';
    }
    function update() {
      if (state.disposed) return;
      const hasFile = Boolean(state.file), busy = Boolean(state.busy), hasText = Boolean(state.original.trim()), hasOutput = hasText || Boolean(state.translated.trim());
      $$('[data-wb]').forEach(button => {
        const action = button.dataset.wb;
        button.disabled = ['start', 'recognize'].includes(action) ? !hasFile || busy : ['zoom-in', 'zoom-out', 'fit', 'rotate', 'fullscreen'].includes(action) ? !hasFile : action === 'translate' ? !hasText || busy : action === 'restore-raw' ? !state.raw || busy : action === 'copy-original' ? !hasText : action === 'copy-translated' ? !state.translated.trim() : action.startsWith('download') ? !hasOutput : action === 'save' ? !(hasFile || hasOutput) || busy : false;
      });
      $('[data-wb="cancel"]').hidden = !busy;
      $('[data-wb="replace"]').hidden = !hasFile;
      $('[data-wb="upload"]').hidden = hasFile;
      $('.wb-drop-zone').hidden = hasFile;
      surface.hidden = !hasFile;
      original.readOnly = state.busy === 'recognition'; translated.readOnly = state.busy === 'translation';
      if (original.value !== state.original) original.value = state.original;
      if (translated.value !== state.translated) translated.value = state.translated;
      $('[data-wb-original-count]').textContent = Array.from(state.original).length.toLocaleString() + ' 字' + (state.raw && state.original !== state.raw ? ' · 已校订' : '');
      const stale = state.translated && state.translationSource !== state.original;
      $('[data-wb-translation-note]').textContent = stale ? '原文已更新，请重新转译' : state.translated ? Array.from(state.translated).length.toLocaleString() + ' 字 · 白话释读' : '与原文分开保存';
      $('[data-wb-notes]').hidden = !state.notes.length; $('[data-wb-notes]').textContent = state.notes.join('\n');
      $('[data-wb-save-note]').textContent = state.dirty ? '有尚未保存的内容' : state.savedAt ? '已保存到本地 · ' + new Date(state.savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '草稿仅保存在当前浏览器';
      $('[data-wb-zoom]').textContent = Math.round(state.zoom * 100) + '%';
      textAreaSize(original); textAreaSize(translated);
    }
    function renderImage(center = false) {
      if (!state.file || !viewport.clientWidth || !viewport.clientHeight) return;
      const turned = state.rotation % 180 !== 0, w = turned ? state.height : state.width, h = turned ? state.width : state.height;
      const fit = Math.min(Math.max(1, viewport.clientWidth - 32) / w, Math.max(1, viewport.clientHeight - 32) / h);
      surface.style.width = Math.floor(Math.max(viewport.clientWidth - 2, w * fit * state.zoom + 30)) + 'px';
      surface.style.height = Math.floor(Math.max(viewport.clientHeight - 2, h * fit * state.zoom + 30)) + 'px';
      image.style.width = state.width * fit * state.zoom + 'px'; image.style.height = state.height * fit * state.zoom + 'px';
      image.style.transform = `translate(-50%,-50%) rotate(${state.rotation}deg)`;
      if (center) requestAnimationFrame(() => { if (!state.disposed) viewport.scrollTo((viewport.scrollWidth - viewport.clientWidth) / 2, (viewport.scrollHeight - viewport.clientHeight) / 2); });
    }
    function stop(announce = true) {
      state.revision++; state.controller?.abort(); state.controller = null; state.busy = '';
      if (announce) message('任务已取消，原图和已完成的文字已保留。');
      update();
    }
    function resetContent() {
      stop(false); if (state.url) URL.revokeObjectURL(state.url);
      Object.assign(state, { file: null, url: '', width: 0, height: 0, rotation: 0, zoom: 1, raw: '', original: '', translated: '', translationSource: '', translationEdited: false, versions: [], notes: [], savedAt: '' });
      image.removeAttribute('src'); fileInput.value = ''; surface.style.width = surface.style.height = '';
    }
    async function loadFile(file, { force = false, silent = false } = {}) {
      if (!force && state.dirty && (state.original || state.translated) && !await confirmAction('更换图片会清空当前未保存的原文与转译。请先保存草稿或下载；确认更换吗？')) return false;
      const revision = ++state.readRevision;
      const priorText = JSON.stringify([state.original, state.translated]);
      stop(false); message('正在检查图片…', 'busy');
      try {
        const loaded = await inspectFile(file);
        if (state.disposed || revision !== state.readRevision) { URL.revokeObjectURL(loaded.url); return false; }
        if (priorText !== JSON.stringify([state.original, state.translated])) { URL.revokeObjectURL(loaded.url); message('检查图片时文字已修改，本次换图已取消，请保存后重试。'); return false; }
        resetContent(); Object.assign(state, loaded, { dirty: !silent }); image.src = loaded.url;
        $('[data-wb-file-meta]').textContent = `${loaded.file.name} · ${loaded.width} × ${loaded.height} · ${(loaded.file.size / 1024 / 1024).toFixed(2)} MB`;
        message('图片已就绪。点击“开始识别并转译”，或手动整理右侧原文。'); update(); requestAnimationFrame(() => renderImage(true)); return true;
      } catch (error) { if (revision === state.readRevision && !state.disposed) { message(error.message, 'error'); update(); } return false; }
    }
    async function translateResult(revision, signal) {
      const source = state.original;
      state.busy = 'translation'; update(); message('原文已就绪，正在生成白话转译…', 'busy');
      const result = await api.translate(source, signal, stage => { if (revision === state.revision) message(stage + '…', 'busy'); });
      if (state.disposed || revision !== state.revision || source !== state.original) return;
      if (!result.text.trim()) throw new Error('没有返回有效转译，原文已保留，可重新转译。');
      if (state.translated) state.versions = [...state.versions, { text: state.translated, source: state.translationSource, savedAt: new Date().toISOString() }].slice(-5);
      state.translated = result.text; state.translationSource = source; state.translationEdited = false; state.dirty = true;
      message('识读已完成。请对照原图校订姓名、日期和金额，再保存或下载。');
    }
    async function run(kind) {
      if (state.busy || state.disposed) return;
      if (kind !== 'translation' && !state.file) return;
      if (kind === 'translation' && !state.original.trim()) return;
      if ((kind !== 'translation' && (state.original || state.translated) || kind === 'translation' && state.translationEdited) && !await confirmAction(kind === 'translation' ? '重新转译会替换右侧当前转译，旧版本会随草稿保留。确认继续吗？' : '重新识别会替换当前原文和转译。请先保存草稿或下载。确认继续吗？')) return;
      stop(false); const revision = state.revision, controller = new AbortController(); state.controller = controller;
      try {
        if (kind !== 'translation') {
          state.busy = 'recognition'; update(); message('正在识别原文…', 'busy');
          const result = await api.recognize(state.file, state.rotation, controller.signal, stage => { if (revision === state.revision) message(stage + '…', 'busy'); });
          if (state.disposed || revision !== state.revision) return;
          state.raw = result.rawText || result.text; state.original = result.text; state.translated = ''; state.translationSource = ''; state.translationEdited = false;
          state.notes = Array.isArray(result.notes) ? result.notes.filter(x => typeof x === 'string') : [];
          state.dirty = true; update();
          if (!state.original.trim()) { message('没有识别到有效文字，请更换更清晰的图片，或手动输入原文。'); return; }
          if (kind === 'recognition') { message('原文识别完成，可校订后点击“重新转译”。'); return; }
        }
        await translateResult(revision, controller.signal);
      } catch (error) {
        if (!state.disposed && revision === state.revision && error.name !== 'AbortError') message(error.message || '本次识读未完成，请保留草稿后重试。', 'error');
      } finally { if (revision === state.revision) { state.busy = ''; state.controller = null; update(); } }
    }
    function snapshot() {
      return { schemaVersion: 1, qiaopiId: options.id || null, filename: state.file?.name || '', raw_ocr: state.raw, diplomatic_transcription: state.original, normalized_text: null, modern_translation: state.translated, translation_source: state.translationSource, translation_edited: state.translationEdited, translation_stale: Boolean(state.translated && state.translationSource !== state.original), translation_versions: state.versions, reading_notes: state.notes, rotation: state.rotation, savedAt: new Date().toISOString() };
    }
    async function save() {
      const saved = { ...snapshot(), file: state.file, width: state.width, height: state.height };
      const revision = state.revision, contents = JSON.stringify([state.original, state.translated, state.rotation]);
      try {
        await draftStore('put', draftKey, saved);
        if (state.disposed) return;
        if (revision === state.revision && contents === JSON.stringify([state.original, state.translated, state.rotation])) { state.dirty = false; state.savedAt = saved.savedAt; }
        pendingDraft = saved; message('草稿已保存到当前浏览器，可在刷新后恢复。'); update();
      } catch (error) { message(error.message, 'error'); }
    }
    async function restore() {
      if (!pendingDraft) return;
      if (state.dirty && !await confirmAction('恢复草稿会替换当前未保存的内容。确认继续吗？')) return;
      const saved = pendingDraft; ++state.readRevision;
      if (saved.file) { if (!await loadFile(new File([saved.file], saved.filename || '侨批图片', { type: saved.file.type }), { force: true, silent: true })) return; } else resetContent();
      if (state.disposed) return;
      Object.assign(state, { raw: saved.raw_ocr || '', original: saved.diplomatic_transcription || '', translated: saved.modern_translation || '', translationSource: saved.translation_source || '', translationEdited: saved.translation_edited ?? Boolean(saved.modern_translation), versions: saved.translation_versions || [], notes: saved.reading_notes || [], rotation: Number(saved.rotation) || 0, savedAt: saved.savedAt, dirty: false });
      $('[data-wb-draft]').hidden = true; update(); renderImage(true); message('已恢复本地草稿，可继续校订。');
    }
    async function copy(which) {
      const element = which === 'original' ? original : translated;
      try { await navigator.clipboard.writeText(element.value); Q.toast('已复制'); }
      catch { element.focus(); element.select(); message('文字已选中，请按 Ctrl+C 或使用系统复制。'); }
    }
    function download(kind) {
      const data = snapshot();
      const text = kind === 'json' ? JSON.stringify(data, null, 2) : `侨批识读\n文件：${data.filename || '手动原文'}\n保存时间：${data.savedAt}\n\n【机器识别原文】\n${data.raw_ocr}\n\n【校订原文】\n${data.diplomatic_transcription}\n\n【白话转译${data.translation_stale ? '（原文已更新，待重新转译）' : ''}】\n${data.modern_translation}\n\n【释读备注】\n${data.reading_notes.join('\n')}`;
      const blob = new Blob([kind === 'json' ? text : '\uFEFF' + text], { type: kind === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8' }), url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = '侨批识读-' + new Date().toISOString().slice(0,10) + '.' + kind; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      message('已生成下载文件；原文与白话转译分别标注。');
    }
    const actions = {
      upload: () => fileInput.click(), replace: () => fileInput.click(), start: () => run('both'), recognize: () => run('recognition'), translate: () => run('translation'), cancel: () => stop(),
      fit: () => { state.zoom = 1; update(); renderImage(true); },
      'zoom-in': () => { state.zoom = Math.min(4, state.zoom + .25); update(); renderImage(true); },
      'zoom-out': () => { state.zoom = Math.max(.5, state.zoom - .25); update(); renderImage(true); },
      rotate: () => { stop(false); state.rotation = (state.rotation + 90) % 360; state.zoom = 1; state.dirty = true; update(); renderImage(true); },
      fullscreen: () => { const dialog = Q.dialog('侨批原图', `<img src="${e(state.url)}" alt="本次侨批完整原图">`); dialog.classList.add('wb-fullscreen'); },
      'restore-raw': async () => { if (state.original !== state.raw && await confirmAction('恢复机器识别原文会替换当前校订，确认继续吗？')) { stop(false); state.original = state.raw; state.dirty = true; update(); message('已恢复机器识别原文，转译可能需要更新。'); } },
      'copy-original': () => copy('original'), 'copy-translated': () => copy('translated'), save,
      'download-txt': () => download('txt'), 'download-json': () => download('json'), restore,
      'dismiss-draft': () => { $('[data-wb-draft]').hidden = true; },
      clear: async () => { if ((state.file || state.original || state.translated) && !await confirmAction('清空本次工作区？已保存的本地草稿仍会保留。')) return; ++state.readRevision; resetContent(); state.dirty = false; $('[data-wb-file-meta]').textContent = '文件只在点击识别后提交；上传和结果不会自动公开。'; update(); message('工作区已清空，可上传另一张侨批。'); }
    };
    root.addEventListener('click', event => { const button = event.target.closest('[data-wb]'); if (button && !button.disabled) actions[button.dataset.wb]?.(); });
    fileInput.addEventListener('change', () => { const file = fileInput.files?.[0]; fileInput.value = ''; if (file) loadFile(file); });
    const source = $('[data-wb-source]');
    source.addEventListener('dragover', event => { event.preventDefault(); source.dataset.drag = 'true'; });
    source.addEventListener('dragleave', event => { if (!source.contains(event.relatedTarget)) source.dataset.drag = 'false'; });
    source.addEventListener('drop', event => { event.preventDefault(); source.dataset.drag = 'false'; const files = event.dataTransfer?.files; if (files?.length === 1) loadFile(files[0]); else message('每次请选择一张侨批图片。', 'error'); });
    original.addEventListener('input', () => { if (state.busy === 'translation') stop(false); state.original = original.value; state.dirty = true; update(); });
    translated.addEventListener('input', () => { state.translated = translated.value; state.translationSource = state.original; state.translationEdited = true; state.dirty = true; update(); });
    const beforeUnload = event => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    const onResize = () => { state.zoom = 1; renderImage(true); textAreaSize(original); textAreaSize(translated); };
    if (window.ResizeObserver) { resizeObserver = new ResizeObserver(onResize); resizeObserver.observe(viewport); } else window.addEventListener('resize', onResize);
    async function initialize() {
      if (options.id) {
        const record = Q.get('qiaopi', options.id);
        $('[data-wb-record]').hidden = false;
        $('[data-wb-record]').textContent = record ? '当前侨批：' + Q.title(record) : '没有找到指定侨批。可返回侨批库选择，或上传本地图片。';
        if (record) {
          state.original = record.transcription || ''; update();
          const initialRead = state.readRevision;
          const media = Q.media(record);
          if (media?.path) { try { const file = await api.loadImage(media.path, Q.title(record)); if (!state.dirty && !state.disposed && state.readRevision === initialRead) { const text = state.original; if (await loadFile(file, { force: true, silent: true })) { state.original = text; update(); } } } catch (error) { message(error.message, 'error'); } }
          if (!media?.path) message('本件没有可读取的原件图片。可上传本地原图，或先整理已有原文。');
        } else message('指定侨批不存在，当前未加载其他记录。');
      }
      try {
        pendingDraft = await draftStore('get', draftKey);
        if (!state.disposed && pendingDraft) { $('[data-wb-draft]').hidden = false; $('[data-wb-draft] span').textContent = '本地有一份草稿 · ' + new Date(pendingDraft.savedAt).toLocaleString('zh-CN'); }
      } catch { /* Local persistence is optional until the user explicitly saves. */ }
    }
    update(); Q.refresh(root); initialize();
    return { refresh: () => { update(); renderImage(true); }, hasUnsaved: () => state.dirty, destroy() { state.disposed = true; ++state.readRevision; state.controller?.abort(); resizeObserver?.disconnect(); window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('resize', onResize); if (state.url) URL.revokeObjectURL(state.url); root.innerHTML = ''; } };
  }
  return { mount };
})();
