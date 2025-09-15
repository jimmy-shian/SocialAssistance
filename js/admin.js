// Admin UI for editing datasets via GAS
(function(){
  function qs(s, r=document){ return r.querySelector(s); }
  function text(el, msg){ if (el) el.textContent = msg||''; }
  function show(el, on){ if(!el) return; el.classList.toggle('hidden', !on); }
  function setBtnLoading(btn, loading=true){
    if (!btn) return;
    if (!btn.dataset.orig) btn.dataset.orig = btn.innerHTML;
    btn.disabled = !!loading;
    btn.classList.toggle('opacity-50', !!loading);
    btn.classList.toggle('cursor-not-allowed', !!loading);
    if (loading) { btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-2 inline-block align-[-2px]" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>` + (btn.textContent || '處理中…'); } else { btn.innerHTML = btn.dataset.orig; }
  }

  // ===== Reorder animation helpers (FLIP) =====
  function captureListAnimation(list){
    if (!list) return ()=>{};
    const rects = new Map();
    Array.from(list.children).forEach(el=> rects.set(el, el.getBoundingClientRect()));
    return function play(){
      Array.from(list.children).forEach(el=>{
        const prev = rects.get(el); if (!prev) return;
        const cur = el.getBoundingClientRect();
        const dx = prev.left - cur.left; const dy = prev.top - cur.top;
        if (dx || dy){ el.animate([{ transform:`translate(${dx}px, ${dy}px)` }, { transform:'none' }], { duration: 220, easing:'ease-out' }); }
      });
    };
  }
  function flash(el){ if (!el) return; el.classList.add('swap-highlight'); setTimeout(()=> el.classList.remove('swap-highlight'), 700); }
  // Preview cache for gas://image placeholders
  const previewCache = (window.__imgPreviewCache = window.__imgPreviewCache || {});

  // ===== Utilities: escape + linkify to safe HTML =====
  function escHtml(str){
    return String(str||'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }
  function linkifyHtml(str){
    const s = String(str||'');
    // 若已含 a/br 標籤，視為已含 HTML，直接回傳（信任後台編輯者）
    if (/<\s*a\b|<\s*br\b/i.test(s)) return s;
    const re = /((https?:\/\/|www\.)[^\s<]+)/gi;
    let out = '';
    let last = 0; let m;
    while ((m = re.exec(s))){
      out += escHtml(s.slice(last, m.index)).replace(/\n/g,'<br>');
      let url = m[0];
      if (url.startsWith('www.')) url = 'https://' + url;
      const disp = escHtml(m[0]);
      const safeHref = url.replace(/"/g, '%22');
      out += `<a href="${safeHref}" target="_blank" rel="noopener" class="link-soft link-orange">${disp}</a>`;
      last = re.lastIndex;
    }
    out += escHtml(s.slice(last)).replace(/\n/g,'<br>');
    return out;
  }
  function toPlainText(html){
    const tmp = document.createElement('div');
    tmp.innerHTML = String(html || '');
    // Convert <br> to \n
    tmp.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    // Add newline after block elements we care about
    tmp.querySelectorAll('p,div,li').forEach(el => el.insertAdjacentText('beforeend','\n'));
    return (tmp.textContent || '').replace(/\u00A0/g,' ').replace(/\n+$/,'').trim();
  }

  const AppConfig = window.AppConfig || { datasets: { about:'aboutContent', providers:'providers', site:'siteContent' }, versionCacheKey:'app_data_version' };
  const DS = AppConfig.datasets || { about:'aboutContent', providers:'providers', site:'siteContent' };
  const VERSION_KEY = AppConfig.versionCacheKey || 'app_data_version';

  function keyFromSelect(){
    const v = (qs('#ds-select')?.value) || 'about';
    if (v === 'about') return DS.about;
    if (v === 'providers') return DS.providers;
    if (v === 'site') return DS.site;
    return v; // fallback
  }

  // ---- GAS secure read（回傳完整 JSON：含 hasData/updatedAt/version/data） ----
  async function postReadRaw(key){
    try {
      const BASE = window.AppConfig?.GAS_BASE_URL || '';
      const EP = window.AppConfig?.endpoints?.read || '';
      const t = window.DataAPI?.token?.() || '';
      if (!BASE || !EP || !t) return null;
      const nonce = Date.now().toString(36);
      const resp = await fetch(BASE + EP, { method:'POST', headers:{ 'Content-Type':'text/plain' }, body: JSON.stringify({ key, token: t, nonce }) });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data || null;
    } catch(e){ return null; }
  }

  // 讀取 GAS 上的最後更新日期與 hasData 標記
  async function readMeta(key){
    try {
      const data = await postReadRaw(key);
      if (!data) return {};
      return { version: data.version, updatedAt: data.updatedAt, hasData: !!data.hasData };
    } catch(e){ return {}; }
  }
  function fmtTime(d){ try{ const dt = (d instanceof Date) ? d : new Date(d); if (isNaN(+dt)) return '-'; const pad=n=>String(n).padStart(2,'0'); return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`; }catch(e){ return '-'; } }
  async function updateVersionLabel(){
    const key = keyFromSelect();
    const el = qs('#ds-version'); if (!el) return;
    el.textContent = '最後更新：讀取中…';
    const meta = await readMeta(key);
    if (meta && (meta.updatedAt || meta.hasData)) {
      const time = meta.updatedAt ? fmtTime(meta.updatedAt) : '-';
      el.innerHTML = `最後更新：${time}${meta.hasData ? ' <span class="text-rose-600">(暫存檔案)</span>' : ''}`;
    } else {
      el.textContent = '最後更新：-';
    }
  }

  function pretty(jsonStr){
    try { return JSON.stringify(JSON.parse(jsonStr), null, 2); } catch(e){ return jsonStr; }
  }
  function setEditor(obj){ qs('#ds-editor').value = JSON.stringify(obj || {}, null, 2); }

  async function init(){
    const hasBase = !!(AppConfig && AppConfig.GAS_BASE_URL);
    show(qs('#gas-url-warning'), !hasBase);

    // Overlay: warning must dismiss on click/Enter/Escape
    const overlay = qs('#admin-warning-overlay');
    const overlayBtn = qs('#admin-warning-dismiss');
    function dismissOverlay(){
      if (!overlay) return;
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden','true');
    }
    // if (overlay) {
    //   overlay.setAttribute('aria-hidden','false');
    //   overlay.addEventListener('click', dismissOverlay);
    //   document.addEventListener('keydown', (e)=>{
    //     if (overlay.classList.contains('hidden')) return;
    //     if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
    //       dismissOverlay();
    //     }
    //   });
    // }
    if (overlayBtn) overlayBtn.addEventListener('click', (e)=>{ e.stopPropagation(); dismissOverlay(); });

    const token = (window.DataAPI && window.DataAPI.token && window.DataAPI.token()) || '';
    const logged = !!token;
    show(qs('#admin-login'), !logged);
    show(qs('#admin-panel'), logged);

    updateVersionLabel();

    const admUsr = qs('#adm-usr');
    const admPwd = qs('#adm-pwd');
    const admBtn = qs('#adm-login');
    qs('#adm-login')?.addEventListener('click', async ()=>{
      const u = qs('#adm-usr')?.value?.trim();
      const p = qs('#adm-pwd')?.value || '';
      const status = qs('#adm-status');
      text(status, '登入中…');
      try {
        setBtnLoading(admBtn, true);
        const res = await window.DataAPI.login(u, p);
        if (!res || !res.ok) { text(status, res && res.message || '登入失敗'); if (window.Toast) Toast.show(res && res.message || '登入失敗', 'error', 3000); setBtnLoading(admBtn, false); return; }
        text(status, '登入成功'); if (window.Toast) Toast.show('登入成功', 'success', 1500);
        show(qs('#admin-login'), false);
        show(qs('#admin-panel'), true);
        // 以安全端點讀取目前選擇的資料集並渲染可視化表單
        try { await loadDatasetAndRender(); } catch(e){}
      } catch(e){ text(status, '錯誤：' + e.message); if (window.Toast) Toast.show('登入錯誤：' + e.message, 'error', 3000); }
      finally { setBtnLoading(admBtn, false); }
    });
    // Enter 送出
    [admUsr, admPwd].forEach(el=> el?.addEventListener('keydown', (ev)=>{ if (ev.key==='Enter'){ ev.preventDefault(); admBtn?.click(); } }));

    qs('#btn-logout')?.addEventListener('click', ()=>{ window.DataAPI.logout(); window.location.reload(); });

    // 切換資料集：自動載入並顯示對應可視化介面
    qs('#ds-select')?.addEventListener('change', async ()=>{
      updateVersionLabel();
      toggleSections();
      try { await loadDatasetAndRender(); } catch(e){}
    });

    // 儲存並同步
    qs('#btn-save-publish')?.addEventListener('click', onSavePublish);

    // 追蹤目前聚焦的輸入元件，供「插入連結」使用
    let activeEditable = null;
    document.addEventListener('focusin', (e)=>{
      const el = e.target;
      if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'email' || el.type === 'url')))) {
        activeEditable = el;
      }
    });
    qs('#btn-insert-link')?.addEventListener('click', ()=>{
      if (!activeEditable) { alert('請先點選文字輸入區，選取要加連結的文字'); return; }
      const url = prompt('要插入的連結網址？(例如 https://example.com)');
      if (!url) return;
      const el = activeEditable;
      const start = el.selectionStart || 0; const end = el.selectionEnd || start; const val = el.value || '';
      const sel = val.slice(start, end) || url;
      const a = `<a href="${url.replace(/"/g,'%22')}" target="_blank" rel="noopener">${sel}</a>`;
      el.value = val.slice(0,start) + a + val.slice(end);
      // 對 textarea 觸發 input 事件以便後續收集到新值
      try { el.dispatchEvent(new Event('input', { bubbles:true })); } catch(e) {}
      el.focus();
      // 將游標放到剛插入連結之後
      const pos = start + a.length; el.setSelectionRange(pos, pos);
    });

    // Update version label when DataAPI bump
    try {
      document.addEventListener((window.DataAPI && window.DataAPI.EVENT) || 'data:updated', updateVersionLabel);
    } catch(e){}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  // ==============================
  // Providers 視覺化編輯器（Beta）
  // ==============================
  function isProvidersSelected(){ return (qs('#ds-select')?.value) === 'providers'; }
  function isAboutSelected(){ return (qs('#ds-select')?.value) === 'about'; }
  function isSiteSelected(){ return (qs('#ds-select')?.value) === 'site'; }
  // 平滑展開/收合區塊
  let __curSectionId = null;
  function currentSectionId(){ if (isProvidersSelected()) return 'providers-visual'; if (isAboutSelected()) return 'about-visual'; if (isSiteSelected()) return 'site-visual'; return null; }
  function asEl(id){ return id ? qs('#'+id) : null; }
  function ensureCollapsible(el){ if (!el) return; el.classList.add('admin-collapsible'); }
  function toggleSections(){
    const ids = ['providers-visual','about-visual','site-visual'];
    ids.forEach(id=> ensureCollapsible(asEl(id)));
    const nextId = currentSectionId();
    if (__curSectionId === nextId) {
      const cur = asEl(nextId); if (cur && cur.classList.contains('hidden')) { cur.classList.remove('hidden'); requestAnimationFrame(()=> cur.classList.add('open')); }
      return;
    }
    const prev = asEl(__curSectionId);
    const next = asEl(nextId);
    if (prev) {
      prev.classList.remove('open');
      const onEnd = (e)=>{ if (e.target === prev) { prev.classList.add('hidden'); prev.removeEventListener('transitionend', onEnd); } };
      prev.addEventListener('transitionend', onEnd);
      setTimeout(()=>{ prev.classList.add('hidden'); }, 260);
    }
    if (next) {
      next.classList.remove('hidden');
      void next.offsetHeight; // reflow
      next.classList.add('open');
    }
    __curSectionId = nextId;
  }
  function getEditorJSON(){ try{ return JSON.parse(qs('#ds-editor')?.value || '{}'); } catch(e){ alert('內部狀態解析失敗'); return {}; } }
  function setEditor(obj){ const ed = qs('#ds-editor'); if (ed) ed.value = JSON.stringify(obj||{}, null, 2); }

  // 載入資料：優先使用 Google Sheet 暫存（若存在），同時顯示 skeleton 動畫
  function buildSkeleton(){
    const sk = [];
    for (let i=0;i<3;i++){
      sk.push(`
        <div class="skeleton-card surface-2">
          <div class="flex items-center gap-3 mb-3">
            <div class="skeleton-avatar skeleton"></div>
            <div class="flex-1">
              <div class="skeleton skeleton-line" style="width: 40%"></div>
              <div class="skeleton skeleton-line" style="width: 24%"></div>
            </div>
          </div>
          <div class="skeleton skeleton-line" style="width: 92%"></div>
          <div class="skeleton skeleton-line" style="width: 76%"></div>
          <div class="skeleton skeleton-line" style="width: 64%"></div>
        </div>`);
    }
    return sk.join('');
  }
  function showLoading(){ const box = qs('#admin-loading'); if (!box) return; box.innerHTML = buildSkeleton(); box.classList.remove('hidden'); }
  function hideLoading(){ const box = qs('#admin-loading'); if (!box) return; box.classList.add('hidden'); box.innerHTML = ''; }

  async function loadDatasetAndRender(){
    const key = keyFromSelect();
    showLoading();
    // 先載入「目前網站的本地資料」
    let payload = (function(){
      if (key === DS.about) return window.aboutContent || {};
      if (key === DS.providers) return window.providersData || {};
      if (key === DS.site) return window.siteContent || {};
      return {};
    })();
    // 若已登入，向 GAS 讀取；若 hasData=true 則優先使用暫存資料
    try {
      if (window.DataAPI && window.DataAPI.token()) {
        const res = await postReadRaw(key);
        if (res && res.ok) {
          const useTemp = !!res.hasData && res.data && typeof res.data === 'object' && Object.keys(res.data).length > 0;
          if (useTemp) payload = res.data;
        }
      }
    } catch(e) { /* ignore */ }

    // 寫入內部編輯器狀態
    setEditor(payload);
    // 渲染對應視覺化介面
    if (isProvidersSelected()) {
      fillProviderSelect(payload);
      const firstKey = Object.keys(payload||{})[0];
      if (firstKey) {
        qs('#pv-prov-select').value = firstKey;
        const p = payload[firstKey] || {};
        renderCasesEditor(p); fillBasicFields(p); renderTimelineEditor(p); refreshCasePreviews();
      } else {
        qs('#pv-cases-list').innerHTML = '';
      }
    } else if (isAboutSelected()) {
      renderAboutEditor(payload || {});
    } else if (isSiteSelected()) {
      renderSiteEditor(payload || {});
    }
    hideLoading();
  }

  function fillProviderSelect(map){
    const sel = qs('#pv-prov-select'); if (!sel) return;
    sel.innerHTML = '';
    const frag = document.createDocumentFragment();
    Object.entries(map||{}).forEach(([id, p])=>{
      const opt = document.createElement('option');
      opt.value = id; opt.textContent = `${p?.name || id} (${id})`;
      frag.appendChild(opt);
    });
    sel.appendChild(frag);
  }

  function renderCasesEditor(provider){
    const list = qs('#pv-cases-list'); if (!list) return;
    list.innerHTML = '';
    const cases = Array.isArray(provider?.cases) ? provider.cases : [];
    cases.forEach((c, idx)=>{ list.appendChild(buildCaseItem(c, idx)); });
    initImgManagers();
  }

  // ===== Provider 基本欄位 =====
  function fillBasicFields(p = {}) {
    const s = (id) => qs(id); // 假設 qs 是 document.querySelector

    const fields = [
      ['#pv-name', p.name],
      ['#pv-category', p.category],
      ['#pv-schedule', p.schedule],
      ['#pv-location', p.location],
      ['#pv-address', p.address],
      ['#pv-gmap', p.gmapUrl],
      ['#pv-lat', (p.coords && typeof p.coords.lat === 'number') ? p.coords.lat : ''],
      ['#pv-lng', (p.coords && typeof p.coords.lng === 'number') ? p.coords.lng : ''],
      ['#pv-desc', toPlainText(p.description)]
    ];
  
    for (const [selector, value] of fields) {
      const el = s(selector);
      if (el) el.value = value || '';
    }
  }
  
  function collectBasicFields(){
    const s = (id)=>qs(id);
    const lat = parseFloat(s('#pv-lat')?.value);
    const lng = parseFloat(s('#pv-lng')?.value);
    const coords = (isFinite(lat) && isFinite(lng)) ? { lat, lng } : undefined;
    return {
      name: s('#pv-name')?.value?.trim() || '',
      category: s('#pv-category')?.value?.trim() || '',
      schedule: s('#pv-schedule')?.value?.trim() || '',
      location: s('#pv-location')?.value?.trim() || '',
      address: s('#pv-address')?.value?.trim() || '',
      gmapUrl: s('#pv-gmap')?.value?.trim() || undefined,
      coords,
      // 描述改為可含連結與跳行
      description: linkifyHtml(s('#pv-desc')?.value || '')
    };
  }

  // ===== Timeline 編輯 =====
  function buildTlItem(row={}, idx=0){
    const wrap = document.createElement('div');
    wrap.className = 'p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';
    wrap.dataset.index = String(idx);
    wrap.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <div class="grid grid-cols-3 gap-2 flex-1">
          <input class="pv-tl-time rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="time" value="${row.time||''}">
          <input class="pv-tl-title rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="title" value="${row.title||''}">
          <textarea class="pv-tl-detail rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="2" placeholder="detail">${toPlainText(row.detail)||''}</textarea>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <button type="button" class="btn-soft btn-yellow pv-tl-up">上移</button>
          <button type="button" class="btn-soft btn-yellow pv-tl-down">下移</button>
          <button type="button" class="btn-soft btn-orange pv-tl-dup">複製</button>
          <button type="button" class="btn-soft btn-purple pv-tl-del">刪除</button>
        </div>
      </div>`;
    return wrap;
  }
  function renderTimelineEditor(provider){
    const list = qs('#pv-tl-list'); if (!list) return;
    list.innerHTML = '';
    const arr = Array.isArray(provider?.timeline) ? provider.timeline : [];
    arr.forEach((t, i) => list.appendChild(buildTlItem(t, i)));
  }
  function addBlankTl(afterIndex){
    const list = qs('#pv-tl-list'); if (!list) return;
    const idx = typeof afterIndex==='number' ? afterIndex+1 : list.children.length;
    const node = buildTlItem({ time:'', title:'', detail:'' }, idx);
    if (idx>=list.children.length) list.appendChild(node); else list.insertBefore(node, list.children[idx]);
  }
  function collectTimeline(){
    const list = qs('#pv-tl-list'); if (!list) return [];
    return Array.from(list.children).map(el=>({
      time: el.querySelector('.pv-tl-time')?.value?.trim() || '',
      title: el.querySelector('.pv-tl-title')?.value?.trim() || '',
      // 細節文字支援連結/換行
      detail: linkifyHtml(el.querySelector('.pv-tl-detail')?.value || '')
    })).filter(x => x.time || x.title || x.detail);
  }

  function buildCaseItem(c={}, idx=0){
    const wrap = document.createElement('div');
    wrap.className = 'p-4 rounded-lg bg-gray-50 dark:bg-gray-800 shadow';
    wrap.dataset.index = String(idx);
    wrap.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="font-semibold">案例 #<span class="case-idx">${idx+1}</span></div>
        <div class="flex items-center gap-2 flex-wrap">
          <button type="button" class="btn-soft btn-yellow pv-move-up">上移</button>
          <button type="button" class="btn-soft btn-yellow pv-move-down">下移</button>
          <button type="button" class="btn-soft btn-orange pv-dup">複製</button>
          <button type="button" class="btn-soft btn-green pv-insert-after">插入</button>
          <button type="button" class="btn-soft btn-purple pv-del">刪除</button>
        </div>
      </div>
      <div class="grid md:grid-cols-2 gap-3 mt-3">
        <label class="text-sm">id（唯一）
          <input class="pv-id w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${c.id||''}">
        </label>
        <label class="text-sm">title（題名）
          <input class="pv-title w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${c.title||''}">
        </label>
      </div>
      <label class="block text-sm mt-2">summary（摘要）
        <textarea class="pv-summary w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="2">${toPlainText(c.summary)||''}</textarea>
      </label>
      <div class="grid md:grid-cols-2 gap-3 mt-2">
        <label class="text-sm">images（每行一個 URL）
          <textarea class="pv-images w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="4">${(Array.isArray(c.images)?c.images:[]).join('\n')}</textarea>
          <div class="pv-imgmgr mt-2">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-gray-500">拖曳縮圖可排序；拖放圖片或貼上網址可新增</span>
              <label class="btn-soft btn-blue text-xs cursor-pointer">上傳圖片<input type="file" class="hidden pv-img-upload" accept="image/*" multiple></label>
            </div>
            <div class="pv-img-list flex flex-wrap gap-2"></div>
          </div>
        </label>
        <label class="text-sm">video（YouTube/Vimeo/MP4）
          <input class="pv-video w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${c.video||''}">
          <div class="pv-video-preview mt-2 aspect-video rounded overflow-hidden bg-gray-200 dark:bg-gray-700 grid place-items-center text-xs text-gray-600 dark:text-gray-300">${c.video? '預覽載入中…' : '輸入影片網址後顯示縮圖'}</div>
        </label>
      </div>
    `;
    return wrap;
  }

  function renumberCases(){
    qs('#pv-cases-list')?.querySelectorAll('div[data-index]')?.forEach((el, i)=>{ el.dataset.index = String(i); const idx = el.querySelector('.case-idx'); if (idx) idx.textContent = String(i+1); });
  }

  function addBlankCase(afterIndex){
    const list = qs('#pv-cases-list'); if (!list) return;
    const idx = typeof afterIndex==='number' ? afterIndex+1 : list.children.length;
    const node = buildCaseItem({ id:'', title:'', summary:'', images:[], video:'' }, idx);
    if (idx>=list.children.length) list.appendChild(node); else list.insertBefore(node, list.children[idx]);
    renumberCases();
  }

  function collectCasesFromUI(){
    const list = qs('#pv-cases-list'); if (!list) return [];
    return Array.from(list.children).map(el=>{
      const get = sel => el.querySelector(sel);
      const imagesText = (get('.pv-images')?.value || '').split(/\n+/).map(s=>s.trim()).filter(Boolean);
      return {
        id: get('.pv-id')?.value?.trim() || '',
        title: get('.pv-title')?.value?.trim() || '',
        // 摘要支援連結/換行
        summary: linkifyHtml(get('.pv-summary')?.value || ''),
        images: imagesText.length? imagesText : undefined,
        video: get('.pv-video')?.value?.trim() || undefined,
      };
    });
  }

  function currentProvidersRef(){
    // 從編輯器取得目前 providers 對象參考
    const root = getEditorJSON();
    return root; // 直接傳回，caller 決定 key
  }

  // Provider change -> render cases
  qs('#pv-prov-select')?.addEventListener('change', ()=>{
    const obj = getEditorJSON();
    const id = qs('#pv-prov-select')?.value;
    const p = obj[id]||{};
    renderCasesEditor(p);
    fillBasicFields(p);
    renderTimelineEditor(p);
    refreshCasePreviews();
  });

  // Add case
  qs('#pv-add-case')?.addEventListener('click', ()=> { addBlankCase(); refreshCasePreviews(); });

  // Timeline buttons (delegated)
  qs('#pv-add-tl')?.addEventListener('click', ()=> addBlankTl());
  qs('#pv-tl-list')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if (!btn) return;
    const item = e.target.closest('div[data-index]') || e.target.closest('#pv-tl-list > div');
    const list = qs('#pv-tl-list'); if (!item || !list) return;
    const idx = Array.from(list.children).indexOf(item);
    const play = captureListAnimation(list);
    if (btn.classList.contains('pv-tl-del')) { item.remove(); play(); return; }
    if (btn.classList.contains('pv-tl-up') && idx>0) { list.insertBefore(item, list.children[idx-1]); play(); flash(item); return; }
    if (btn.classList.contains('pv-tl-down') && idx<list.children.length-1) { list.insertBefore(list.children[idx+1], item); play(); flash(item); return; }
    if (btn.classList.contains('pv-tl-dup')) { const clone = item.cloneNode(true); list.insertBefore(clone, list.children[idx+1]); play(); flash(clone); return; }
  });

  // Delegated actions for cases (move/del/dup/insert)
  qs('#pv-cases-list')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if (!btn) return;
    const item = e.target.closest('div[data-index]'); if (!item) return;
    const list = qs('#pv-cases-list');
    const idx = Array.from(list.children).indexOf(item);
    const play = captureListAnimation(list);
    if (btn.classList.contains('pv-del')) { item.remove(); play(); renumberCases(); return; }
    if (btn.classList.contains('pv-move-up') && idx>0) { list.insertBefore(item, list.children[idx-1]); play(); renumberCases(); flash(item); return; }
    if (btn.classList.contains('pv-move-down') && idx<list.children.length-1) { list.insertBefore(list.children[idx+1], item); play(); renumberCases(); flash(item); return; }
    if (btn.classList.contains('pv-dup')) { const clone = item.cloneNode(true); list.insertBefore(clone, list.children[idx+1]); play(); renumberCases(); refreshCasePreviews(); initImgManagers(); flash(clone); return; }
    if (btn.classList.contains('pv-insert-after')) { addBlankCase(idx); play(); refreshCasePreviews(); initImgManagers(); const node=list.children[idx+1]; flash(node); return; }
  });

  // 影片預覽：YouTube/Vimeo -> 取縮圖；MP4 -> 顯示黑底字樣
  function isYouTube(url){ return /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i.test(url||''); }
  function ytId(url){ const m=(url||'').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i); return m?m[1]:''; }
  function isVimeo(url){ return /vimeo\.com\/(\d+)/i.test(url||''); }
  function vimeoId(url){ const m=(url||'').match(/vimeo\.com\/(\d+)/i); return m?m[1]:''; }
  function posterFrom(url){ if (!url) return ''; if (isYouTube(url)) return `https://i.ytimg.com/vi/${ytId(url)}/hqdefault.jpg`; if (isVimeo(url)) return `https://vumbnail.com/${vimeoId(url)}.jpg`; return ''; }
  function updatePreviewFor(item){
    const url = item.querySelector('.pv-video')?.value || '';
    const box = item.querySelector('.pv-video-preview'); if (!box) return;
    const poster = posterFrom(url);
    if (poster) {
      box.style.backgroundImage = `url('${poster}')`;
      box.style.backgroundSize = 'cover';
      box.style.backgroundPosition = 'center';
      box.textContent = '';
    } else if (/\.mp4($|\?)/i.test(url)) {
      box.style.backgroundImage = 'none'; box.textContent = 'MP4 影片';
    } else {
      box.style.backgroundImage = 'none'; box.textContent = '輸入影片網址後顯示縮圖';
    }
  }
  function refreshCasePreviews(){ qs('#pv-cases-list')?.querySelectorAll('div[data-index]')?.forEach(updatePreviewFor); }
  // 初始化與輸入變動時即時更新
  document.addEventListener('DOMContentLoaded', refreshCasePreviews);
  qs('#pv-cases-list')?.addEventListener('input', (e)=>{ if (e.target && e.target.classList.contains('pv-video')) { const item = e.target.closest('div[data-index]'); if (item) updatePreviewFor(item); } });

  // ===== 圖片管理（排序／上傳／拖放） =====
  function parseImagesFrom(item){
    const ta = item.querySelector('.pv-images');
    const arr = (ta?.value || '').split(/\n+/).map(s=>s.trim()).filter(Boolean);
    return arr;
  }
  function writeImagesTo(item, arr){
    const ta = item.querySelector('.pv-images'); if (!ta) return;
    ta.value = (arr||[]).join('\n');
  }
  function renderImgList(item){
    const list = item.querySelector('.pv-img-list'); if (!list) return;
    const imgs = parseImagesFrom(item);
    list.innerHTML = '';
    imgs.forEach((url, i)=>{
      const cell = document.createElement('div');
      cell.className = 'pv-img-cell relative w-20 h-20 rounded overflow-hidden border border-gray-300 dark:border-gray-700';
      cell.draggable = true;
      cell.dataset.index = String(i);
      const isGas = /^gas:\/\/image\//.test(url);
      const preview = isGas ? previewCache[url] : null;
      if (isGas && preview){
        cell.innerHTML = `
          <img src="${preview}" alt="pending" class="w-full h-full object-cover opacity-90">
          <span class="absolute left-1 bottom-1 text-[10px] px-1 rounded bg-amber-500 text-white">待發佈</span>
          <button type="button" class="pv-img-del absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-5 h-5 text-xs">×</button>
        `;
      } else if (isGas) {
        cell.innerHTML = `
          <div class="w-full h-full grid place-items-center bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">待發佈圖片</div>
          <button type="button" class="pv-img-del absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-5 h-5 text-xs">×</button>
        `;
      } else {
        cell.innerHTML = `
          <img src="${url}" alt="img${i+1}" class="w-full h-full object-cover">
          <button type="button" class="pv-img-del absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-5 h-5 text-xs">×</button>
        `;
      }
      list.appendChild(cell);
    });
  }
  function attachImgManagerEvents(root){
    // Delete
    root.addEventListener('click', (e)=>{
      const btn = e.target.closest('.pv-img-del'); if (!btn) return;
      const item = e.target.closest('.pv-img-cell'); if (!item) return;
      const caseEl = btn.closest('.pv-imgmgr')?.closest('div[data-index]');
      const idx = parseInt(item.dataset.index||'0',10);
      const imgs = parseImagesFrom(caseEl);
      const removed = imgs.splice(idx,1)[0];
      if (removed && previewCache[removed]) delete previewCache[removed];
      writeImagesTo(caseEl, imgs); renderImgList(caseEl);
    });
    // Drag re-order
    let dragSrc = null;
    root.addEventListener('dragstart', (e)=>{ const cell = e.target.closest('.pv-img-cell'); if (!cell) return; dragSrc = cell; e.dataTransfer.effectAllowed='move'; });
    root.addEventListener('dragover', (e)=>{ if (e.target.closest('.pv-img-cell')) { e.preventDefault(); e.dataTransfer.dropEffect='move'; } });
    root.addEventListener('drop', (e)=>{
      const dst = e.target.closest('.pv-img-cell'); if (!dst || !dragSrc) return;
      e.preventDefault();
      const caseEl = dst.closest('.pv-imgmgr')?.closest('div[data-index]');
      const imgs = parseImagesFrom(caseEl);
      const a = parseInt(dragSrc.dataset.index||'0',10);
      const b = parseInt(dst.dataset.index||'0',10);
      if (a===b) return;
      const [m] = imgs.splice(a,1); imgs.splice(b,0,m);
      writeImagesTo(caseEl, imgs); renderImgList(caseEl);
    });
    // Upload via GAS (stores to Sheet, returns placeholder gas://image/<id>/<filename>)
    async function uploadFileAndGetPlaceholder(file){
      const base = (window.AppConfig && window.AppConfig.GAS_BASE_URL) || '';
      const ep = (window.AppConfig && window.AppConfig.endpoints && window.AppConfig.endpoints.uploadImage) || '';
      const t = (window.DataAPI && window.DataAPI.token && window.DataAPI.token()) || '';
      if (!base || !ep || !t) throw new Error('未登入或未設定 GAS');
      const fr = await new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>reject(new Error('讀檔失敗')); r.readAsDataURL(file); });
      const resp = await fetch(base + ep, { method:'POST', headers:{ 'Content-Type':'text/plain' }, body: JSON.stringify({ token: t, dataUrl: fr, filename: file.name }) });
      if (!resp.ok) throw new Error('上傳失敗(' + resp.status + ')');
      const data = await resp.json();
      if (!data || !data.ok || !data.id) throw new Error(data && data.message || '上傳失敗');
      const ph = `gas://image/${data.id}/${data.filename}`;
      previewCache[ph] = fr; // 立刻可見縮圖
      return ph;
    }
    root.addEventListener('change', async (e)=>{
      const up = e.target.closest('.pv-img-upload'); if (!up) return;
      const caseEl = up.closest('.pv-imgmgr')?.closest('div[data-index]'); if (!caseEl) return;
      const files = up.files || [];
      if (!files.length) return;
      up.disabled = true;
      const imgs = parseImagesFrom(caseEl);
      try {
        for (const f of Array.from(files)){
          try {
            const ph = await uploadFileAndGetPlaceholder(f);
            imgs.push(ph);
          } catch(err){ if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000); }
        }
        writeImagesTo(caseEl, imgs); renderImgList(caseEl);
        if (window.Toast) Toast.show('圖片已上傳（待發佈）', 'success', 2500);
      } finally { up.value=''; up.disabled=false; }
    });
    // Drop URL or files to list area
    root.addEventListener('dragover', (e)=>{ if (e.target.closest('.pv-img-list')) { e.preventDefault(); } });
    root.addEventListener('drop', async (e)=>{
      const list = e.target.closest('.pv-img-list'); if (!list) return;
      e.preventDefault();
      const caseEl = list.closest('.pv-imgmgr')?.closest('div[data-index]');
      const imgs = parseImagesFrom(caseEl);
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length){
        for (const f of Array.from(dt.files)){
          try { const ph = await uploadFileAndGetPlaceholder(f); imgs.push(ph); }
          catch(err){ if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000); }
        }
        writeImagesTo(caseEl, imgs); renderImgList(caseEl); if (window.Toast) Toast.show('圖片已上傳（待發佈）', 'success', 2500);
      } else if (dt && dt.getData){
        const text = dt.getData('text') || '';
        if (text) { imgs.push(text.trim()); writeImagesTo(caseEl, imgs); renderImgList(caseEl); }
      }
    });
  }
  // Build manager for newly rendered cases
  function initImgManagers(){
    qs('#pv-cases-list')?.querySelectorAll('div[data-index]')?.forEach(renderImgList);
  }
  // 確保即時綁定（有些情況 admin.js 於 DOMContentLoaded 之後才載入）
  let __IMG_MGR_BOUND = false;
  function bindImgMgrOnce(){ if (!__IMG_MGR_BOUND) { attachImgManagerEvents(document); __IMG_MGR_BOUND = true; } }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindImgMgrOnce);
  } else { bindImgMgrOnce(); }

  // Provider add / delete
  qs('#pv-add-provider')?.addEventListener('click', ()=>{
    const obj = getEditorJSON();
    let id = prompt('請輸入新的 Provider ID（僅英文與數字、連字號）：', 'provider-' + Date.now().toString(36));
    if (!id) return;
    id = id.trim();
    if (obj[id]) { alert('此 ID 已存在'); return; }
    obj[id] = { name:'', category:'', location:'', address:'', description:'', coords: undefined, cases: [], timeline: [] };
    setEditor(obj);
    fillProviderSelect(obj);
    qs('#pv-prov-select').value = id;
    renderCasesEditor(obj[id]); fillBasicFields(obj[id]); renderTimelineEditor(obj[id]);
  });
  qs('#pv-del-provider')?.addEventListener('click', ()=>{
    const id = qs('#pv-prov-select')?.value; if (!id) return;
    const obj = getEditorJSON();
    if (!obj[id]) { alert('此 Provider 不存在'); return; }
    if (!confirm('確定要刪除「' + (obj[id].name || id) + '」？此動作無法復原。')) return;
    delete obj[id];
    setEditor(obj);
    fillProviderSelect(obj);
    const firstKey = Object.keys(obj||{})[0];
    if (firstKey) {
      qs('#pv-prov-select').value = firstKey;
      const p = obj[firstKey];
      renderCasesEditor(p); fillBasicFields(p); renderTimelineEditor(p);
    } else {
      qs('#pv-cases-list').innerHTML = '';
    }
  });

  // 依據目前 UI，將選中的 Provider 回寫到隱藏編輯器對象
  function syncCurrentProviderToEditor(){
    const id = qs('#pv-prov-select')?.value;
    if (!id) return;
    const root = getEditorJSON();
    if (!root[id]) root[id] = {};
    const basic = collectBasicFields();
    root[id] = { ...root[id], ...basic };
    root[id].timeline = collectTimeline();
    root[id].cases = collectCasesFromUI();
    setEditor(root);
  }

  // 儲存＋同步 GitHub
  async function onSavePublish(){
    const key = keyFromSelect();
    const st = qs('#publish-status'); if (st) st.textContent = '儲存並同步中…';
    try {
      setBtnLoading(qs('#btn-save-publish'), true);
      let payload;
      if (isProvidersSelected()) { syncCurrentProviderToEditor(); payload = getEditorJSON(); }
      else if (isAboutSelected()) { payload = collectAboutFromUI(); }
      else if (isSiteSelected()) { payload = collectSiteFromUI(); }
      else { payload = getEditorJSON(); }
      let res = await window.DataAPI.savePublish(key, payload, [key]);
      if (!res || !res.ok) {
        // 退回為僅儲存（無 GitHub）
        try { res = await window.DataAPI.update(key, payload); } catch(err){}
      }
      if (st) st.textContent = (res && res.ok) ? '已完成（儲存' + (res.update?'+同步':'') + '）' : ('失敗：' + (res && res.message || '未知錯誤'));
      if (window.Toast) Toast.show((res && res.ok) ? '已完成儲存' + ((res && res.publishOk===false)?'（發佈未完成）':'') : ('儲存/發佈失敗：' + (res && res.message || '未知錯誤')), (res && res.ok) ? ((res.publishOk===false)?'warning':'success') : 'error', 3500);
      updateVersionLabel();
    } catch(e){ if (st) st.textContent = '錯誤：' + e.message; if (window.Toast) Toast.show('儲存錯誤：' + e.message, 'error', 3000); }
    finally { setBtnLoading(qs('#btn-save-publish'), false); }
  }

  // 僅儲存（不發佈）
  qs('#btn-save-only')?.addEventListener('click', async ()=>{
    const key = keyFromSelect();
    const st = qs('#publish-status'); if (st) st.textContent = '儲存中…';
    try {
      setBtnLoading(qs('#btn-save-only'), true);
      let payload;
      if (isProvidersSelected()) { syncCurrentProviderToEditor(); payload = getEditorJSON(); }
      else if (isAboutSelected()) { payload = collectAboutFromUI(); }
      else if (isSiteSelected()) { payload = collectSiteFromUI(); }
      else { payload = getEditorJSON(); }
      const res = await window.DataAPI.update(key, payload);
      if (st) st.textContent = (res && res.ok) ? '已儲存' : ('儲存失敗：' + (res && res.message || '未知錯誤'));
      if (window.Toast) Toast.show((res && res.ok)?'已儲存':'儲存失敗：' + (res && res.message || '未知錯誤'), (res && res.ok)?'success':'error', 3000);
      updateVersionLabel();
    } catch(e){ if (st) st.textContent = '錯誤：' + e.message; if (window.Toast) Toast.show('儲存錯誤：' + e.message, 'error', 3000); }
    finally { setBtnLoading(qs('#btn-save-only'), false); }
  });

  // ===== About 視覺化 =====
  function buildModelItem(row={}, idx=0){
    const wrap = document.createElement('div');
    wrap.className = 'p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';
    wrap.dataset.index = String(idx);
    wrap.innerHTML = `
      <div class="grid md:grid-cols-4 gap-2">
        <input class="ab-model-title rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="title" value="${row.title||''}">
        <textarea class="ab-model-desc rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="2" placeholder="desc">${toPlainText(row.desc)||''}</textarea>
        <input class="ab-model-href rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="href (可選)" value="${row.href||''}">
        <div class="flex items-center gap-2 flex-wrap">
          <input class="ab-model-linktext rounded border px-2 py-1 bg-white dark:bg-gray-800 flex-1" placeholder="linkText (可選)" value="${row.linkText||''}">
          <!-- 按鈕區：橫向排列 -->
          <div class="flex gap-2 flex-wrap">
            <button type="button" class="btn-soft btn-yellow ab-model-up">上移</button>
            <button type="button" class="btn-soft btn-yellow ab-model-down">下移</button>
            <button type="button" class="btn-soft btn-orange ab-model-dup">複製</button>
            <button type="button" class="btn-soft btn-purple ab-model-del">刪除</button>
          </div>
        </div>
      </div>`;
    return wrap;
  }
  function renderAboutEditor(obj){
    const data = obj || {};
    qs('#ab-hero-title')?.setAttribute('value','');
    const hero = qs('#ab-hero-title'); if (hero) hero.value = data.heroTitle || '';
    const lead = qs('#ab-lead'); if (lead) {
      // 將 HTML 轉回可編輯的多行文字
      lead.value = toPlainText(data.lead || '');
    }
    const list = qs('#ab-model-list'); if (list) {
      list.innerHTML = '';
      const arr = Array.isArray(data.model)? data.model : [];
      arr.forEach((m,i)=> list.appendChild(buildModelItem(m,i)));
    }
    const at = qs('#ab-ach-title'); if (at) at.value = data.achievementsTitle || '';
    const al = qs('#ab-ach-list'); if (al) {
      al.innerHTML = '';
      const arr = Array.isArray(data.achievements)? data.achievements : [];
      arr.forEach((a,i)=> al.appendChild(buildAchItem(a,i)));
    }
  }
  function addBlankModel(afterIndex){
    const list = qs('#ab-model-list'); if (!list) return;
    const idx = typeof afterIndex==='number' ? afterIndex+1 : list.children.length;
    const node = buildModelItem({ title:'', desc:'', href:'', linkText:'' }, idx);
    if (idx>=list.children.length) list.appendChild(node); else list.insertBefore(node, list.children[idx]);
  }
  function collectAboutFromUI(){
    const obj = {};
    obj.heroTitle = qs('#ab-hero-title')?.value?.trim() || '';
    obj.lead = linkifyHtml(qs('#ab-lead')?.value || '');
    obj.model = Array.from(qs('#ab-model-list')?.children || []).map(el=>({
      title: el.querySelector('.ab-model-title')?.value?.trim() || '',
      desc: linkifyHtml(el.querySelector('.ab-model-desc')?.value || ''),
      href: el.querySelector('.ab-model-href')?.value?.trim() || undefined,
      linkText: el.querySelector('.ab-model-linktext')?.value?.trim() || undefined
    })).filter(x=> x.title || x.desc || x.href);
    obj.achievementsTitle = qs('#ab-ach-title')?.value?.trim() || '';
    obj.achievements = Array.from(qs('#ab-ach-list')?.children || []).map(el=>{
      const text = el.querySelector('.ab-ach-text')?.value?.trim() || '';
      const href = el.querySelector('.ab-ach-href')?.value?.trim() || '';
      if (!href) return text;
      return { text, href };
    }).filter(Boolean);
    return obj;
  }
  function buildAchItem(row, idx){
    const isObj = row && typeof row === 'object';
    const wrap = document.createElement('div');
    wrap.className = 'p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';
    wrap.dataset.index = String(idx);
    wrap.innerHTML = `
    <div class="grid md:grid-cols-3 gap-2 items-center">
      <textarea class="ab-ach-text rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="2" placeholder="文字">${isObj ? (row.text||'') : (row||'')}</textarea>
      <input class="ab-ach-href rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="連結（可選）" value="${isObj ? (row.href||'') : ''}">
      <div class="flex items-center gap-2 flex-wrap">
        <button type="button" class="btn-soft btn-yellow ab-ach-up">上移</button>
        <button type="button" class="btn-soft btn-yellow ab-ach-down">下移</button>
        <button type="button" class="btn-soft btn-orange ab-ach-dup">複製</button>
        <button type="button" class="btn-soft btn-purple ab-ach-del">刪除</button>
      </div>
    </div>`;
    return wrap;
  }
  qs('#ab-add-model')?.addEventListener('click', ()=> addBlankModel());
  qs('#ab-model-list')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if (!btn) return;
    const list = qs('#ab-model-list'); const item = e.target.closest('div[data-index]'); if (!list||!item) return;
    const idx = Array.from(list.children).indexOf(item);
    const play = captureListAnimation(list);
    if (btn.classList.contains('ab-model-del')) { item.remove(); play(); return; }
    if (btn.classList.contains('ab-model-up') && idx>0) { list.insertBefore(item, list.children[idx-1]); play(); flash(item); return; }
    if (btn.classList.contains('ab-model-down') && idx<list.children.length-1) { list.insertBefore(list.children[idx+1], item); play(); flash(item); return; }
    if (btn.classList.contains('ab-model-dup')) { const clone = item.cloneNode(true); list.insertBefore(clone, list.children[idx+1]); play(); flash(clone); return; }
  });
  qs('#ab-add-ach')?.addEventListener('click', ()=>{
    const list = qs('#ab-ach-list'); if (!list) return;
    const node = buildAchItem('', list.children.length); list.appendChild(node);
  });
  qs('#ab-ach-list')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if (!btn) return;
    const list = qs('#ab-ach-list'); const item = e.target.closest('div[data-index]'); if (!list||!item) return;
    const idx = Array.from(list.children).indexOf(item);
    const play = captureListAnimation(list);
    if (btn.classList.contains('ab-ach-del')) { item.remove(); play(); return; }
    if (btn.classList.contains('ab-ach-up') && idx>0) { list.insertBefore(item, list.children[idx-1]); play(); flash(item); return; }
    if (btn.classList.contains('ab-ach-down') && idx<list.children.length-1) { list.insertBefore(list.children[idx+1], item); play(); flash(item); return; }
    if (btn.classList.contains('ab-ach-dup')) { const clone = item.cloneNode(true); list.insertBefore(clone, list.children[idx+1]); play(); flash(clone); return; }
  });

  // ===== Site 視覺化 =====
  function buildIntroItem(row={}, idx=0){
    const wrap = document.createElement('div');
    wrap.className = 'p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';
    wrap.dataset.index = String(idx);
    wrap.innerHTML = `
      <div class="grid md:grid-cols-5 gap-2 items-center">
        <input class="sc-intro-title rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="title" value="${row.title||''}">
        <input class="sc-intro-image rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="image" value="${row.image||''}">
        <textarea class="sc-intro-text rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="2" placeholder="text">${toPlainText(row.text)||''}</textarea>
        <textarea class="sc-intro-details rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="2" placeholder="details (可選)">${toPlainText(row.details)||''}</textarea>
        <div class="flex items-center gap-2 flex-wrap">
          <button type="button" class="btn-soft btn-yellow sc-intro-up">上移</button>
          <button type="button" class="btn-soft btn-yellow sc-intro-down">下移</button>
          <button type="button" class="btn-soft btn-orange sc-intro-dup">複製</button>
          <button type="button" class="btn-soft btn-purple sc-intro-del">刪除</button>
        </div>
      </div>`;
    return wrap;
  }
  function renderSiteEditor(obj){
    const idx = (obj && obj.index) || {};
    const h1 = qs('#sc-hero-title'); if (h1) h1.value = idx.heroTitle || '';
    const h2 = qs('#sc-hero-subtitle'); if (h2) h2.value = toPlainText(idx.heroSubtitle) || '';
    const list = qs('#sc-intro-list'); if (list) {
      list.innerHTML = '';
      const arr = Array.isArray(idx.platformIntro) ? idx.platformIntro : [];
      arr.forEach((it,i)=> {
        // 將 HTML 欄位還原成可編輯文字
        const row = { ...it, text: toPlainText(it.text), details: toPlainText(it.details) };
        list.appendChild(buildIntroItem(row,i));
      });
    }
  }
  function addBlankIntro(){
    const list = qs('#sc-intro-list'); if (!list) return;
    const node = buildIntroItem({ title:'', image:'', text:'', details:'' }, list.children.length);
    list.appendChild(node);
  }
  function collectSiteFromUI(){
    const out = { index: {} };
    out.index.heroTitle = qs('#sc-hero-title')?.value?.trim() || '';
    out.index.heroSubtitle = linkifyHtml(qs('#sc-hero-subtitle')?.value || '');
    out.index.platformIntro = Array.from(qs('#sc-intro-list')?.children || []).map(el=>({
      title: el.querySelector('.sc-intro-title')?.value?.trim() || '',
      image: el.querySelector('.sc-intro-image')?.value?.trim() || '',
      text: linkifyHtml(el.querySelector('.sc-intro-text')?.value || ''),
      details: linkifyHtml(el.querySelector('.sc-intro-details')?.value || '')
    })).filter(x=> x.title || x.text || x.image);
    return out;
  }
  qs('#sc-add-intro')?.addEventListener('click', ()=> addBlankIntro());
  qs('#sc-intro-list')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if (!btn) return;
    const list = qs('#sc-intro-list'); const item = e.target.closest('div[data-index]'); if (!list||!item) return;
    const idx = Array.from(list.children).indexOf(item);
    const play = captureListAnimation(list);
    if (btn.classList.contains('sc-intro-del')) { item.remove(); play(); return; }
    if (btn.classList.contains('sc-intro-up') && idx>0) { list.insertBefore(item, list.children[idx-1]); play(); flash(item); return; }
    if (btn.classList.contains('sc-intro-down') && idx<list.children.length-1) { list.insertBefore(list.children[idx+1], item); play(); flash(item); return; }
    if (btn.classList.contains('sc-intro-dup')) { const clone = item.cloneNode(true); list.insertBefore(clone, list.children[idx+1]); play(); flash(clone); return; }
  });

  // 初次進入頁面時依下拉狀態顯示/隱藏
  toggleSections();
})();
