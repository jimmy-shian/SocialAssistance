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
  // 全域：透過 GAS 上傳圖片並回傳 gas://image 佔位符（同時寫入 previewCache 以便預覽）
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
  // 全域：目前編輯焦點（供插入連結使用）
  let activeEditable = null;
  // 全域：在開啟 Modal 當下的選取範圍，避免焦點移動導致 selection 消失
  let activeSelStart = null;
  let activeSelEnd = null;

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

  // 預覽：首頁英雄圖（site.index.heroImage）
  function updateHeroPreview(){
    const pv = qs('#sc-hero-preview'); const input = qs('#sc-hero-image'); if (!pv || !input) return;
    const val = (input.value || '').trim();
    if (!val){ pv.style.backgroundImage='none'; pv.textContent='尚未選擇'; return; }
    let url = val;
    if (/^gas:\/\/image\//.test(val)) { const p = previewCache[val]; if (p) url = p; }
    pv.style.backgroundImage = `url('${url}')`;
    pv.style.backgroundSize = 'cover'; pv.style.backgroundPosition = 'center'; pv.textContent = '';
  }

  // ===== Site：Story 多圖預覽與上傳 =====
  function parseStoryImages(){ const ta = qs('#sc-story-images'); return (ta?.value||'').split(/\n+/).map(s=>s.trim()).filter(Boolean); }
  function writeStoryImages(arr){ const ta = qs('#sc-story-images'); if (ta) ta.value = (arr||[]).join('\n'); }
  function renderStoryList(){
    const list = qs('#sc-story-list'); if (!list) return;
    const imgs = parseStoryImages();
    list.innerHTML = '';
    imgs.forEach((url,i)=>{
      const isGas = /^gas:\/\/image\//.test(url); const preview = isGas ? previewCache[url] : null;
      const cell = document.createElement('div');
      cell.className = 'relative h-24 md:h-28 rounded overflow-hidden border border-gray-300 dark:border-gray-700';
      cell.dataset.index = String(i);
      cell.innerHTML = preview
        ? `<img src="${preview}" alt="story${i+1}" class="w-full h-full object-cover opacity-90">
            <div class="absolute inset-0 grid place-items-center bg-black/10 text-[10px] text-white">待發佈</div>`
        : url
          ? `<img src="${url}" alt="story${i+1}" class="w-full h-full object-cover">`
          : `<div class="w-full h-full grid place-items-center bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">無圖片</div>`;
      const ctrls = document.createElement('div');
      ctrls.className = 'absolute top-1 right-1 flex gap-1';
      ctrls.innerHTML = `
        <button type="button" class="sc-story-up bg-yellow-500/90 hover:bg-yellow-600 text-white rounded px-1 text-xs">↑</button>
        <button type="button" class="sc-story-down bg-yellow-500/90 hover:bg-yellow-600 text-white rounded px-1 text-xs">↓</button>
        <button type="button" class="sc-story-del bg-rose-600 hover:bg-rose-700 text-white rounded px-1 text-xs">×</button>`;
      cell.appendChild(ctrls);
      list.appendChild(cell);
    });
  }

  // 預覽：About Team 照片
  function updateTeamPreview(item){
    try {
      const pv = item.querySelector('.tm-photo-preview'); const input = item.querySelector('.ab-team-photo');
      if (!pv || !input) return;
      const val = (input.value||'').trim();
      if (!val){ pv.style.backgroundImage='none'; pv.textContent='尚未選擇'; return; }
      let url = val; if (/^gas:\/\/image\//.test(val) && previewCache[val]) url = previewCache[val];
      pv.style.backgroundImage = `url('${url}')`; pv.style.backgroundSize = 'cover'; pv.style.backgroundPosition = 'center'; pv.textContent = '';
    } catch(e){}
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
    // 未登入則不呼叫安全端點，避免無 token 造成讀不到
    const hasToken = !!(window.DataAPI && window.DataAPI.token && window.DataAPI.token());
    if (!hasToken) { el.textContent = '最後更新：-（請先登入）'; return; }
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
    if (logged) { try { const tip = qs('#admin-header-tip'); if (tip) tip.textContent = '已登入：請從上方資料集下拉選單選擇 About / Providers / Site Content 並開始編輯。'; } catch(e){} }

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
        // 登入成功後更新標頭提示文字
        try { const tip = qs('#admin-header-tip'); if (tip) tip.textContent = '已登入：請從上方資料集下拉選單選擇 About / Providers / Site Content 並開始編輯。'; } catch(e){}
        show(qs('#admin-login'), false);
        show(qs('#admin-panel'), true);
        // 以安全端點讀取目前選擇的資料集並渲染可視化表單
        try { await loadDatasetAndRender(); } catch(e){}
        // 登入後刷新「最後更新」時間
        try { await updateVersionLabel(); } catch(e){}
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
    activeEditable = null;
    document.addEventListener('focusin', (e)=>{
      const el = e.target;
      if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'email' || el.type === 'url')))) {
        activeEditable = el;
      }
    });
    // 先在 mousedown 時保存目前選取範圍（尚未失焦）
    qs('#btn-insert-link')?.addEventListener('mousedown', ()=>{
      try {
        const el = activeEditable; if (el){
          activeSelStart = typeof el.selectionStart==='number' ? el.selectionStart : 0;
          activeSelEnd = typeof el.selectionEnd==='number' ? el.selectionEnd : activeSelStart;
        }
      } catch(e){}
    });
    qs('#btn-insert-link')?.addEventListener('click', ()=>{
      // 若有 Modal，改用 Modal 流程
      if (qs('#link-modal')) { openLinkModal(); return; }
      // Fallback：舊的 prompt 流程
      if (!activeEditable) { alert('請先點選文字輸入區，選取要加連結的文字'); return; }
      const url = prompt('要插入的連結網址？(例如 https://example.com)');
      if (!url) return;
      const el = activeEditable;
      const start = el.selectionStart || 0; const end = el.selectionEnd || start; const val = el.value || '';
      const sel = val.slice(start, end) || url;
      const a = `<a href="${url.replace(/"/g,'%22')}" target="_blank" rel="noopener">${sel}</a>`;
      el.value = val.slice(0,start) + a + val.slice(end);
      try { el.dispatchEvent(new Event('input', { bubbles:true })); } catch(e) {}
      el.focus();
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
  function showLoading(){
    const box = qs('#admin-loading'); if (!box) return;
    box.innerHTML = buildSkeleton();
    box.classList.remove('hidden');
    try { document.querySelectorAll('.admin-collapsible').forEach(sec=> sec.classList.add('hidden')); } catch(e){}
  }
  function hideLoading(){
    const box = qs('#admin-loading'); if (!box) return;
    box.classList.add('hidden');
    box.innerHTML = '';
    // 恢復目前應顯示的視覺化區塊
    try { toggleSections(); } catch(e){}
  }

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
        try { updatePvProvButtonLabelFromSelect(); } catch(e){}
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
    // 重新建立自訂下拉選單內容
    try {
      const menu = qs('#pv-prov-menu');
      if (menu) {
        menu.innerHTML = '';
        Array.from(sel.options).forEach(o=>{
          const b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('data-value', o.value);
          b.className = 'block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200';
          b.textContent = o.textContent || o.value;
          menu.appendChild(b);
        });
      }
      updatePvProvButtonLabelFromSelect();
    } catch(e){}
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
    try { updatePvProvButtonLabelFromSelect(); } catch(e){}
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
    try { updatePvProvButtonLabelFromSelect(); } catch(e){}
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
      try { updatePvProvButtonLabelFromSelect(); } catch(e){}
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
    const teamList = qs('#ab-team-list'); if (teamList) {
      teamList.innerHTML = '';
      const arr = Array.isArray(data.team) ? data.team : [];
      arr.forEach((t,i)=> teamList.appendChild(buildTeamItem(t,i)));
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
    obj.team = Array.from(qs('#ab-team-list')?.children || []).map(el=>{
      const name = el.querySelector('.ab-team-name')?.value?.trim() || '';
      const photo = el.querySelector('.ab-team-photo')?.value?.trim() || '';
      const rolesStr = el.querySelector('.ab-team-roles')?.value || '';
      const roles = rolesStr.split(/[、,，\s]+/).map(s=>s.trim()).filter(Boolean);
      const motto = el.querySelector('.ab-team-motto')?.value?.trim() || '';
      const education = (el.querySelector('.ab-team-edu')?.value || '').split(/\n+/).map(s=>s.trim()).filter(Boolean);
      const experience = (el.querySelector('.ab-team-exp')?.value || '').split(/\n+/).map(s=>s.trim()).filter(Boolean);
      const socials = Array.from(el.querySelectorAll('.ab-team-socials .ab-social-row')).map(r=>({
        name: r.querySelector('.ab-social-name')?.value?.trim() || '',
        href: r.querySelector('.ab-social-href')?.value?.trim() || ''
      })).filter(x=> x.name && x.href);
      return { name, photo, roles, motto, education, experience, socials };
    }).filter(m=> m.name || m.photo || (m.roles||[]).length || m.motto || (m.education||[]).length || (m.experience||[]).length || (m.socials||[]).length);
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
  function buildTeamItem(row={}, idx=0){
    const wrap = document.createElement('div');
    wrap.className = 'p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';
    wrap.dataset.index = String(idx);
    wrap.innerHTML = `
      <div class="grid md:grid-cols-5 gap-2 items-center">
        <input class="ab-team-name rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="姓名" value="${row.name||''}">
        <div class="flex items-center gap-2">
          <input class="ab-team-photo rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="照片連結或 gas://image/..." value="${row.photo||''}">
          <label class="btn-soft btn-blue text-xs cursor-pointer">上傳<input type="file" class="hidden tm-photo-upload" accept="image/*"></label>
        </div>
        <div class="tm-photo-preview h-10 rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 grid place-items-center text-[11px] text-gray-500 dark:text-gray-400">預覽</div>
        <input class="ab-team-roles rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="角色（可複數，頓號或逗號分隔）" value="${Array.isArray(row.roles)?row.roles.join('、'):''}">
        <textarea class="ab-team-motto rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="2" placeholder="座右銘">${toPlainText(row.motto)||''}</textarea>
      </div>
      <div class="grid md:grid-cols-2 gap-2 mt-2">
        <div class="flex flex-col gap-2">
          <label class="text-sm">教育背景</label>
          <textarea class="ab-team-edu rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="4" placeholder="每行一筆">${(row.education||[]).join('\n')}</textarea>
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm">工作經歷</label>
          <textarea class="ab-team-exp rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="4" placeholder="每行一筆">${(row.experience||[]).join('\n')}</textarea>
        </div>
      </div>
      <div class="mt-2">
        <div class="flex items-center justify-between mb-1">
          <label class="text-sm">社群連結</label>
          <button type="button" class="btn-soft btn-green ab-social-add">新增社群連結</button>
        </div>
        <div class="ab-team-socials flex flex-col gap-2">
          ${Array.isArray(row.socials) ? row.socials.map((s,i)=>`
            <div class="ab-social-row flex gap-2 items-center" data-index="${i}">
              <input class="ab-social-name rounded border px-2 py-1 bg-white dark:bg-gray-800 flex-1" placeholder="名稱 (Facebook/Instagram/Line/Threads/YouTube)" value="${s.name||''}">
              <input class="ab-social-href rounded border px-2 py-1 bg-white dark:bg-gray-800 flex-1" placeholder="連結 https://..." value="${s.href||''}">
              <button type="button" class="btn-soft btn-yellow ab-social-up">上移</button>
              <button type="button" class="btn-soft btn-yellow ab-social-down">下移</button>
              <button type="button" class="btn-soft btn-orange ab-social-dup">複製</button>
              <button type="button" class="btn-soft btn-purple ab-social-del">刪除</button>
            </div>
          `).join('') : ''}
        </div>
        <div class="mt-2 flex items-center gap-2 flex-wrap">
          <button type="button" class="btn-soft btn-yellow ab-team-up">上移</button>
          <button type="button" class="btn-soft btn-yellow ab-team-down">下移</button>
          <button type="button" class="btn-soft btn-orange ab-team-dup">複製</button>
          <button type="button" class="btn-soft btn-purple ab-team-del">刪除</button>
        </div>
      </div>
    `;
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
  qs('#ab-add-team')?.addEventListener('click', ()=>{
    const list = qs('#ab-team-list'); if (!list) return;
    const node = buildTeamItem({}, list.children.length); list.appendChild(node);
  });
  qs('#ab-team-list')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if (!btn) return;
    const list = qs('#ab-team-list'); const item = e.target.closest('div[data-index]'); if (!list||!item) return;
    const idx = Array.from(list.children).indexOf(item);
    const play = captureListAnimation(list);
    if (btn.classList.contains('ab-team-del')) { item.remove(); play(); return; }
    if (btn.classList.contains('ab-team-up') && idx>0) { list.insertBefore(item, list.children[idx-1]); play(); flash(item); return; }
    if (btn.classList.contains('ab-team-down') && idx<list.children.length-1) { list.insertBefore(list.children[idx+1], item); play(); flash(item); return; }
    if (btn.classList.contains('ab-team-dup')) { const clone = item.cloneNode(true); list.insertBefore(clone, list.children[idx+1]); play(); flash(clone); return; }
  });
  qs('#ab-team-list')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if (!btn) return;
    const list = qs('#ab-team-list'); const item = e.target.closest('div[data-index]'); if (!list||!item) return;
    const socialList = item.querySelector('.ab-team-socials'); if (!socialList) return;
    const row = e.target.closest('.ab-social-row');
    const idx = row ? Array.from(socialList.children).indexOf(row) : -1;
    if (btn.classList.contains('ab-social-del') && row) { row.remove(); return; }
    if (btn.classList.contains('ab-social-up') && row && idx>0) { socialList.insertBefore(row, socialList.children[idx-1]); flash(row); return; }
    if (btn.classList.contains('ab-social-down') && row && idx<socialList.children.length-1) { socialList.insertBefore(socialList.children[idx+1], row); flash(row); return; }
    if (btn.classList.contains('ab-social-dup') && row) { const clone = row.cloneNode(true); socialList.insertBefore(clone, socialList.children[idx+1]); flash(clone); return; }
  });
  qs('#ab-team-list')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if (!btn) return;
    const item = e.target.closest('div[data-index]'); if (!item) return;
    if (btn.classList.contains('ab-social-add')) {
      const socialList = item.querySelector('.ab-team-socials'); if (!socialList) return;
      const node = document.createElement('div');
      node.className = 'ab-social-row flex gap-2 items-center';
      node.innerHTML = `
        <input class="ab-social-name rounded border px-2 py-1 bg-white dark:bg-gray-800 flex-1" placeholder="名稱">
        <input class="ab-social-href rounded border px-2 py-1 bg-white dark:bg-gray-800 flex-1" placeholder="連結">
        <button type="button" class="btn-soft btn-yellow ab-social-up">上移</button>
        <button type="button" class="btn-soft btn-yellow ab-social-down">下移</button>
        <button type="button" class="btn-soft btn-orange ab-social-dup">複製</button>
        <button type="button" class="btn-soft btn-purple ab-social-del">刪除</button>`;
      socialList.appendChild(node); flash(node);
    }
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
  function buildServiceItem(row={}, idx=0){
    const wrap = document.createElement('div');
    wrap.className = 'p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';
    wrap.dataset.index = String(idx);
    wrap.innerHTML = `
      <div class="grid md:grid-cols-4 gap-2 items-center">
        <input class="sc-svc-title rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="title" value="${row.title||''}">
        <input class="sc-svc-image rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="image" value="${row.image||''}">
        <input class="sc-svc-link rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="link" value="${row.link||''}">
        <div class="flex items-center gap-2 flex-wrap">
          <button type="button" class="btn-soft btn-yellow sc-svc-up">上移</button>
          <button type="button" class="btn-soft btn-yellow sc-svc-down">下移</button>
          <button type="button" class="btn-soft btn-orange sc-svc-dup">複製</button>
          <button type="button" class="btn-soft btn-purple sc-svc-del">刪除</button>
        </div>
      </div>`;
    return wrap;
  }
  function renderSiteEditor(obj){
    const idx = (obj && obj.index) || {};
    const h1 = qs('#sc-hero-title'); if (h1) h1.value = idx.heroTitle || '';
    const h2 = qs('#sc-hero-subtitle'); if (h2) h2.value = toPlainText(idx.heroSubtitle) || '';
    const img = qs('#sc-hero-image'); if (img) img.value = idx.heroImage || '';
    try { updateHeroPreview(); } catch(e){}
    const list = qs('#sc-intro-list'); if (list) {
      list.innerHTML = '';
      const arr = Array.isArray(idx.platformIntro) ? idx.platformIntro : [];
      arr.forEach((it,i)=> {
        // 將 HTML 欄位還原成可編輯文字
        const row = { ...it, text: toPlainText(it.text), details: toPlainText(it.details) };
        list.appendChild(buildIntroItem(row,i));
      });
    }
    // Story
    try {
      const story = idx.story || {};
      const sh = qs('#sc-story-heading'); if (sh) sh.value = story.heading || '';
      const sb = qs('#sc-story-body'); if (sb) sb.value = toPlainText(story.body) || '';
      const si = qs('#sc-story-images'); if (si) si.value = Array.isArray(story.images) ? story.images.join('\n') : '';
      renderStoryList();
    } catch(e){}
    // Services
    try {
      const st = qs('#sc-services-title'); if (st) st.value = idx.servicesTitle || '';
      const sl = qs('#sc-service-list'); if (sl) {
        sl.innerHTML = '';
        const arr = Array.isArray(idx.services) ? idx.services : [];
        arr.forEach((s,i)=> sl.appendChild(buildServiceItem(s,i)));
      }
    } catch(e){}
    // Video
    try {
      const vt = qs('#sc-video-title'); if (vt) vt.value = (idx.video && idx.video.title) || '';
      const vu = qs('#sc-video-url'); if (vu) vu.value = (idx.video && idx.video.url) || '';
    } catch(e){}
  }
  function addBlankIntro(){
    const list = qs('#sc-intro-list'); if (!list) return;
    const node = buildIntroItem({ title:'', image:'', text:'', details:'' }, list.children.length);
    list.appendChild(node);
  }
  function addBlankService(){
    const list = qs('#sc-service-list'); if (!list) return;
    const node = buildServiceItem({ title:'', image:'', link:'' }, list.children.length);
    list.appendChild(node);
  }
  function collectSiteFromUI(){
    const out = { index: {} };
    out.index.heroTitle = qs('#sc-hero-title')?.value?.trim() || '';
    out.index.heroSubtitle = linkifyHtml(qs('#sc-hero-subtitle')?.value || '');
    out.index.heroImage = qs('#sc-hero-image')?.value?.trim() || '';
    out.index.platformIntro = Array.from(qs('#sc-intro-list')?.children || []).map(el=>({
      title: el.querySelector('.sc-intro-title')?.value?.trim() || '',
      image: el.querySelector('.sc-intro-image')?.value?.trim() || '',
      text: linkifyHtml(el.querySelector('.sc-intro-text')?.value || ''),
      details: linkifyHtml(el.querySelector('.sc-intro-details')?.value || '')
    })).filter(x=> x.title || x.text || x.image);
    // Story
    const storyImgs = (qs('#sc-story-images')?.value || '').split(/\n+/).map(s=>s.trim()).filter(Boolean);
    out.index.story = {
      heading: qs('#sc-story-heading')?.value?.trim() || '',
      body: linkifyHtml(qs('#sc-story-body')?.value || ''),
      images: storyImgs.length ? storyImgs : undefined
    };
    // Services
    out.index.servicesTitle = qs('#sc-services-title')?.value?.trim() || '';
    out.index.services = Array.from(qs('#sc-service-list')?.children || []).map(el=>({
      title: el.querySelector('.sc-svc-title')?.value?.trim() || '',
      image: el.querySelector('.sc-svc-image')?.value?.trim() || '',
      link: el.querySelector('.sc-svc-link')?.value?.trim() || ''
    })).filter(x=> x.title || x.image || x.link);
    // Video
    out.index.video = {
      title: qs('#sc-video-title')?.value?.trim() || '',
      url: qs('#sc-video-url')?.value?.trim() || ''
    };
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

  // Site｜服務項目事件
  qs('#sc-add-service')?.addEventListener('click', ()=> addBlankService());
  qs('#sc-service-list')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if (!btn) return;
    const list = qs('#sc-service-list'); const item = e.target.closest('div[data-index]'); if (!list||!item) return;
    const idx = Array.from(list.children).indexOf(item);
    const play = captureListAnimation(list);
    if (btn.classList.contains('sc-svc-del')) { item.remove(); play(); return; }
    if (btn.classList.contains('sc-svc-up') && idx>0) { list.insertBefore(item, list.children[idx-1]); play(); flash(item); return; }
    if (btn.classList.contains('sc-svc-down') && idx<list.children.length-1) { list.insertBefore(list.children[idx+1], item); play(); flash(item); return; }
    if (btn.classList.contains('sc-svc-dup')) { const clone = item.cloneNode(true); list.insertBefore(clone, list.children[idx+1]); play(); flash(clone); return; }
  });

  // Site｜Story 圖片：上傳、刪除、上下移、即時預覽
  qs('#sc-story-upload')?.addEventListener('change', async (e)=>{
    try {
      const files = Array.from(e.target?.files || []); if (!files.length) return;
      const tip = qs('#sc-story-loading'); if (tip) tip.textContent = '上傳中…';
      const arr = parseStoryImages();
      for (const f of files){
        const ph = await uploadFileAndGetPlaceholder(f);
        arr.push(ph);
      }
      writeStoryImages(arr); renderStoryList();
      if (tip) tip.textContent = '已加入（待發佈）';
      setTimeout(()=>{ if (tip) tip.textContent = ''; }, 1200);
      e.target.value = '';
    } catch(err){ if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000); }
  });
  qs('#sc-story-images')?.addEventListener('input', ()=> renderStoryList());
  qs('#sc-story-list')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if (!btn) return;
    const list = qs('#sc-story-list'); if (!list) return;
    const item = e.target.closest('[data-index]'); if (!item) return;
    const idx = Array.from(list.children).indexOf(item);
    const imgs = parseStoryImages();
    const play = captureListAnimation(list);
    if (btn.classList.contains('sc-story-del')) {
      const removed = imgs.splice(idx,1)[0];
      if (removed && previewCache[removed]) delete previewCache[removed];
      writeStoryImages(imgs); renderStoryList(); play(); return;
    }
    if (btn.classList.contains('sc-story-up') && idx>0) {
      const [m] = imgs.splice(idx,1); imgs.splice(idx-1,0,m);
      writeStoryImages(imgs); renderStoryList(); play(); return;
    }
    if (btn.classList.contains('sc-story-down') && idx<imgs.length-1) {
      const [m] = imgs.splice(idx,1); imgs.splice(idx+1,0,m);
      writeStoryImages(imgs); renderStoryList(); play(); return;
    }
  });

  // Site｜首頁首圖欄位與上傳事件
  qs('#sc-hero-image')?.addEventListener('input', ()=> updateHeroPreview());
  qs('#sc-hero-upload')?.addEventListener('change', async (e)=>{
    try {
      const file = e.target?.files?.[0]; if (!file) return;
      const pv = qs('#sc-hero-preview'); const tip = qs('#sc-hero-loading');
      if (pv) pv.classList.add('is-uploading'); if (tip) tip.textContent = '上傳中…';
      const ph = await uploadFileAndGetPlaceholder(file);
      const input = qs('#sc-hero-image'); if (input) { input.value = ph; }
      updateHeroPreview(); if (tip) tip.textContent = '已加入（待發佈）';
      setTimeout(()=>{ if (tip) tip.textContent = ''; }, 1600);
    } catch(err){ if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000); }
    finally { const pv = qs('#sc-hero-preview'); if (pv) pv.classList.remove('is-uploading'); }
  });

  // 初次進入頁面時依下拉狀態顯示/隱藏
  toggleSections();

  // ===== 自訂下拉（資料集與 Provider）與插入連結 Modal =====
  function updateDsButtonLabelFromSelect(){
    try {
      const sel = qs('#ds-select'); const label = qs('#ds-button-label');
      if (!sel || !label) return;
      const v = sel.value;
      const map = { site:'主畫面（siteContent）', about:'關於我們（aboutContent）', providers:'探索資源平台（providers）' };
      label.textContent = map[v] || v;
    } catch(e){}
  }
  function updatePvProvButtonLabelFromSelect(){
    try {
      const sel = qs('#pv-prov-select'); const label = qs('#pv-prov-button-label');
      if (!sel || !label) return;
      const opt = sel.options[sel.selectedIndex];
      label.textContent = (opt && opt.textContent) ? opt.textContent : '請選擇';
    } catch(e){}
  }
  function bindDropdowns(){
    // DS dropdown
    const dsBtn = qs('#ds-button'); const dsMenu = qs('#ds-menu'); const dsSel = qs('#ds-select');
    function openDs(){ if (!dsBtn||!dsMenu) return; dsMenu.classList.remove('opacity-0','scale-95','pointer-events-none'); dsMenu.classList.add('opacity-100','scale-100'); dsBtn.setAttribute('aria-expanded','true'); }
    function closeDs(){ if (!dsBtn||!dsMenu) return; dsMenu.classList.add('opacity-0','scale-95','pointer-events-none'); dsMenu.classList.remove('opacity-100','scale-100'); dsBtn.setAttribute('aria-expanded','false'); }
    dsBtn?.addEventListener('click', (e)=>{ e.stopPropagation(); const isOpen = dsBtn.getAttribute('aria-expanded')==='true'; isOpen? closeDs() : openDs(); });
    dsMenu?.addEventListener('click', (e)=>{
      const b = e.target.closest('button[data-value]'); if (!b || !dsSel) return;
      const val = b.getAttribute('data-value');
      dsSel.value = val;
      // 觸發既有 change 事件邏輯
      try { dsSel.dispatchEvent(new Event('change', { bubbles:true })); } catch(err){}
      updateDsButtonLabelFromSelect();
      closeDs();
    });
    document.addEventListener('click', (e)=>{ if (dsMenu && dsBtn && !dsMenu.contains(e.target) && !dsBtn.contains(e.target)) closeDs(); });
    document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') closeDs(); });

    // Provider dropdown
    const pvBtn = qs('#pv-prov-button'); const pvMenu = qs('#pv-prov-menu'); const pvSel = qs('#pv-prov-select');
    function openPv(){ if (!pvBtn||!pvMenu) return; pvMenu.classList.remove('opacity-0','scale-95','pointer-events-none'); pvMenu.classList.add('opacity-100','scale-100'); pvBtn.setAttribute('aria-expanded','true'); }
    function closePv(){ if (!pvBtn||!pvMenu) return; pvMenu.classList.add('opacity-0','scale-95','pointer-events-none'); pvMenu.classList.remove('opacity-100','scale-100'); pvBtn.setAttribute('aria-expanded','false'); }
    pvBtn?.addEventListener('click', (e)=>{ e.stopPropagation(); const isOpen = pvBtn.getAttribute('aria-expanded')==='true'; isOpen? closePv() : openPv(); });
    pvMenu?.addEventListener('click', (e)=>{
      const b = e.target.closest('button[data-value]'); if (!b || !pvSel) return;
      const val = b.getAttribute('data-value');
      pvSel.value = val;
      try { pvSel.dispatchEvent(new Event('change', { bubbles:true })); } catch(err){}
      updatePvProvButtonLabelFromSelect();
      closePv();
    });
    document.addEventListener('click', (e)=>{ if (pvMenu && pvBtn && !pvMenu.contains(e.target) && !pvBtn.contains(e.target)) closePv(); });
    document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') closePv(); });

    updateDsButtonLabelFromSelect();
    updatePvProvButtonLabelFromSelect();
  }

  // 插入連結 Modal
  function openLinkModal(){
    const modal = qs('#link-modal'); if (!modal) return;
    const url = qs('#link-url'); const txt = qs('#link-text');
    // 預填選取文字
    try {
      const el = activeEditable; if (el){
        const s = typeof el.selectionStart==='number' ? el.selectionStart : 0;
        const e = typeof el.selectionEnd==='number' ? el.selectionEnd : s;
        activeSelStart = s; activeSelEnd = e;
        const val = el.value||''; const sel = val.slice(s,e);
        if (txt) txt.value = sel;
      }
    } catch(err){}
    modal.classList.remove('hidden');
    setTimeout(()=>{ modal.classList.add('open'); }, 0);
    document.documentElement.classList.add('overflow-hidden');
    url?.focus();
  }
  function closeLinkModal(){
    const modal = qs('#link-modal'); if (!modal) return;
    modal.classList.remove('open');
    const hide = ()=> modal.classList.add('hidden');
    modal.addEventListener('transitionend', function onEnd(e){ if (e.target===modal){ modal.removeEventListener('transitionend', onEnd); hide(); } });
    setTimeout(()=>{ hide(); }, 200);
    document.documentElement.classList.remove('overflow-hidden');
  }
  function insertLinkFromModal(){
    if (!activeEditable) { if (window.Toast) Toast.show('請先點選文字輸入區，選取要加連結的文字', 'warning', 2500); closeLinkModal(); return; }
    const el = activeEditable;
    const url = (qs('#link-url')?.value || '').trim(); if (!url) { if (window.Toast) Toast.show('請輸入連結網址', 'error', 2200); return; }
    const textVal = (qs('#link-text')?.value || '').trim();
    const color = qs('#link-color')?.value || '';
    const font = qs('#link-font')?.value || '';
    const sizeKey = qs('#link-size')?.value || '';
    // 將小/中/大映射為實際像素
    const sizePxMap = { sm: 14, md: 16, lg: 18 };
    const sizePx = sizePxMap[sizeKey];
    const start = (activeSelStart!=null ? activeSelStart : (el.selectionStart||0));
    const end = (activeSelEnd!=null ? activeSelEnd : (el.selectionEnd||start));
    const val = el.value || '';
    const sel = textVal || val.slice(start, end) || url;
    const safeHref = url.replace(/"/g,'%22');
    const styles = [];
    if (color) styles.push(`color:${color}`);
    if (font) styles.push(`font-family:${font}`);
    if (sizePx) styles.push(`font-size:${sizePx}px`);
    const styleAttr = styles.length ? ` style="${styles.join(';')}"` : '';
    const a = `<a href="${safeHref}" target="_blank" rel="noopener"${styleAttr}>${sel}</a>`;
    el.value = val.slice(0,start) + a + val.slice(end);
    try { el.dispatchEvent(new Event('input', { bubbles:true })); } catch(e) {}
    el.focus();
    const pos = start + a.length; el.setSelectionRange(pos, pos);
    // 清除暫存選取範圍
    activeSelStart = null; activeSelEnd = null;
    closeLinkModal();
  }
  function bindLinkModal(){
    qs('#link-cancel')?.addEventListener('click', ()=> closeLinkModal());
    qs('#link-insert')?.addEventListener('click', ()=> insertLinkFromModal());
    qs('#link-modal')?.addEventListener('click', (e)=>{ const t=e.target; if (t && (t.id==='link-modal' || t.classList.contains('overlay-bg'))) closeLinkModal(); });
    // 在 Modal 內按 Enter 直接插入（避免換行；此處只有 input/select）
    qs('#link-modal')?.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter') { e.preventDefault(); insertLinkFromModal(); }
    });
    document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') closeLinkModal(); });
  }

  // 綁定自訂下拉與連結 Modal（確保在 DOM 準備之後）
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', ()=>{ bindDropdowns(); bindLinkModal(); }); }
  else { bindDropdowns(); bindLinkModal(); }
})();
