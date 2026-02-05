/**
 * admin.js
 * 
 * [功能說明]
 * 此檔案是「管理後台」的 UI 邏輯核心。
 * 1. 管理視覺化編輯器 (Visual Editors)：包含 About, Providers, Site, Blog 等區塊的渲染與事件綁定。
 * 2. 處理資料收集：將 UI 上的輸入值 (Input/Textarea) 轉換回 JSON 格式 (`collectData`)。
 * 3. 圖片上傳：處理圖片拖拉、上傳至 GAS 並取得預覽連結。
 * 4. 預覽功能：即時預覽 (Live Preview) 的邏輯。
 * 
 * [關聯檔案]
 * - 依賴 `js/data-loader.js` (DataAPI) 進行資料儲存與讀取。
 * - 對應 `admin.html` 的 DOM 結構。
 * 
 * [修改指南]
 * - 若新增資料欄位，需同步修改：
 *   1. `renderXxxEditor`: 將資料填入 Input。
 *   2. `collectXxxFromUI`: 將 Input 值存回 JSON。
 */
// Admin UI for editing datasets via GAS
(function () {
  function qs(s, r = document) { return r.querySelector(s); }
  function text(el, msg) { if (el) el.textContent = msg || ''; }
  function show(el, on) { if (!el) return; el.classList.toggle('hidden', !on); }
  function setBtnLoading(btn, loading = true) {
    if (!btn) return;
    if (!btn.dataset.orig) btn.dataset.orig = btn.innerHTML;
    btn.disabled = !!loading;
    btn.classList.toggle('opacity-50', !!loading);
    btn.classList.toggle('cursor-not-allowed', !!loading);
    if (loading) { btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-2 inline-block align-[-2px]" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>` + (btn.textContent || '處理中…'); } else { btn.innerHTML = btn.dataset.orig; }
  }

  // ===== Reorder animation helpers (FLIP) =====
  function captureListAnimation(list) {
    if (!list) return () => { };
    const rects = new Map();
    Array.from(list.children).forEach(el => rects.set(el, el.getBoundingClientRect()));
    return function play() {
      Array.from(list.children).forEach(el => {
        const prev = rects.get(el); if (!prev) return;
        const cur = el.getBoundingClientRect();
        const dx = prev.left - cur.left; const dy = prev.top - cur.top;
        if (dx || dy) { el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 220, easing: 'ease-out' }); }
      });
    };
  }
  function flash(el) { if (!el) return; el.classList.add('swap-highlight'); setTimeout(() => el.classList.remove('swap-highlight'), 700); }
  // Preview cache for gas://image placeholders
  const previewCache = (window.__imgPreviewCache = window.__imgPreviewCache || {});
  // 全域：透過 GAS 上傳圖片並回傳 gas://image 佔位符（同時寫入 previewCache 以便預覽）
  async function uploadFileAndGetPlaceholder(file) {
    const base = (window.AppConfig && window.AppConfig.GAS_BASE_URL) || '';
    const ep = (window.AppConfig && window.AppConfig.endpoints && window.AppConfig.endpoints.uploadImage) || '';
    const t = (window.DataAPI && window.DataAPI.token && window.DataAPI.token()) || '';
    if (!base || !ep || !t) throw new Error('未登入或未設定 GAS');
    const fr = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(new Error('讀檔失敗')); r.readAsDataURL(file); });
    const resp = await fetch(base + ep, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ token: t, dataUrl: fr, filename: file.name }) });
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
  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function linkifyHtml(str) {
    const s = String(str || '');
    // 若已含 a/br 標籤，視為已含 HTML，直接回傳（信任後台編輯者）
    if (/<\s*a\b|<\s*br\b/i.test(s)) return s;
    const re = /((https?:\/\/|www\.)[^\s<]+)/gi;
    let out = '';
    let last = 0; let m;
    while ((m = re.exec(s))) {
      out += escHtml(s.slice(last, m.index)).replace(/\n/g, '<br>');
      let url = m[0];
      if (url.startsWith('www.')) url = 'https://' + url;
      const disp = escHtml(m[0]);
      const safeHref = url.replace(/"/g, '%22');
      out += `<a href="${safeHref}" target="_blank" rel="noopener" class="link-soft text-[var(--primary)]">${disp}</a>`;
      last = re.lastIndex;
    }
    out += escHtml(s.slice(last)).replace(/\n/g, '<br>');
    return out;
  }
  function toPlainText(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = String(html || '');
    // Convert <br> to \n
    tmp.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    // Add newline after block elements we care about
    tmp.querySelectorAll('p,div,li').forEach(el => el.insertAdjacentText('beforeend', '\n'));
    return (tmp.textContent || '').replace(/\u00A0/g, ' ').replace(/\n+$/, '').trim();
  }

  // Ensure Font Awesome (for icon-only control buttons)
  function ensureFontAwesome() {
    try {
      const href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css';
      const ok = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(l => {
        const u = l.href || '';
        return u.includes('font-awesome') || u.includes('/all.min.css') || u.includes('cdnjs.cloudflare.com/ajax/libs/font-awesome');
      });
      if (!ok) {
        const link = document.createElement('link');
        link.rel = 'stylesheet'; link.href = href;
        document.head.appendChild(link);
      }
    } catch (e) { }
  }

  // Helper: 根據原圖比例計算預覽高度（約為原圖在目前寬度下高度的 70%）
  function setPreviewHeightFromImage(pv, url, factor) {
    try {
      if (!pv || !url) return;
      factor = factor || 0.7;
      const img = new Image();
      img.onload = function () {
        const ar = (img.naturalHeight && img.naturalWidth) ? (img.naturalHeight / img.naturalWidth) : 0.5625;
        pv.dataset.ar = String(ar);
        const w = pv.clientWidth || pv.offsetWidth || 300;
        pv.style.height = Math.round(w * ar * factor) + 'px';
      };
      img.onerror = function () { pv.style.height = ''; pv.style.minHeight = '12rem'; };
      img.src = url;
    } catch (e) { }
  }
  function recalcPreviewHeights() {
    try {
      const boxes = document.querySelectorAll('.tm-photo-preview,.sc-intro-preview,.sc-svc-preview,#sc-hero-preview,.sc-story-cell');
      boxes.forEach(pv => {
        const ar = parseFloat(pv.dataset.ar || '');
        if (!isFinite(ar) || !ar) return;
        const w = pv.clientWidth || pv.offsetWidth || 300;
        pv.style.height = Math.round(w * ar * 0.7) + 'px';
      });
    } catch (e) { }
  }
  window.addEventListener('resize', () => { try { recalcPreviewHeights(); } catch (e) { } });

  // 已移除：欄位說明改以 <label> 包裹，不再需要自動插入 caption。

  // 預覽：首頁英雄圖（site.index.heroImage）
  function updateHeroPreview() {
    const pv = qs('#sc-hero-preview'); const input = qs('#sc-hero-image'); if (!pv || !input) return;
    const val = (input.value || '').trim();
    if (!val) { pv.style.backgroundImage = 'none'; pv.textContent = '尚未選擇'; return; }
    let url = val;
    if (/^gas:\/\/image\//.test(val)) { const p = previewCache[val]; if (p) url = p; }
    pv.style.backgroundImage = `url('${url}')`;
    pv.style.backgroundSize = 'cover'; pv.style.backgroundPosition = 'center'; pv.textContent = '';
    setPreviewHeightFromImage(pv, url, 0.7);
  }

  // ===== Site：Story 多圖預覽與上傳 =====
  function parseStoryImages() { const ta = qs('#sc-story-images'); return (ta?.value || '').split(/\n+/).map(s => s.trim()).filter(Boolean); }
  function writeStoryImages(arr) { const ta = qs('#sc-story-images'); if (ta) ta.value = (arr || []).join('\n'); }
  function renderStoryList() {
    const list = qs('#sc-story-list'); if (!list) return;
    const imgs = parseStoryImages();
    list.innerHTML = '';
    imgs.forEach((url, i) => {
      const isGas = /^gas:\/\/image\//.test(url); const preview = isGas ? previewCache[url] : null;
      const cell = document.createElement('div');
      cell.className = 'sc-story-cell drag-transition relative h-40 md:h-52 rounded overflow-hidden border border-gray-300 dark:border-gray-700 cursor-move';
      cell.draggable = true;
      cell.dataset.index = String(i);
      cell.innerHTML = preview
        ? `<img src="${preview}" alt="story${i + 1}" class="w-full h-full object-cover opacity-90">
            <div class="absolute inset-0 grid place-items-center bg-black/10 text-[10px] text-white">待發佈</div>`
        : url
          ? `<img src="${url}" alt="story${i + 1}" class="w-full h-full object-cover">`
          : `<div class="w-full h-full grid place-items-center bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">無圖片</div>`;
      const ctrls = document.createElement('div');
      ctrls.className = 'absolute top-1 right-1 flex gap-1';
      ctrls.innerHTML = `
        <button type="button" class="sc-story-up bg-yellow-500/90 hover:bg-yellow-600 text-white rounded px-1 text-xs">↑</button>
        <button type="button" class="sc-story-down bg-yellow-500/90 hover:bg-yellow-600 text-white rounded px-1 text-xs">↓</button>
        <button type="button" class="sc-story-del bg-rose-600 hover:bg-rose-700 text-white rounded px-1 text-xs">×</button>`;
      cell.appendChild(ctrls);
      list.appendChild(cell);
      // 動態依原圖比例設定高度（約 70%）
      const calcSrc = preview || url;
      if (calcSrc) setPreviewHeightFromImage(cell, calcSrc, 0.7);
    });
  }

  // 預覽：About Team 照片
  function updateTeamPreview(item) {
    try {
      const pv = item.querySelector('.tm-photo-preview'); const input = item.querySelector('.ab-team-photo');
      if (!pv || !input) return;
      const val = (input.value || '').trim();
      if (!val) { pv.style.backgroundImage = 'none'; pv.textContent = '尚未選擇'; return; }
      let url = val; if (/^gas:\/\/image\//.test(val) && previewCache[val]) url = previewCache[val];
      pv.style.backgroundImage = `url('${url}')`; pv.style.backgroundSize = 'cover'; pv.style.backgroundPosition = 'center'; pv.textContent = '';
      setPreviewHeightFromImage(pv, url, 0.7);
    } catch (e) { }
  }

  // 預覽：Site 平台導覽/服務 圖片
  function updateIntroPreview(item) {
    try {
      const pv = item.querySelector('.sc-intro-preview'); const input = item.querySelector('.sc-intro-image');
      if (!pv || !input) return;
      const val = (input.value || '').trim();
      if (!val) { pv.style.backgroundImage = 'none'; pv.textContent = '尚未選擇'; return; }
      let url = val; if (/^gas:\/\/image\//.test(val) && previewCache[val]) url = previewCache[val];
      pv.style.backgroundImage = `url('${url}')`; pv.style.backgroundSize = 'cover'; pv.style.backgroundPosition = 'center'; pv.textContent = '';
      setPreviewHeightFromImage(pv, url, 0.7);
    } catch (e) { }
  }
  function updateServicePreview(item) {
    try {
      const pv = item.querySelector('.sc-svc-preview'); const input = item.querySelector('.sc-svc-image');
      if (!pv || !input) return;
      const val = (input.value || '').trim();
      if (!val) { pv.style.backgroundImage = 'none'; pv.textContent = '尚未選擇'; return; }
      let url = val; if (/^gas:\/\/image\//.test(val) && previewCache[val]) url = previewCache[val];
      pv.style.backgroundImage = `url('${url}')`; pv.style.backgroundSize = 'cover'; pv.style.backgroundPosition = 'center'; pv.textContent = '';
      setPreviewHeightFromImage(pv, url, 0.7);
    } catch (e) { }
  }

  const AppConfig = window.AppConfig || { datasets: { about: 'aboutContent', providers: 'providers', site: 'siteContent' }, versionCacheKey: 'app_data_version' };
  const DS = AppConfig.datasets || { about: 'aboutContent', providers: 'providers', site: 'siteContent' };
  const VERSION_KEY = AppConfig.versionCacheKey || 'app_data_version';

  function keyFromSelect() {
    const v = (qs('#ds-select')?.value) || 'about';
    if (v === 'about') return DS.about;
    if (v === 'providers') return DS.providers;
    if (v === 'site') return DS.site;
    return v; // fallback
  }

  // ---- GAS secure read（回傳完整 JSON：含 hasData/updatedAt/version/data） ----
  async function postReadRaw(key) {
    try {
      const BASE = window.AppConfig?.GAS_BASE_URL || '';
      const EP = window.AppConfig?.endpoints?.read || '';
      const t = window.DataAPI?.token?.() || '';
      if (!BASE || !EP || !t) return null;
      const nonce = Date.now().toString(36);
      const resp = await fetch(BASE + EP, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ key, token: t, nonce }) });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data || null;
    } catch (e) { return null; }
  }

  // 讀取 GAS 上的最後更新日期與 hasData 標記
  async function readMeta(key) {
    try {
      const data = await postReadRaw(key);
      if (!data) return {};
      return { version: data.version, updatedAt: data.updatedAt, hasData: !!data.hasData, message: data.message };
    } catch (e) { return {}; }
  }
  function fmtTime(d) { try { const dt = (d instanceof Date) ? d : new Date(d); if (isNaN(+dt)) return '-'; const pad = n => String(n).padStart(2, '0'); return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`; } catch (e) { return '-'; } }
  async function updateVersionLabel() {
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
    }
    else if (meta.message == "token 已過期") {
      el.textContent = '最後更新：-（請重登入）';
    }
    else {
      el.textContent = '最後更新：-';
    }
  }

  function pretty(jsonStr) {
    try { return JSON.stringify(JSON.parse(jsonStr), null, 2); } catch (e) { return jsonStr; }
  }
  function setEditor(obj) { qs('#ds-editor').value = JSON.stringify(obj || {}, null, 2); }

  async function init() {
    const hasBase = !!(AppConfig && AppConfig.GAS_BASE_URL);
    show(qs('#gas-url-warning'), !hasBase);

    // Overlay: warning must dismiss on click/Enter/Escape
    const overlay = qs('#admin-warning-overlay');
    const overlayBtn = qs('#admin-warning-dismiss');
    function dismissOverlay() {
      if (!overlay) return;
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');

      // 儲存今天的日期到 localStorage
      const today = new Date().toISOString().slice(0, 10); // '2025-09-16'
      localStorage.setItem('admin-warning-dismissed-date', today);
      console.log('dismissed today', today);
    }

    function shouldShowOverlayToday() {
      const today = new Date().toISOString().slice(0, 10);
      const dismissedDate = localStorage.getItem('admin-warning-dismissed-date');
      if (dismissedDate !== today) return console.log('should show overlay today'), true;
      return console.log('should not show overlay today'), false;
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
    if (overlay && shouldShowOverlayToday()) {
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden', 'false');
    } else {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (overlayBtn) overlayBtn.addEventListener('click', (e) => { e.stopPropagation(); dismissOverlay(); });

    const token = (window.DataAPI && window.DataAPI.token && window.DataAPI.token()) || '';
    const logged = !!token;
    show(qs('#admin-login'), !logged);
    show(qs('#admin-panel'), logged);
    if (logged) { try { const tip = qs('#admin-header-tip'); if (tip) tip.textContent = '已登入：請從上方資料集下拉選單選擇 About / Providers / Site Content 並開始編輯。'; } catch (e) { } }

    // Inject Font Awesome for icon buttons
    ensureFontAwesome();

    // 還原上次選擇的資料集
    try {
      const sel = qs('#ds-select');
      const saved = localStorage.getItem('admin_ds_selected');
      if (sel && saved) {
        const values = Array.from(sel.options).map(o => o.value);
        if (values.includes(saved)) { sel.value = saved; try { updateDsButtonLabelFromSelect(); } catch (e) { } }
      }
    } catch (e) { }

    updateVersionLabel();
    // 若已登入且是直接刷新頁面，主動載入並渲染目前所選資料集
    if (logged) {
      try { toggleSections(); } catch (e) { }
      try { await loadDatasetAndRender(); } catch (e) { }
    }

    const admUsr = qs('#adm-usr');
    const admPwd = qs('#adm-pwd');
    const admBtn = qs('#adm-login');
    qs('#adm-login')?.addEventListener('click', async () => {
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
        try { const tip = qs('#admin-header-tip'); if (tip) tip.textContent = '已登入：請從上方資料集下拉選單選擇 About / Providers / Site Content 並開始編輯。'; } catch (e) { }
        show(qs('#admin-login'), false);
        show(qs('#admin-panel'), true);
        // 以安全端點讀取目前選擇的資料集並渲染可視化表單
        try { await loadDatasetAndRender(); } catch (e) { }
        // 登入後刷新「最後更新」時間
        try { await updateVersionLabel(); } catch (e) { }
      } catch (e) { text(status, '錯誤：' + e.message); if (window.Toast) Toast.show('登入錯誤：' + e.message, 'error', 3000); }
      finally { setBtnLoading(admBtn, false); }
    });
    // Enter 送出
    [admUsr, admPwd].forEach(el => el?.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); admBtn?.click(); } }));

    qs('#btn-logout')?.addEventListener('click', () => { window.DataAPI.logout(); window.location.reload(); });

    // 切換資料集：自動載入並顯示對應可視化介面
    qs('#ds-select')?.addEventListener('change', async () => {
      try { const v = qs('#ds-select')?.value || ''; localStorage.setItem('admin_ds_selected', v); } catch (e) { }
      updateVersionLabel();
      toggleSections();
      try { await loadDatasetAndRender(); } catch (e) { }
    });

    // 儲存並同步
    qs('#btn-save-publish')?.addEventListener('click', onSavePublish);

    // 追蹤目前聚焦的輸入元件，供「插入連結」使用
    activeEditable = null;
    document.addEventListener('focusin', (e) => {
      const el = e.target;
      if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'email' || el.type === 'url')))) {
        activeEditable = el;
      }
    });
    // 先在 mousedown 時保存目前選取範圍（尚未失焦）
    qs('#btn-insert-link')?.addEventListener('mousedown', () => {
      try {
        const el = activeEditable; if (el) {
          activeSelStart = typeof el.selectionStart === 'number' ? el.selectionStart : 0;
          activeSelEnd = typeof el.selectionEnd === 'number' ? el.selectionEnd : activeSelStart;
        }
      } catch (e) { }
    });
    qs('#btn-insert-link')?.addEventListener('click', () => {
      // 若有 Modal，改用 Modal 流程
      if (qs('#link-modal')) { openLinkModal(); return; }
      // Fallback：舊的 prompt 流程
      if (!activeEditable) { alert('請先點選文字輸入區，選取要加連結的文字'); return; }
      const url = prompt('要插入的連結網址？(例如 https://example.com)');
      if (!url) return;
      const el = activeEditable;
      const start = el.selectionStart || 0; const end = el.selectionEnd || start; const val = el.value || '';
      const sel = val.slice(start, end) || url;
      const a = `<a href="${url.replace(/"/g, '%22')}" target="_blank" rel="noopener">${sel}</a>`;
      el.value = val.slice(0, start) + a + val.slice(end);
      try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { }
      el.focus();
      const pos = start + a.length; el.setSelectionRange(pos, pos);
    });

    // Update version label when DataAPI bump
    try {
      document.addEventListener((window.DataAPI && window.DataAPI.EVENT) || 'data:updated', updateVersionLabel);
    } catch (e) { }

    // Provider: Generate Google Maps URL from address
    qs('#pv-gen-gmap')?.addEventListener('click', () => {
      const addressEl = qs('#pv-address');
      const gmapEl = qs('#pv-gmap');
      if (!addressEl || !gmapEl) return;
      const address = (addressEl.value || '').trim();
      if (!address) {
        if (window.Toast) Toast.show('請先填寫地址', 'warning', 2000);
        return;
      }
      // Generate Google Maps search URL (free, no API key required)
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      gmapEl.value = url;
      if (window.Toast) Toast.show('已生成地圖連結', 'success', 2000);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  // ==============================
  // Providers 視覺化編輯器（Beta）
  // ==============================
  function isProvidersSelected() { return (qs('#ds-select')?.value) === 'providers'; }
  function isAboutSelected() { return (qs('#ds-select')?.value) === 'about'; }
  function isSiteSelected() { return (qs('#ds-select')?.value) === 'site'; }
  function isBlogSelected() { return (qs('#ds-select')?.value) === 'blog'; }
  // 平滑展開/收合區塊
  let __curSectionId = null;
  function currentSectionId() { if (isProvidersSelected()) return 'providers-visual'; if (isAboutSelected()) return 'about-visual'; if (isSiteSelected()) return 'site-visual'; if (isBlogSelected()) return 'blog-visual'; return null; }
  function asEl(id) { return id ? qs('#' + id) : null; }
  function ensureCollapsible(el) { if (!el) return; el.classList.add('admin-collapsible'); }
  function toggleSections() {
    const ids = ['providers-visual', 'about-visual', 'site-visual', 'blog-visual'];
    ids.forEach(id => ensureCollapsible(asEl(id)));
    const nextId = currentSectionId();
    if (__curSectionId === nextId) {
      const cur = asEl(nextId); if (cur && cur.classList.contains('hidden')) { cur.classList.remove('hidden'); requestAnimationFrame(() => cur.classList.add('open')); }
      return;
    }
    const prev = asEl(__curSectionId);
    const next = asEl(nextId);
    if (prev) {
      prev.classList.remove('open');
      const onEnd = (e) => { if (e.target === prev) { prev.classList.add('hidden'); prev.removeEventListener('transitionend', onEnd); } };
      prev.addEventListener('transitionend', onEnd);
      setTimeout(() => { prev.classList.add('hidden'); }, 260);
    }
    if (next) {
      next.classList.remove('hidden');
      void next.offsetHeight; // reflow
      next.classList.add('open');
    }
    __curSectionId = nextId;
  }
  function getEditorJSON() { try { return JSON.parse(qs('#ds-editor')?.value || '{}'); } catch (e) { alert('內部狀態解析失敗'); return {}; } }
  function setEditor(obj) { const ed = qs('#ds-editor'); if (ed) ed.value = JSON.stringify(obj || {}, null, 2); }

  // 載入資料：優先使用 Google Sheet 暫存（若存在），同時顯示 skeleton 動畫
  function buildSkeleton() {
    const sk = [];
    for (let i = 0; i < 3; i++) {
      sk.push(`
        <div class="skeleton-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
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
  function showLoading() {
    const box = qs('#admin-loading'); if (!box) return;
    box.innerHTML = buildSkeleton();
    box.classList.remove('hidden');
    try { document.querySelectorAll('.admin-collapsible').forEach(sec => sec.classList.add('hidden')); } catch (e) { }
  }
  function hideLoading() {
    const box = qs('#admin-loading'); if (!box) return;
    box.classList.add('hidden');
    box.innerHTML = '';
    // 恢復目前應顯示的視覺化區塊
    try { toggleSections(); } catch (e) { }
  }

  async function loadDatasetAndRender() {
    const key = keyFromSelect();
    showLoading();
    // 先載入「目前網站的本地資料」
    let payload = (function () {
      if (key === DS.about) return window.aboutContent || {};
      if (key === DS.providers) return window.providersData || {};
      if (key === DS.site) return window.siteContent || {};
      if (key === DS.blog) return window.blogContent || { posts: [] };
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
    } catch (e) { /* ignore */ }

    // 寫入內部編輯器狀態
    if (isProvidersSelected()) { try { ensureProviderIds(payload); } catch (e) { } }
    setEditor(payload);
    // 渲染對應視覺化介面
    if (isProvidersSelected()) {
      fillProviderSelect(payload);
      const firstKey = Object.keys(payload || {})[0];
      if (firstKey) {
        qs('#pv-prov-select').value = firstKey;
        try { updatePvProvButtonLabelFromSelect(); } catch (e) { }
        const p = payload[firstKey] || {};
        renderCasesEditor(p); fillBasicFields(p); renderTimelineEditor(p); refreshCasePreviews();
      } else {
        qs('#pv-cases-list').innerHTML = '';
      }
    } else if (isAboutSelected()) {
      renderAboutEditor(payload || {});
    } else if (isSiteSelected()) {
      renderSiteEditor(payload || {});
    } else if (isBlogSelected()) {
      renderBlogEditor(payload || {});
    }
    hideLoading();
    try { renderLivePreview(); } catch (e) { }
  }

  function fillProviderSelect(map) {
    const sel = qs('#pv-prov-select'); if (!sel) return;
    sel.innerHTML = '';
    const frag = document.createDocumentFragment();
    Object.entries(map || {}).forEach(([id, p]) => {
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
        Array.from(sel.options).forEach(o => {
          const b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('data-value', o.value);
          b.className = 'block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200';
          b.textContent = o.textContent || o.value;
          menu.appendChild(b);
        });
      }
      updatePvProvButtonLabelFromSelect();
    } catch (e) { }
  }

  function renderCasesEditor(provider) {
    const list = qs('#pv-cases-list'); if (!list) return;
    list.innerHTML = '';
    const cases = Array.isArray(provider?.cases) ? provider.cases : [];
    cases.forEach((c, idx) => { list.appendChild(buildCaseItem(c, idx)); });
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
      ['#pv-desc', toPlainText(p.description)],
      ['#pv-featured', p.featuredOnIndex]
    ];

    for (const [selector, value] of fields) {
      const el = s(selector);
      if (el) {
        if (selector === '#pv-featured') {
          el.checked = !!value;
        } else {
          el.value = value || '';
        }
      }
    }
  }

  function collectBasicFields() {
    const s = (id) => qs(id);
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
      description: linkifyHtml(s('#pv-desc')?.value || ''),
      featuredOnIndex: !!s('#pv-featured')?.checked
    };
  }

  // 確保每個 provider 物件都含有對應鍵名的 id 屬性
  function ensureProviderIds(root) {
    try {
      if (!root || typeof root !== 'object') return root;
      Object.entries(root).forEach(([key, p]) => {
        if (p && typeof p === 'object') {
          if (!p.id || p.id !== key) p.id = key;
        }
      });
    } catch (e) { }
    return root;
  }

  // 依「name」自動生成 provider id（slug），並以新 id 重建 map；
  // 僅針對「新建/臨時 id 或缺 id」的項目改名，其餘沿用既有 id，並保證唯一
  function normalizeProviderIdsFromNames(root) {
    const out = {};
    const idMap = {};
    try {
      const used = new Set();
      const entries = Object.entries(root || {});
      const slugify = (s) => {
        const txt = String(s || '').toLowerCase();
        try { return txt.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\-\s]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, ''); }
        catch (_) { return txt.replace(/[^a-z0-9\-\s]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, ''); }
      };
      const makeUnique = (base) => {
        let id = base && base.length ? base : 'provider';
        let n = 2;
        while (used.has(id)) { id = `${base}-${n++}`; }
        used.add(id); return id;
      };
      let seq = 1;
      entries.forEach(([oldKey, p]) => {
        const obj = (p && typeof p === 'object') ? { ...p } : {};
        const curId = (obj.id || oldKey || '').trim();
        const isTemp = /^provider-[0-9a-z]+$/i.test(oldKey) && (!obj.id || obj.id === oldKey);
        let nextId = curId;
        if (!curId || isTemp) {
          let base = slugify(obj.name);
          if (!base) { base = `provider-${seq++}`; }
          nextId = makeUnique(base);
        } else {
          // respect existing id but still ensure global uniqueness
          nextId = makeUnique(curId);
        }
        obj.id = nextId;
        out[nextId] = obj;
        idMap[oldKey] = nextId;
      });
    } catch (e) { }
    return { root: out, idMap };
  }

  // ===== Timeline 編輯 =====
  function buildTlItem(row = {}, idx = 0) {
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-wrap p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';
    wrap.dataset.index = String(idx);
    wrap.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <div class="flex flex-wrap gap-2">
          <label class="text-sm">時間
            <input class="min-w-[250px] pv-tl-time w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="time" value="${row.time || ''}">
          </label>
          <label class="text-sm">標題
            <input class="min-w-[250px] pv-tl-title w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="title" value="${row.title || ''}">
          </label>
          <label class="text-sm">內容
            <textarea class="min-w-[250px] pv-tl-detail w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="2" placeholder="detail">${toPlainText(row.detail) || ''}</textarea>
          </label>
        </div>
        <div class="flex items-center gap-2 flex-wrap ml-auto">
          <button type="button" class="btn-soft btn-yellow pv-tl-up" title="上移"><i class="fas fa-arrow-up"></i></button>
          <button type="button" class="btn-soft btn-yellow pv-tl-down" title="下移"><i class="fas fa-arrow-down"></i></button>
          <button type="button" class="btn-soft btn-orange pv-tl-dup" title="複製"><i class="fas fa-copy"></i></button>
          <button type="button" class="btn-soft btn-purple pv-tl-del" title="刪除"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
    return wrap;
  }
  function renderTimelineEditor(provider) {
    const list = qs('#pv-tl-list'); if (!list) return;
    list.innerHTML = '';
    const arr = Array.isArray(provider?.timeline) ? provider.timeline : [];
    arr.forEach((t, i) => list.appendChild(buildTlItem(t, i)));
  }
  function addBlankTl(afterIndex) {
    const list = qs('#pv-tl-list'); if (!list) return;
    const idx = typeof afterIndex === 'number' ? afterIndex + 1 : list.children.length;
    const node = buildTlItem({ time: '', title: '', detail: '' }, idx);
    if (idx >= list.children.length) list.appendChild(node); else list.insertBefore(node, list.children[idx]);
  }
  function collectTimeline() {
    const list = qs('#pv-tl-list'); if (!list) return [];
    return Array.from(list.children).map(el => ({
      time: el.querySelector('.pv-tl-time')?.value?.trim() || '',
      title: el.querySelector('.pv-tl-title')?.value?.trim() || '',
      // 細節文字支援連結/換行
      detail: linkifyHtml(el.querySelector('.pv-tl-detail')?.value || '')
    })).filter(x => x.time || x.title || x.detail);
  }

  function buildCaseItem(c = {}, idx = 0) {
    const wrap = document.createElement('div');
    wrap.className = 'p-4 rounded-lg bg-gray-50 dark:bg-gray-800 shadow';
    wrap.dataset.index = String(idx);
    wrap.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="font-semibold">案例 #<span class="case-idx">${idx + 1}</span></div>
        <div class="flex items-center gap-2 flex-wrap ml-auto">
          <button type="button" class="btn-soft btn-yellow pv-move-up" title="上移"><i class="fas fa-arrow-up"></i></button>
          <button type="button" class="btn-soft btn-yellow pv-move-down" title="下移"><i class="fas fa-arrow-down"></i></button>
          <button type="button" class="btn-soft btn-orange pv-dup" title="複製"><i class="fas fa-copy"></i></button>
          <!-- <button type="button" class="btn-soft btn-purple pv-insert-after" title="插入"><i class="fas fa-plus"></i></button> -->
          <button type="button" class="btn-soft btn-purple pv-del" title="刪除"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div class="grid admin-grid items-start grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <label class="text-sm">id（唯一）
          <input class="pv-id w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${c.id || ''}" placeholder="不需填寫">
        </label>
        <label class="text-sm">title（題名）
          <input class="pv-title w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${c.title || ''}">
        </label>
      </div>
      <label class="block text-sm mt-2">summary（摘要）
        <textarea class="pv-summary w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="2">${toPlainText(c.summary) || ''}</textarea>
      </label>
      <div class="grid admin-grid items-start grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <label class="text-sm">images（每行一個 URL）
          <textarea class="pv-images w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="4">${(Array.isArray(c.images) ? c.images : []).join('\n')}</textarea>
          <div class="pv-imgmgr mt-2">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-gray-500">拖曳縮圖可排序；拖放圖片或貼上網址可新增</span>
              <label class="btn-soft btn-blue text-xs cursor-pointer">上傳圖片<input type="file" class="hidden pv-img-upload" accept="image/*" multiple></label>
            </div>
            <div class="pv-img-list flex flex-wrap gap-2"></div>
          </div>
        </label>
        <label class="text-sm">video（YouTube/Vimeo/MP4）
          <input class="pv-video w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${c.video || ''}">
          <div class="pv-video-preview mt-2 aspect-video rounded overflow-hidden bg-gray-200 dark:bg-gray-700 grid place-items-center text-xs text-gray-600 dark:text-gray-300">${c.video ? '預覽載入中…' : '輸入影片網址後顯示縮圖'}</div>
        </label>
      </div>
    `;
    return wrap;
  }

  function renumberCases() {
    qs('#pv-cases-list')?.querySelectorAll('div[data-index]')?.forEach((el, i) => { el.dataset.index = String(i); const idx = el.querySelector('.case-idx'); if (idx) idx.textContent = String(i + 1); });
  }

  function addBlankCase(afterIndex) {
    const list = qs('#pv-cases-list'); if (!list) return;
    const idx = typeof afterIndex === 'number' ? afterIndex + 1 : list.children.length;
    const node = buildCaseItem({ id: '', title: '', summary: '', images: [], video: '' }, idx);
    if (idx >= list.children.length) list.appendChild(node); else list.insertBefore(node, list.children[idx]);
    renumberCases();
  }

  function collectCasesFromUI() {
    const list = qs('#pv-cases-list'); if (!list) return [];
    // 先讀取所有欄位
    const items = Array.from(list.children).map(el => {
      const get = sel => el.querySelector(sel);
      const imagesText = (get('.pv-images')?.value || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
      return {
        id: get('.pv-id')?.value?.trim() || '',
        title: get('.pv-title')?.value?.trim() || '',
        // 摘要支援連結/換行
        summary: linkifyHtml(get('.pv-summary')?.value || ''),
        images: imagesText.length ? imagesText : undefined,
        video: get('.pv-video')?.value?.trim() || undefined,
      };
    });
    // 自動產生缺漏的 id，避免重複
    const used = new Set();
    const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\-\s]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    items.forEach((it, i) => {
      let id = (it.id || '').trim();
      if (!id) { id = slugify(it.title) || `case-${i + 1}`; }
      let base = id; let n = 2;
      while (used.has(id)) { id = `${base}-${n++}`; }
      used.add(id);
      it.id = id;
    });
    return items;
  }

  function currentProvidersRef() {
    // 從編輯器取得目前 providers 對象參考
    const root = getEditorJSON();
    return root; // 直接傳回，caller 決定 key
  }

  // Provider change -> render cases
  qs('#pv-prov-select')?.addEventListener('change', () => {
    const obj = getEditorJSON();
    const id = qs('#pv-prov-select')?.value;
    const p = obj[id] || {};
    renderCasesEditor(p);
    fillBasicFields(p);
    renderTimelineEditor(p);
    refreshCasePreviews();
    try { updatePvProvButtonLabelFromSelect(); } catch (e) { }
    try { renderLivePreview(); } catch (e) { }
  });

  // Add case
  qs('#pv-add-case')?.addEventListener('click', () => { addBlankCase(); refreshCasePreviews(); });

  // Timeline buttons (delegated)
  qs('#pv-add-tl')?.addEventListener('click', () => addBlankTl());
  qs('#pv-tl-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const item = e.target.closest('div[data-index]') || e.target.closest('#pv-tl-list > div');
    const list = qs('#pv-tl-list'); if (!item || !list) return;
    const idx = Array.from(list.children).indexOf(item);
    const play = captureListAnimation(list);
    if (btn.classList.contains('pv-tl-del')) { item.remove(); play(); return; }
    if (btn.classList.contains('pv-tl-up') && idx > 0) { list.insertBefore(item, list.children[idx - 1]); play(); flash(item); return; }
    if (btn.classList.contains('pv-tl-down') && idx < list.children.length - 1) { list.insertBefore(list.children[idx + 1], item); play(); flash(item); return; }
    if (btn.classList.contains('pv-tl-dup')) { const clone = item.cloneNode(true); list.insertBefore(clone, list.children[idx + 1]); play(); flash(clone); return; }
  });

  // Delegated actions for cases (move/del/dup/insert)
  qs('#pv-cases-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const item = e.target.closest('div[data-index]'); if (!item) return;
    const list = qs('#pv-cases-list');
    const idx = Array.from(list.children).indexOf(item);
    const play = captureListAnimation(list);
    if (btn.classList.contains('pv-del')) { item.remove(); play(); renumberCases(); return; }
    if (btn.classList.contains('pv-move-up') && idx > 0) { list.insertBefore(item, list.children[idx - 1]); play(); renumberCases(); flash(item); return; }
    if (btn.classList.contains('pv-move-down') && idx < list.children.length - 1) { list.insertBefore(list.children[idx + 1], item); play(); renumberCases(); flash(item); return; }
    if (btn.classList.contains('pv-dup')) { const clone = item.cloneNode(true); list.insertBefore(clone, list.children[idx + 1]); play(); renumberCases(); refreshCasePreviews(); initImgManagers(); flash(clone); return; }
    if (btn.classList.contains('pv-insert-after')) { addBlankCase(idx); play(); refreshCasePreviews(); initImgManagers(); const node = list.children[idx + 1]; flash(node); return; }
  });

  // 影片預覽：YouTube/Vimeo -> 取縮圖；MP4 -> 顯示黑底字樣
  function isYouTube(url) { return /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i.test(url || ''); }
  function ytId(url) { const m = (url || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i); return m ? m[1] : ''; }
  function isVimeo(url) { return /vimeo\.com\/(\d+)/i.test(url || ''); }
  function vimeoId(url) { const m = (url || '').match(/vimeo\.com\/(\d+)/i); return m ? m[1] : ''; }
  function posterFrom(url) { if (!url) return ''; if (isYouTube(url)) return `https://i.ytimg.com/vi/${ytId(url)}/hqdefault.jpg`; if (isVimeo(url)) return `https://vumbnail.com/${vimeoId(url)}.jpg`; return ''; }
  function updatePreviewFor(item) {
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
  function refreshCasePreviews() { qs('#pv-cases-list')?.querySelectorAll('div[data-index]')?.forEach(updatePreviewFor); }
  // 初始化與輸入變動時即時更新
  document.addEventListener('DOMContentLoaded', refreshCasePreviews);
  qs('#pv-cases-list')?.addEventListener('input', (e) => { if (e.target && e.target.classList.contains('pv-video')) { const item = e.target.closest('div[data-index]'); if (item) updatePreviewFor(item); } });

  // ===== 圖片管理（排序／上傳／拖放） =====
  function parseImagesFrom(item) {
    const ta = item.querySelector('.pv-images');
    const arr = (ta?.value || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
    return arr;
  }
  function writeImagesTo(item, arr) {
    const ta = item.querySelector('.pv-images'); if (!ta) return;
    ta.value = (arr || []).join('\n');
  }
  function renderImgList(item) {
    const list = item.querySelector('.pv-img-list'); if (!list) return;
    const imgs = parseImagesFrom(item);
    list.innerHTML = '';
    imgs.forEach((url, i) => {
      const cell = document.createElement('div');
      cell.className = 'pv-img-cell drag-transition relative w-20 h-20 rounded overflow-hidden border border-gray-300 dark:border-gray-700';
      cell.draggable = true;
      cell.dataset.index = String(i);
      const isGas = /^gas:\/\/image\//.test(url);
      const preview = isGas ? previewCache[url] : null;
      if (isGas && preview) {
        cell.innerHTML = `
          <img src="${preview}" alt="pending" class="w-full h-full object-cover opacity-90">
          <span class="absolute left-1 bottom-1 text-[10px] px-1 rounded bg-amber-500 text-white">待發佈</span>
          <div class="absolute top-1 right-1 flex gap-1">
            <button type="button" class="pv-img-up bg-yellow-500/90 hover:bg-yellow-600 text-white rounded px-1 text-xs">↑</button>
            <button type="button" class="pv-img-down bg-yellow-500/90 hover:bg-yellow-600 text-white rounded px-1 text-xs">↓</button>
            <button type="button" class="pv-img-del bg-rose-600 hover:bg-rose-700 text-white rounded px-1 text-xs">×</button>
          </div>
        `;
      } else if (isGas) {
        cell.innerHTML = `
          <div class="w-full h-full grid place-items-center bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">待發佈圖片</div>
          <div class="absolute top-1 right-1 flex gap-1">
            <button type="button" class="pv-img-up bg-yellow-500/90 hover:bg-yellow-600 text-white rounded px-1 text-xs">↑</button>
            <button type="button" class="pv-img-down bg-yellow-500/90 hover:bg-yellow-600 text-white rounded px-1 text-xs">↓</button>
            <button type="button" class="pv-img-del bg-rose-600 hover:bg-rose-700 text-white rounded px-1 text-xs">×</button>
          </div>
        `;
      } else {
        cell.innerHTML = `
          <img src="${url}" alt="img${i + 1}" class="w-full h-full object-cover">
          <div class="absolute top-1 right-1 flex gap-1">
            <button type="button" class="pv-img-up bg-yellow-500/90 hover:bg-yellow-600 text-white rounded px-1 text-xs">↑</button>
            <button type="button" class="pv-img-down bg-yellow-500/90 hover:bg-yellow-600 text-white rounded px-1 text-xs">↓</button>
            <button type="button" class="pv-img-del bg-rose-600 hover:bg-rose-700 text-white rounded px-1 text-xs">×</button>
          </div>
        `;
      }
      list.appendChild(cell);
    });
  }
  function attachImgManagerEvents(root) {
    // Delete / Up / Down
    root.addEventListener('click', (e) => {
      const del = e.target.closest('.pv-img-del');
      const up = e.target.closest('.pv-img-up');
      const down = e.target.closest('.pv-img-down');
      if (!del && !up && !down) return;
      const item = e.target.closest('.pv-img-cell'); if (!item) return;
      const caseEl = item.closest('.pv-imgmgr')?.closest('div[data-index]');
      const idx = parseInt(item.dataset.index || '0', 10);
      const imgs = parseImagesFrom(caseEl);
      if (del) {
        const removed = imgs.splice(idx, 1)[0];
        if (removed && previewCache[removed]) delete previewCache[removed];
      } else if (up && idx > 0) {
        const [m] = imgs.splice(idx, 1); imgs.splice(idx - 1, 0, m);
      } else if (down && idx < imgs.length - 1) {
        const [m] = imgs.splice(idx, 1); imgs.splice(idx + 1, 0, m);
      } else { return; }
      writeImagesTo(caseEl, imgs); renderImgList(caseEl);
    });
    // Drag re-order
    let dragSrc = null;
    root.addEventListener('dragstart', (e) => { const cell = e.target.closest('.pv-img-cell'); if (!cell) return; dragSrc = cell; e.dataTransfer.effectAllowed = 'move'; cell.classList.add('drag-transition', 'dragging'); });
    root.addEventListener('dragenter', (e) => { const c = e.target.closest('.pv-img-cell'); if (c) c.classList.add('drag-over'); });
    root.addEventListener('dragleave', (e) => { const c = e.target.closest('.pv-img-cell'); if (c) c.classList.remove('drag-over'); const l = e.target.closest('.pv-img-list'); if (l) l.classList.remove('dropzone-hover'); });
    root.addEventListener('dragover', (e) => {
      const cell = e.target.closest('.pv-img-cell'); const list = e.target.closest('.pv-img-list');
      if (cell) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
      if (list) { e.preventDefault(); list.classList.add('dropzone-hover'); }
    });
    root.addEventListener('drop', (e) => {
      const dst = e.target.closest('.pv-img-cell'); if (!dst || !dragSrc) return;
      e.preventDefault();
      const caseEl = dst.closest('.pv-imgmgr')?.closest('div[data-index]');
      const imgs = parseImagesFrom(caseEl);
      const a = parseInt(dragSrc.dataset.index || '0', 10);
      const b = parseInt(dst.dataset.index || '0', 10);
      if (a === b) return;
      const [m] = imgs.splice(a, 1); imgs.splice(b, 0, m);
      writeImagesTo(caseEl, imgs); renderImgList(caseEl);
      dragSrc.classList.remove('dragging'); dst.classList.remove('drag-over');
      const list = e.target.closest('.pv-img-list'); if (list) list.classList.remove('dropzone-hover');
      // 阻止後續的 drop 處理（避免被當成上傳再次觸發）
      e.stopImmediatePropagation();
    });
    root.addEventListener('dragend', (e) => {
      const list = e.target.closest('.pv-imgmgr');
      list?.querySelectorAll('.pv-img-cell.dragging,.pv-img-cell.drag-over')?.forEach(el => el.classList.remove('dragging', 'drag-over'));
      list?.querySelector('.pv-img-list')?.classList.remove('dropzone-hover');
    });
    // Upload via GAS (stores to Sheet, returns placeholder gas://image/<id>/<filename>)
    async function uploadFileAndGetPlaceholder(file) {
      const base = (window.AppConfig && window.AppConfig.GAS_BASE_URL) || '';
      const ep = (window.AppConfig && window.AppConfig.endpoints && window.AppConfig.endpoints.uploadImage) || '';
      const t = (window.DataAPI && window.DataAPI.token && window.DataAPI.token()) || '';
      if (!base || !ep || !t) throw new Error('未登入或未設定 GAS');
      const fr = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(new Error('讀檔失敗')); r.readAsDataURL(file); });
      const resp = await fetch(base + ep, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ token: t, dataUrl: fr, filename: file.name }) });
      if (!resp.ok) throw new Error('上傳失敗(' + resp.status + ')');
      const data = await resp.json();
      if (!data || !data.ok || !data.id) throw new Error(data && data.message || '上傳失敗');
      const ph = `gas://image/${data.id}/${data.filename}`;
      previewCache[ph] = fr; // 立刻可見縮圖
      return ph;
    }
    root.addEventListener('change', async (e) => {
      const up = e.target.closest('.pv-img-upload'); if (!up) return;
      const mgr = up.closest('.pv-imgmgr');
      const caseEl = mgr?.closest('div[data-index]'); if (!caseEl) return;
      const files = up.files || [];
      if (!files.length) return;
      up.disabled = true;
      const imgs = parseImagesFrom(caseEl);
      try {
        if (mgr) mgr.classList.add('is-uploading');
        for (const f of Array.from(files)) {
          try {
            const ph = await uploadFileAndGetPlaceholder(f);
            imgs.push(ph);
          } catch (err) { if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000); }
        }
        writeImagesTo(caseEl, imgs); renderImgList(caseEl);
        if (window.Toast) Toast.show('圖片已上傳（待發佈）', 'success', 2500);
      } finally { up.value = ''; up.disabled = false; if (mgr) mgr.classList.remove('is-uploading'); }
    });
    // Drop URL or files to list area
    root.addEventListener('dragover', (e) => {
      const list = e.target.closest('.pv-img-list'); if (!list) return;
      e.preventDefault();
      const dt = e.dataTransfer; if (dt) { const types = Array.from(dt.types || []); dt.dropEffect = types.includes('Files') ? 'copy' : 'link'; }
      list.classList.add('dropzone-hover');
    });
    root.addEventListener('drop', async (e) => {
      const list = e.target.closest('.pv-img-list'); if (!list) return;
      // 若是內部拖曳排序，避免進入上傳流程
      if (dragSrc) { e.preventDefault(); list.classList.remove('dropzone-hover'); return; }
      e.preventDefault();
      const mgr = list.closest('.pv-imgmgr');
      const caseEl = mgr?.closest('div[data-index]');
      const imgs = parseImagesFrom(caseEl);
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length) {
        if (mgr) mgr.classList.add('is-uploading');
        try {
          for (const f of Array.from(dt.files)) {
            try { const ph = await uploadFileAndGetPlaceholder(f); imgs.push(ph); }
            catch (err) { if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000); }
          }
          writeImagesTo(caseEl, imgs); renderImgList(caseEl); if (window.Toast) Toast.show('圖片已上傳（待發佈）', 'success', 2500);
        } finally { if (mgr) mgr.classList.remove('is-uploading'); list.classList.remove('dropzone-hover'); }
      } else if (dt && dt.getData) {
        let text = '';
        try { text = (dt.getData('text/uri-list') || dt.getData('text/plain') || dt.getData('text') || '').trim(); } catch (err) { }
        if (text) { imgs.push(text); writeImagesTo(caseEl, imgs); renderImgList(caseEl); }
        list.classList.remove('dropzone-hover');
      }
    });
  }
  // Build manager for newly rendered cases
  function initImgManagers() {
    qs('#pv-cases-list')?.querySelectorAll('div[data-index]')?.forEach(renderImgList);
  }
  // 確保即時綁定（有些情況 admin.js 於 DOMContentLoaded 之後才載入）
  let __IMG_MGR_BOUND = false;
  function bindImgMgrOnce() { if (!__IMG_MGR_BOUND) { attachImgManagerEvents(document); __IMG_MGR_BOUND = true; } }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindImgMgrOnce);
  } else { bindImgMgrOnce(); }

  // Provider add / delete
  qs('#pv-add-provider')?.addEventListener('click', () => {
    const obj = getEditorJSON();
    // 不再詢問 ID；先以臨時鍵建立，真正的 id 將在儲存時依 name 自動產生
    const base = 'provider-' + Date.now().toString(36);
    let id = base; let n = 2;
    while (obj[id]) { id = `${base}-${n++}`; }
    obj[id] = { id, name: '', category: '', location: '', address: '', description: '', coords: undefined, cases: [], timeline: [], featuredOnIndex: false };
    setEditor(obj);
    fillProviderSelect(obj);
    qs('#pv-prov-select').value = id;
    try { updatePvProvButtonLabelFromSelect(); } catch (e) { }
    renderCasesEditor(obj[id]); fillBasicFields(obj[id]); renderTimelineEditor(obj[id]);
  });
  qs('#pv-del-provider')?.addEventListener('click', () => {
    const id = qs('#pv-prov-select')?.value; if (!id) return;
    const obj = getEditorJSON();
    if (!obj[id]) { alert('此 Provider 不存在'); return; }
    if (!confirm('確定要刪除「' + (obj[id].name || id) + '」？此動作無法復原。')) return;
    delete obj[id];
    setEditor(obj);
    fillProviderSelect(obj);
    const firstKey = Object.keys(obj || {})[0];
    if (firstKey) {
      qs('#pv-prov-select').value = firstKey;
      const p = obj[firstKey];
      try { updatePvProvButtonLabelFromSelect(); } catch (e) { }
      renderCasesEditor(p); fillBasicFields(p); renderTimelineEditor(p);
    } else {
      qs('#pv-cases-list').innerHTML = '';
    }
  });

  // 依據目前 UI，將選中的 Provider 回寫到隱藏編輯器對象
  function syncCurrentProviderToEditor() {
    const id = qs('#pv-prov-select')?.value;
    if (!id) return;
    const root = getEditorJSON();
    if (!root[id]) root[id] = {};
    const basic = collectBasicFields();
    root[id] = { ...root[id], ...basic };
    // 保證 provider.id 與鍵名一致
    root[id].id = id;
    root[id].timeline = collectTimeline();
    root[id].cases = collectCasesFromUI();
    setEditor(root);
  }

  // 儲存＋同步 GitHub
  async function onSavePublish() {
    const key = keyFromSelect();
    const st = qs('#publish-status'); if (st) st.textContent = '儲存並同步中…';
    try {
      setBtnLoading(qs('#btn-save-publish'), true);
      let payload;
      if (isProvidersSelected()) {
        // 將目前 UI 回寫到編輯器，接著依 name 正規化 id 並重建鍵
        syncCurrentProviderToEditor();
        const before = getEditorJSON();
        const oldSel = qs('#pv-prov-select')?.value;
        const norm = normalizeProviderIdsFromNames(before);
        payload = norm.root;
        // 立即同步回編輯器與 UI（避免後續操作仍使用舊鍵）
        setEditor(payload);
        try {
          fillProviderSelect(payload);
          const nextSel = (oldSel && norm.idMap[oldSel]) || Object.keys(payload || {})[0];
          if (nextSel) {
            qs('#pv-prov-select').value = nextSel;
            try { updatePvProvButtonLabelFromSelect(); } catch (e) { }
            const p = payload[nextSel] || {};
            renderCasesEditor(p); fillBasicFields(p); renderTimelineEditor(p);
          }
        } catch (e) { }
      }
      else if (isAboutSelected()) { payload = collectAboutFromUI(); }
      else if (isSiteSelected()) { payload = collectSiteFromUI(); }
      else if (isBlogSelected()) { payload = collectBlogFromUI(); }
      else { payload = getEditorJSON(); }
      let res = await window.DataAPI.savePublish(key, payload, [key]);
      if (!res || !res.ok) {
        // 退回為僅儲存（無 GitHub）
        try { res = await window.DataAPI.update(key, payload); } catch (err) { }
      }
      // 判斷發佈是否失敗（即便存檔成功）
      const hasPublishErrors = !!(res && Array.isArray(res.results) && res.results.some(r => !r || r.ok === false));
      const firstErr = hasPublishErrors ? (res.results.find(r => !r || r.ok === false) || {}) : null;
      // 調整狀態文字與樣式
      if (st) {
        st.classList.remove('text-rose-600', 'dark:text-rose-400', 'font-semibold');
        if (res && res.ok && !hasPublishErrors) {
          st.textContent = '已完成（儲存' + (res.update ? '+同步' : '') + '）';
        } else if (res && res.ok && hasPublishErrors) {
          const msg = (firstErr && (firstErr.message || firstErr.key)) || '發佈失敗';
          st.textContent = '已儲存，但發佈失敗：' + msg;
          st.classList.add('text-rose-600', 'dark:text-rose-400', 'font-semibold');
        } else {
          st.textContent = '失敗：' + ((res && res.message) || '未知錯誤');
          st.classList.add('text-rose-600', 'dark:text-rose-400', 'font-semibold');
        }
      }
      if (window.Toast) {
        if (res && res.ok && !hasPublishErrors) {
          Toast.show('已完成儲存' + (res.update ? '（含同步）' : ''), 'success', 3500);
        } else if (res && res.ok && hasPublishErrors) {
          Toast.show('已儲存，但發佈未完成', 'warning', 3500);
        } else {
          Toast.show('儲存/發佈失敗：' + ((res && res.message) || '未知錯誤'), 'error', 3500);
        }
      }
      updateVersionLabel();

    } catch (e) { if (st) st.textContent = '錯誤：' + e.message; if (window.Toast) Toast.show('儲存錯誤：' + e.message, 'error', 3000); }
    finally { setBtnLoading(qs('#btn-save-publish'), false); }
  }

  // 僅儲存（不發佈）
  qs('#btn-save-only')?.addEventListener('click', async () => {
    const key = keyFromSelect();
    const st = qs('#publish-status'); if (st) st.textContent = '儲存中…';
    try {
      setBtnLoading(qs('#btn-save-only'), true);
      let payload;
      if (isProvidersSelected()) {
        syncCurrentProviderToEditor();
        const before = getEditorJSON();
        const oldSel = qs('#pv-prov-select')?.value;
        const norm = normalizeProviderIdsFromNames(before);
        payload = norm.root;
        setEditor(payload);
        try {
          fillProviderSelect(payload);
          const nextSel = (oldSel && norm.idMap[oldSel]) || Object.keys(payload || {})[0];
          if (nextSel) {
            qs('#pv-prov-select').value = nextSel;
            try { updatePvProvButtonLabelFromSelect(); } catch (e) { }
            const p = payload[nextSel] || {};
            renderCasesEditor(p); fillBasicFields(p); renderTimelineEditor(p);
          }
        } catch (e) { }
      }
      else if (isAboutSelected()) { payload = collectAboutFromUI(); }
      else if (isSiteSelected()) { payload = collectSiteFromUI(); }
      else if (isBlogSelected()) { payload = collectBlogFromUI(); }
      else { payload = getEditorJSON(); }
      const res = await window.DataAPI.update(key, payload);
      if (st) st.textContent = (res && res.ok) ? '已儲存' : ('儲存失敗：' + (res && res.message || '未知錯誤'));
      if (window.Toast) Toast.show((res && res.ok) ? '已儲存' : '儲存失敗：' + (res && res.message || '未知錯誤'), (res && res.ok) ? 'success' : 'error', 3000);
      updateVersionLabel();
    } catch (e) { if (st) st.textContent = '錯誤：' + e.message; if (window.Toast) Toast.show('儲存錯誤：' + e.message, 'error', 3000); }
    finally { setBtnLoading(qs('#btn-save-only'), false); }
  });

  // ===== About 視覺化 =====
  function buildModelItem(row = {}, idx = 0) {
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-wrap p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';
    wrap.dataset.index = String(idx);
    wrap.innerHTML = `
      <div class="mt-2 flex items-center gap-2 flex-wrap ml-auto">
        <button type="button" class="btn-soft btn-yellow ab-model-up" title="上移"><i class="fas fa-arrow-up"></i></button>
        <button type="button" class="btn-soft btn-yellow ab-model-down" title="下移"><i class="fas fa-arrow-down"></i></button>
        <button type="button" class="btn-soft btn-orange ab-model-dup" title="複製"><i class="fas fa-copy"></i></button>
        <button type="button" class="btn-soft btn-purple ab-model-del" title="刪除"><i class="fas fa-trash"></i></button>
      </div>
      <div class="grid admin-grid items-start grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        <label class="text-sm">標題
          <input class="ab-model-title w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${row.title || ''}">
        </label>
        <label class="text-sm">描述
          <textarea class="ab-model-desc w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="2">${toPlainText(row.desc) || ''}</textarea>
        </label>
        <label class="text-sm">連結（可選）
          <input class="ab-model-href w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${row.href || ''}">
        </label>
        <label class="text-sm flex-1">連結文字（可選）
          <input class="ab-model-linktext w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${row.linkText || ''}">
        </label>
      </div>`;
    return wrap;
  }
  function renderAboutEditor(obj) {
    const data = obj || {};
    qs('#ab-hero-title')?.setAttribute('value', '');
    const hero = qs('#ab-hero-title'); if (hero) hero.value = data.heroTitle || '';
    const lead = qs('#ab-lead'); if (lead) {
      // 將 HTML 轉回可編輯的多行文字
      lead.value = toPlainText(data.lead || '');
    }
    const list = qs('#ab-model-list'); if (list) {
      list.innerHTML = '';
      const arr = Array.isArray(data.model) ? data.model : [];
      arr.forEach((m, i) => list.appendChild(buildModelItem(m, i)));
    }
    const at = qs('#ab-ach-title'); if (at) at.value = data.achievementsTitle || '';
    const al = qs('#ab-ach-list'); if (al) {
      al.innerHTML = '';
      const arr = Array.isArray(data.achievements) ? data.achievements : [];
      arr.forEach((a, i) => al.appendChild(buildAchItem(a, i)));
    }
    const teamList = qs('#ab-team-list'); if (teamList) {
      teamList.innerHTML = '';
      const arr = Array.isArray(data.team) ? data.team : [];
      arr.forEach((t, i) => { const node = buildTeamItem(t, i); teamList.appendChild(node); try { updateTeamPreview(node); } catch (e) { } });
    }
  }
  function addBlankModel(afterIndex) {
    const list = qs('#ab-model-list'); if (!list) return;
    const idx = typeof afterIndex === 'number' ? afterIndex + 1 : list.children.length;
    const node = buildModelItem({ title: '', desc: '', href: '', linkText: '' }, idx);
    if (idx >= list.children.length) list.appendChild(node); else list.insertBefore(node, list.children[idx]);
  }
  function collectAboutFromUI() {
    const obj = {};
    obj.heroTitle = qs('#ab-hero-title')?.value?.trim() || '';
    obj.lead = linkifyHtml(qs('#ab-lead')?.value || '');
    obj.model = Array.from(qs('#ab-model-list')?.children || []).map(el => ({
      title: el.querySelector('.ab-model-title')?.value?.trim() || '',
      desc: linkifyHtml(el.querySelector('.ab-model-desc')?.value || ''),
      href: el.querySelector('.ab-model-href')?.value?.trim() || undefined,
      linkText: el.querySelector('.ab-model-linktext')?.value?.trim() || undefined
    })).filter(x => x.title || x.desc || x.href);
    obj.achievementsTitle = qs('#ab-ach-title')?.value?.trim() || '';
    obj.achievements = Array.from(qs('#ab-ach-list')?.children || []).map(el => {
      const text = el.querySelector('.ab-ach-text')?.value?.trim() || '';
      const href = el.querySelector('.ab-ach-href')?.value?.trim() || '';
      if (!href) return text;
      return { text, href };
    }).filter(Boolean);
    obj.team = Array.from(qs('#ab-team-list')?.children || []).map(el => {
      const name = el.querySelector('.ab-team-name')?.value?.trim() || '';
      const photo = el.querySelector('.ab-team-photo')?.value?.trim() || '';
      const rolesStr = el.querySelector('.ab-team-roles')?.value || '';
      const roles = rolesStr.split(/[、,，\s]+/).map(s => s.trim()).filter(Boolean);
      const motto = el.querySelector('.ab-team-motto')?.value?.trim() || '';
      const education = (el.querySelector('.ab-team-edu')?.value || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
      const experience = (el.querySelector('.ab-team-exp')?.value || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
      const socials = Array.from(el.querySelectorAll('.ab-team-socials .ab-social-row')).map(r => ({
        name: r.querySelector('.ab-social-name')?.value?.trim() || '',
        href: r.querySelector('.ab-social-href')?.value?.trim() || ''
      })).filter(x => x.name && x.href);
      return { name, photo, roles, motto, education, experience, socials };
    }).filter(m => m.name || m.photo || (m.roles || []).length || m.motto || (m.education || []).length || (m.experience || []).length || (m.socials || []).length);
    return obj;
  }
  function buildAchItem(row, idx) {
    const isObj = row && typeof row === 'object';
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-wrap p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-col';
    wrap.dataset.index = String(idx);
    wrap.innerHTML = `
      <div class="mt-2 flex items-center gap-2 flex-wrap ml-auto">
        <button type="button" class="btn-soft btn-yellow ab-ach-up" title="上移"><i class="fas fa-arrow-up"></i></button>
        <button type="button" class="btn-soft btn-yellow ab-ach-down" title="下移"><i class="fas fa-arrow-down"></i></button>
        <button type="button" class="btn-soft btn-orange ab-ach-dup" title="複製"><i class="fas fa-copy"></i></button>
        <button type="button" class="btn-soft btn-purple ab-ach-del" title="刪除"><i class="fas fa-trash"></i></button>
      </div>
      <div class="grid admin-grid items-start grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 items-center">
        <label class="text-sm">文字
          <textarea class="ab-ach-text w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="2">${isObj ? (row.text || '') : (row || '')}</textarea>
        </label>
        <label class="text-sm">連結（可選）
          <input class="ab-ach-href w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${isObj ? (row.href || '') : ''}">
        </label>
      </div>`;
    return wrap;
  }
  function buildTeamItem(row = {}, idx = 0) {
    const wrap = document.createElement('div');
    wrap.className = 'ab-team-item flex flex-wrap p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';
    wrap.dataset.index = String(idx);
    wrap.innerHTML = `
    <div class="mt-2 flex items-center gap-2 flex-wrap ml-auto">
      <button type="button" class="btn-soft btn-yellow ab-team-up" title="上移"><i class="fas fa-arrow-up"></i></button>
      <button type="button" class="btn-soft btn-yellow ab-team-down" title="下移"><i class="fas fa-arrow-down"></i></button>
      <button type="button" class="btn-soft btn-orange ab-team-dup" title="複製"><i class="fas fa-copy"></i></button>
      <button type="button" class="btn-soft btn-purple ab-team-del" title="刪除"><i class="fas fa-trash"></i></button>
    </div>
      <div class="grid admin-grid items-start grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 items-center">
        <label class="text-sm">姓名
          <input class="ab-team-name w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${row.name || ''}">
        </label>
        <div class="min-w-0 sm:col-span-2 md:col-span-2">
          <div class="flex items-center gap-2 min-w-0">
            <label class="text-sm flex-1 min-w-0">照片
              <input class="ab-team-photo flex-1 min-w-0 rounded border px-2 py-1 bg-white dark:bg-gray-800" placeholder="照片連結或 gas://image/..." value="${row.photo || ''}">
            </label>
            <label class="btn-soft btn-blue text-xs cursor-pointer shrink-0">上傳<input type="file" class="hidden tm-photo-upload" accept="image/*"></label>
          </div>
          <div class="tm-photo-preview mt-2 min-h-16 rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 grid place-items-center text-[11px] text-gray-500 dark:text-gray-400">預覽</div>
        </div>
        <label class="text-sm">角色
          <input class="ab-team-roles w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${Array.isArray(row.roles) ? row.roles.join('、') : ''}">
        </label>
        <label class="text-sm">座右銘
          <textarea class="ab-team-motto w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="2">${toPlainText(row.motto) || ''}</textarea>
        </label>
      </div>
      <div class="grid admin-grid items-start grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-2 mt-2">
        <label class="text-sm flex flex-col gap-2">教育背景
          <textarea class="ab-team-edu w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="4">${(row.education || []).join('\n')}</textarea>
        </label>
        <label class="text-sm flex flex-col gap-2">經歷
          <textarea class="ab-team-exp w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="4">${(row.experience || []).join('\n')}</textarea>
        </label>
      </div>
      <div class="mt-2">
        <label class="text-sm block">社群連結（可多筆）</label>
        <div class="ab-team-socials space-y-2">
          <button type="button" class="btn-soft btn-green ab-social-add">新增社群連結</button>
        </div>
        <div class="ab-team-socials flex flex-col gap-2">
          ${Array.isArray(row.socials) ? row.socials.map((s, i) => `
            <div class="ab-social-row flex flex-wrap gap-2 items-center min-w-0" data-index="${i}">
              <label class="text-sm flex-1 min-w-[200px]">名稱
                <input class="ab-social-name w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${s.name || ''}">
              </label>
              <label class="text-sm flex-1 min-w-[200px]">連結
                <input class="ab-social-href w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${s.href || ''}">
              </label>
              <button type="button" class="btn-soft btn-yellow ab-social-up shrink-0" title="上移"><i class="fas fa-arrow-up"></i></button>
              <button type="button" class="btn-soft btn-yellow ab-social-down shrink-0" title="下移"><i class="fas fa-arrow-down"></i></button>
              <button type="button" class="btn-soft btn-orange ab-social-dup shrink-0" title="複製"><i class="fas fa-copy"></i></button>
              <button type="button" class="btn-soft btn-purple ab-social-del shrink-0" title="刪除"><i class="fas fa-trash"></i></button>
            </div>
          `).join('') : ''}
        </div>
      </div>
    `;
    return wrap;
  }
  qs('#ab-add-model')?.addEventListener('click', () => addBlankModel());
  qs('#ab-model-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const list = qs('#ab-model-list'); const item = e.target.closest('div[data-index]'); if (!list || !item) return;
    const idx = Array.from(list.children).indexOf(item);
    const play = captureListAnimation(list);
    if (btn.classList.contains('ab-model-del')) { item.remove(); play(); return; }
    if (btn.classList.contains('ab-model-up') && idx > 0) { list.insertBefore(item, list.children[idx - 1]); play(); flash(item); return; }
    if (btn.classList.contains('ab-model-down') && idx < list.children.length - 1) { list.insertBefore(list.children[idx + 1], item); play(); flash(item); return; }
    if (btn.classList.contains('ab-model-dup')) { const clone = item.cloneNode(true); list.insertBefore(clone, list.children[idx + 1]); play(); flash(clone); return; }
  });
  qs('#ab-add-ach')?.addEventListener('click', () => {
    const list = qs('#ab-ach-list'); if (!list) return;
    const node = buildAchItem('', list.children.length); list.appendChild(node);
  });
  qs('#ab-ach-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const list = qs('#ab-ach-list'); const item = e.target.closest('div[data-index]'); if (!list || !item) return;
    const idx = Array.from(list.children).indexOf(item);
    const play = captureListAnimation(list);
    if (btn.classList.contains('ab-ach-del')) { item.remove(); play(); return; }
    if (btn.classList.contains('ab-ach-up') && idx > 0) { list.insertBefore(item, list.children[idx - 1]); play(); flash(item); return; }
    if (btn.classList.contains('ab-ach-down') && idx < list.children.length - 1) { list.insertBefore(list.children[idx + 1], item); play(); flash(item); return; }
    if (btn.classList.contains('ab-ach-dup')) { const clone = item.cloneNode(true); list.insertBefore(clone, list.children[idx + 1]); play(); flash(clone); return; }
  });
  qs('#ab-add-team')?.addEventListener('click', () => {
    const list = qs('#ab-team-list'); if (!list) return;
    const node = buildTeamItem({}, list.children.length); list.appendChild(node);
  });
  qs('#ab-team-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const list = qs('#ab-team-list'); const item = e.target.closest('.ab-team-item'); if (!list || !item) return;
    const idx = Array.from(list.children).indexOf(item);
    const play = captureListAnimation(list);
    if (btn.classList.contains('ab-team-del')) { item.remove(); play(); return; }
    if (btn.classList.contains('ab-team-up') && idx > 0) { list.insertBefore(item, list.children[idx - 1]); play(); flash(item); return; }
    if (btn.classList.contains('ab-team-down') && idx < list.children.length - 1) { list.insertBefore(list.children[idx + 1], item); play(); flash(item); return; }
    if (btn.classList.contains('ab-team-dup')) { const clone = item.cloneNode(true); list.insertBefore(clone, list.children[idx + 1]); play(); flash(clone); return; }
  });
  // About｜Team 照片預覽/上傳
  qs('#ab-team-list')?.addEventListener('input', (e) => {
    const inp = e.target.closest('.ab-team-photo'); if (!inp) return;
    const item = inp.closest('.ab-team-item'); if (item) updateTeamPreview(item);
  });
  qs('#ab-team-list')?.addEventListener('change', async (e) => {
    const up = e.target.closest('.tm-photo-upload'); if (!up) return;
    const item = up.closest('.ab-team-item'); if (!item) return;
    const file = up.files?.[0]; if (!file) return;
    up.disabled = true;
    try {
      const pv = item.querySelector('.tm-photo-preview'); if (pv) pv.classList.add('is-uploading');
      const ph = await uploadFileAndGetPlaceholder(file);
      const input = item.querySelector('.ab-team-photo'); if (input) input.value = ph;
      updateTeamPreview(item);
      if (window.Toast) Toast.show('圖片已加入（待發佈）', 'success', 2000);
    } catch (err) { if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000); }
    finally { up.value = ''; up.disabled = false; const pv = item.querySelector('.tm-photo-preview'); if (pv) pv.classList.remove('is-uploading'); }
  });
  // 重新編號社群列（維持 data-index 與視覺順序一致）
  function renumberSocialRows(list) {
    try {
      if (!list) return;
      Array.from(list.querySelectorAll('.ab-social-row')).forEach((el, i) => { el.dataset.index = String(i); });
    } catch (e) { }
  }
  qs('#ab-team-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const list = qs('#ab-team-list'); const item = e.target.closest('.ab-team-item'); if (!list || !item) return;
    const socialList = item.querySelector('.ab-team-socials.flex'); if (!socialList) return;
    const row = e.target.closest('.ab-social-row');
    if (btn.classList.contains('ab-social-del') && row) { row.remove(); renumberSocialRows(socialList); return; }
    if (btn.classList.contains('ab-social-up') && row && row.previousElementSibling) { socialList.insertBefore(row, row.previousElementSibling); renumberSocialRows(socialList); flash(row); return; }
    if (btn.classList.contains('ab-social-down') && row && row.nextElementSibling) { socialList.insertBefore(row.nextElementSibling, row); renumberSocialRows(socialList); flash(row); return; }
    if (btn.classList.contains('ab-social-dup') && row) { const clone = row.cloneNode(true); socialList.insertBefore(clone, row.nextElementSibling); renumberSocialRows(socialList); flash(clone); return; }
  });
  qs('#ab-team-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const item = e.target.closest('.ab-team-item'); if (!item) return;
    if (btn.classList.contains('ab-social-add')) {
      const socialList = item.querySelector('.ab-team-socials.flex'); if (!socialList) return;
      const node = document.createElement('div');
      node.className = 'ab-social-row flex flex-wrap gap-2 items-center min-w-0';
      node.innerHTML = `
        <label class="text-sm flex-1 min-w-[200px]">名稱
          <input class="ab-social-name w-full rounded border px-2 py-1 bg-white dark:bg-gray-800">
        </label>
        <label class="text-sm flex-1 min-w-[200px]">連結
          <input class="ab-social-href w-full rounded border px-2 py-1 bg-white dark:bg-gray-800">
        </label>
        <button type="button" class="btn-soft btn-yellow ab-social-up shrink-0" title="上移"><i class="fas fa-arrow-up"></i></button>
        <button type="button" class="btn-soft btn-yellow ab-social-down shrink-0" title="下移"><i class="fas fa-arrow-down"></i></button>
        <button type="button" class="btn-soft btn-orange ab-social-dup shrink-0" title="複製"><i class="fas fa-copy"></i></button>
        <button type="button" class="btn-soft btn-purple ab-social-del shrink-0" title="刪除"><i class="fas fa-trash"></i></button>
      `;
      socialList.appendChild(node); renumberSocialRows(socialList); flash(node);
    }
  });

  // ===== Site 視覺化 (Updated for Dynamic Index) =====
  function buildHeroSlideItem(row = {}, idx = 0) {
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-wrap p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';
    wrap.dataset.index = String(idx);
    wrap.innerHTML = `
      <div class="mt-2 flex items-center gap-2 flex-wrap ml-auto">
        <button type="button" class="btn-soft btn-yellow sc-slide-up" title="上移"><i class="fas fa-arrow-up"></i></button>
        <button type="button" class="btn-soft btn-yellow sc-slide-down" title="下移"><i class="fas fa-arrow-down"></i></button>
        <button type="button" class="btn-soft btn-purple sc-slide-del" title="刪除"><i class="fas fa-trash"></i></button>
      </div>
      <div class="grid grid-cols-1 gap-2 w-full">
        <div class="flex items-center gap-2">
          <label class="text-sm flex-1">圖片 URL
            <input class="sc-slide-img w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${row.img || ''}" placeholder="./img/...">
          </label>
          <label class="btn-soft btn-blue text-xs cursor-pointer shrink-0 self-end mb-[2px]">上傳<input type="file" class="hidden sc-slide-upload" accept="image/*"></label>
        </div>
        <label class="text-sm">替代文字 (Alt)
          <input class="sc-slide-alt w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${row.alt || ''}">
        </label>
        <div class="h-24 bg-gray-100 dark:bg-gray-800 rounded mt-1 overflow-hidden relative sc-slide-preview-box">
           <img src="${row.img || ''}" class="sc-slide-preview w-full h-full object-cover" onerror="this.style.display='none'" onload="this.style.display='block'">
           <div class="sc-slide-uploading hidden absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs">上傳中...</div>
        </div>
      </div>`;
    // Preview update on input
    wrap.querySelector('.sc-slide-img').addEventListener('input', e => {
      const img = wrap.querySelector('.sc-slide-preview');
      img.src = e.target.value;
      img.style.display = 'block';
    });
    // Upload handler
    wrap.querySelector('.sc-slide-upload').addEventListener('change', async e => {
      const file = e.target.files?.[0]; if (!file) return;
      const input = wrap.querySelector('.sc-slide-img');
      const upBox = wrap.querySelector('.sc-slide-uploading');
      try {
        upBox?.classList.remove('hidden');
        const ph = await uploadFileAndGetPlaceholder(file);
        input.value = ph;
        wrap.querySelector('.sc-slide-preview').src = previewCache[ph] || ph;
        if (window.Toast) Toast.show('圖片已加入（待發佈）', 'success', 2000);
      } catch (err) {
        if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000);
      } finally {
        upBox?.classList.add('hidden');
        e.target.value = '';
      }
    });
    return wrap;
  }

  function buildServiceItem(row = {}, idx = 0) {
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-wrap p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';
    wrap.dataset.index = String(idx);
    wrap.innerHTML = `
      <div class="mt-2 flex items-center gap-2 flex-wrap ml-auto">
        <button type="button" class="btn-soft btn-yellow sc-svc-up" title="上移"><i class="fas fa-arrow-up"></i></button>
        <button type="button" class="btn-soft btn-yellow sc-svc-down" title="下移"><i class="fas fa-arrow-down"></i></button>
        <button type="button" class="btn-soft btn-purple sc-svc-del" title="刪除"><i class="fas fa-trash"></i></button>
      </div>
      <div class="grid admin-grid items-start grid-cols-1 md:grid-cols-2 gap-2 items-center w-full">
        <label class="text-sm">標題
          <input class="sc-svc-title w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${row.title || ''}">
        </label>
        <label class="text-sm">Icon (FontAwesome)
          <input class="sc-svc-icon w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${row.icon || ''}" placeholder="fas fa-star">
        </label>
        <label class="text-sm md:col-span-2">描述
          <textarea class="sc-svc-desc w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="2">${row.desc || ''}</textarea>
        </label>
        <label class="text-sm">連結 (HTML Path)
          <input class="sc-svc-link w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${row.link || ''}">
        </label>
        <div class="text-sm">
          <span>圖片</span>
          <div class="flex gap-2 items-end mt-1">
            <input class="sc-svc-image flex-1 rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${row.img || ''}" placeholder="./img/... 或上傳">
            <label class="btn-soft btn-blue text-xs cursor-pointer shrink-0">上傳<input type="file" class="hidden sc-svc-upload" accept="image/*"></label>
            <div class="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden shrink-0">
              <img src="${row.img || ''}" class="w-full h-full object-cover sc-svc-preview" onerror="this.style.display='none'" onload="this.style.display='block'">
            </div>
          </div>
        </div>
      </div>`;
    // Live preview for image
    wrap.querySelector('.sc-svc-image').addEventListener('input', e => {
      const preview = wrap.querySelector('.sc-svc-preview');
      if (preview) {
        preview.src = e.target.value;
        preview.style.display = 'block';
      }
    });
    // Upload handler
    wrap.querySelector('.sc-svc-upload').addEventListener('change', async e => {
      const file = e.target.files?.[0]; if (!file) return;
      const input = wrap.querySelector('.sc-svc-image');
      const preview = wrap.querySelector('.sc-svc-preview');
      try {
        const ph = await uploadFileAndGetPlaceholder(file);
        if (input) input.value = ph;
        if (preview) {
          preview.src = previewCache[ph] || ph;
          preview.style.display = 'block';
        }
        if (window.Toast) Toast.show('圖片已加入（待發佈）', 'success', 2000);
      } catch (err) {
        if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000);
      } finally {
        e.target.value = '';
      }
    });
    return wrap;
  }

  function renderSiteEditor(data) {
    // data is window.siteContent (hero, philosophy, services keys at root)
    const hero = data.hero || {};
    const hTitle = qs('#sc-hero-title'); if (hTitle) hTitle.value = toPlainText(hero.title) || '';
    const hSub = qs('#sc-hero-subtitle'); if (hSub) hSub.value = toPlainText(hero.subtitle) || '';
    const hInfo = qs('#sc-hero-info'); if (hInfo) hInfo.value = toPlainText(hero.info) || '';

    const sList = qs('#sc-hero-slides');
    if (sList) {
      sList.innerHTML = '';
      (hero.slides || []).forEach((s, i) => sList.appendChild(buildHeroSlideItem(s, i)));
    }

    const phil = data.philosophy || {};
    if (qs('#sc-phil-label')) qs('#sc-phil-label').value = phil.label || '';
    if (qs('#sc-phil-title')) qs('#sc-phil-title').value = toPlainText(phil.title) || '';
    if (qs('#sc-phil-content')) qs('#sc-phil-content').value = toPlainText(phil.content) || '';
    if (qs('#sc-phil-img')) qs('#sc-phil-img').value = phil.img || '';
    // Update philosophy preview
    const philPreview = qs('#sc-phil-preview-img');
    if (philPreview) philPreview.src = phil.img || '';

    const svcList = qs('#sc-service-list');
    if (svcList) {
      svcList.innerHTML = '';
      (data.services || []).forEach((s, i) => svcList.appendChild(buildServiceItem(s, i)));
    }
  }

  function addBlankSlide() {
    const list = qs('#sc-hero-slides'); if (!list) return;
    list.appendChild(buildHeroSlideItem({}, list.children.length));
  }
  function addBlankService() {
    const list = qs('#sc-service-list'); if (!list) return;
    list.appendChild(buildServiceItem({}, list.children.length));
  }

  function collectSiteFromUI() {
    // Preserve existing data for fields not edited via UI
    const existing = window.siteContent || {};

    const out = {
      hero: {
        label: existing.hero?.label || 'SOUND CORE STUDIO',
        title: linkifyHtml(qs('#sc-hero-title')?.value || ''),
        subtitle: linkifyHtml(qs('#sc-hero-subtitle')?.value || ''),
        info: linkifyHtml(qs('#sc-hero-info')?.value || ''),
        slides: Array.from(qs('#sc-hero-slides')?.children || []).map(el => ({
          img: el.querySelector('.sc-slide-img')?.value?.trim() || '',
          alt: el.querySelector('.sc-slide-alt')?.value?.trim() || ''
        })).filter(x => x.img),
        buttons: existing.hero?.buttons || [
          { text: '開始探索', link: './explore.html', style: 'primary' },
          { text: '了解更多', link: '#about', style: 'outline' }
        ]
      },
      philosophy: {
        label: qs('#sc-phil-label')?.value?.trim() || '',
        title: linkifyHtml(qs('#sc-phil-title')?.value || ''),
        content: linkifyHtml(qs('#sc-phil-content')?.value || ''),
        img: qs('#sc-phil-img')?.value?.trim() || ''
      },
      services: Array.from(qs('#sc-service-list')?.children || []).map(el => ({
        title: el.querySelector('.sc-svc-title')?.value?.trim() || '',
        desc: el.querySelector('.sc-svc-desc')?.value?.trim() || '',
        icon: el.querySelector('.sc-svc-icon')?.value?.trim() || '',
        link: el.querySelector('.sc-svc-link')?.value?.trim() || '',
        img: el.querySelector('.sc-svc-image')?.value?.trim() || ''
      })).filter(x => x.title),
      // Preserve existing sections not edited in admin
      sdgs: existing.sdgs || [],
      resources: existing.resources || {},
      blogPosts: existing.blogPosts || [],
      map: existing.map || {}
    };
    return out; // Return flat siteContent, not wrapped
  }

  // Global Binding for Site Editor Buttons
  document.addEventListener('click', e => {
    if (!e.target) return;
    if (e.target.id === 'sc-add-slide') { e.preventDefault(); addBlankSlide(); }
    if (e.target.id === 'sc-add-service') { e.preventDefault(); addBlankService(); }

    // Delegation for dynamic items
    if (e.target.closest('.sc-slide-del')) e.target.closest('[data-index]').remove();
    if (e.target.closest('.sc-slide-up')) {
      const el = e.target.closest('[data-index]');
      if (el.previousElementSibling) el.parentNode.insertBefore(el, el.previousElementSibling);
    }
    if (e.target.closest('.sc-slide-down')) {
      const el = e.target.closest('[data-index]');
      if (el.nextElementSibling) el.parentNode.insertBefore(el.nextElementSibling, el);
    }

    if (e.target.closest('.sc-svc-del')) e.target.closest('[data-index]').remove();
    if (e.target.closest('.sc-svc-up')) {
      const el = e.target.closest('[data-index]');
      if (el.previousElementSibling) el.parentNode.insertBefore(el, el.previousElementSibling);
    }
    if (e.target.closest('.sc-svc-down')) {
      const el = e.target.closest('[data-index]');
      if (el.nextElementSibling) el.parentNode.insertBefore(el.nextElementSibling, el);
    }
  });
  qs('#sc-add-intro')?.addEventListener('click', () => addBlankIntro());
  qs('#sc-intro-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const list = qs('#sc-intro-list'); const item = e.target.closest('div[data-index]'); if (!list || !item) return;
    const idx = Array.from(list.children).indexOf(item);
    const play = captureListAnimation(list);
    if (btn.classList.contains('sc-intro-del')) { item.remove(); play(); return; }
    if (btn.classList.contains('sc-intro-up') && idx > 0) { list.insertBefore(item, list.children[idx - 1]); play(); flash(item); return; }
    if (btn.classList.contains('sc-intro-down') && idx < list.children.length - 1) { list.insertBefore(list.children[idx + 1], item); play(); flash(item); return; }
    if (btn.classList.contains('sc-intro-dup')) { const clone = item.cloneNode(true); list.insertBefore(clone, list.children[idx + 1]); play(); flash(clone); return; }
  });
  // Site｜平台導覽 圖片預覽/上傳
  qs('#sc-intro-list')?.addEventListener('input', (e) => {
    const inp = e.target.closest('.sc-intro-image'); if (!inp) return;
    const item = inp.closest('div[data-index]'); if (item) updateIntroPreview(item);
  });
  qs('#sc-intro-list')?.addEventListener('change', async (e) => {
    const up = e.target.closest('.sc-intro-upload'); if (!up) return;
    const item = up.closest('div[data-index]'); if (!item) return;
    const file = up.files?.[0]; if (!file) return;
    up.disabled = true;
    try {
      const pv = item.querySelector('.sc-intro-preview'); if (pv) pv.classList.add('is-uploading');
      const ph = await uploadFileAndGetPlaceholder(file);
      const input = item.querySelector('.sc-intro-image'); if (input) input.value = ph;
      updateIntroPreview(item);
      if (window.Toast) Toast.show('圖片已加入（待發佈）', 'success', 2000);
    } catch (err) { if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000); }
    finally { up.value = ''; up.disabled = false; const pv = item.querySelector('.sc-intro-preview'); if (pv) pv.classList.remove('is-uploading'); }
  });

  // Site｜服務項目事件
  qs('#sc-add-service')?.addEventListener('click', () => addBlankService());
  qs('#sc-service-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const list = qs('#sc-service-list'); const item = e.target.closest('div[data-index]'); if (!list || !item) return;
    const idx = Array.from(list.children).indexOf(item);
    const play = captureListAnimation(list);
    if (btn.classList.contains('sc-svc-del')) { item.remove(); play(); return; }
    if (btn.classList.contains('sc-svc-up') && idx > 0) { list.insertBefore(item, list.children[idx - 1]); play(); flash(item); return; }
    if (btn.classList.contains('sc-svc-down') && idx < list.children.length - 1) { list.insertBefore(list.children[idx + 1], item); play(); flash(item); return; }
    if (btn.classList.contains('sc-svc-dup')) { const clone = item.cloneNode(true); list.insertBefore(clone, list.children[idx + 1]); play(); flash(clone); return; }
  });
  // Site｜服務 圖片預覽/上傳
  qs('#sc-service-list')?.addEventListener('input', (e) => {
    const inp = e.target.closest('.sc-svc-image'); if (!inp) return;
    const item = inp.closest('div[data-index]'); if (item) updateServicePreview(item);
  });
  qs('#sc-service-list')?.addEventListener('change', async (e) => {
    const up = e.target.closest('.sc-svc-upload'); if (!up) return;
    const item = up.closest('div[data-index]'); if (!item) return;
    const file = up.files?.[0]; if (!file) return;
    up.disabled = true;
    try {
      const pv = item.querySelector('.sc-svc-preview'); if (pv) pv.classList.add('is-uploading');
      const ph = await uploadFileAndGetPlaceholder(file);
      const input = item.querySelector('.sc-svc-image'); if (input) input.value = ph;
      updateServicePreview(item);
      if (window.Toast) Toast.show('圖片已加入（待發佈）', 'success', 2000);
    } catch (err) { if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000); }
    finally { up.value = ''; up.disabled = false; const pv = item.querySelector('.sc-svc-preview'); if (pv) pv.classList.remove('is-uploading'); }
  });

  // Site｜Philosophy 圖片預覽/上傳
  qs('#sc-phil-img')?.addEventListener('input', (e) => {
    const preview = qs('#sc-phil-preview-img');
    if (preview) preview.src = e.target.value || '';
  });
  qs('#sc-phil-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const input = qs('#sc-phil-img');
    const preview = qs('#sc-phil-preview-img');
    try {
      const ph = await uploadFileAndGetPlaceholder(file);
      if (input) input.value = ph;
      if (preview) preview.src = previewCache[ph] || ph;
      if (window.Toast) Toast.show('圖片已加入（待發佈）', 'success', 2000);
    } catch (err) {
      if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000);
    } finally {
      e.target.value = '';
    }
  });

  // Site｜Story 圖片：上傳、刪除、上下移、即時預覽
  qs('#sc-story-upload')?.addEventListener('change', async (e) => {
    try {
      const files = Array.from(e.target?.files || []); if (!files.length) return;
      const tip = qs('#sc-story-loading'); if (tip) tip.textContent = '上傳中…';
      const list = qs('#sc-story-list'); if (list) list.classList.add('is-uploading');
      const arr = parseStoryImages();
      for (const f of files) {
        const ph = await uploadFileAndGetPlaceholder(f);
        arr.push(ph);
      }
      writeStoryImages(arr); renderStoryList();
      if (tip) tip.textContent = '已加入（待發佈）';
      setTimeout(() => { if (tip) tip.textContent = ''; }, 1200);
      e.target.value = '';
    } catch (err) { if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000); }
    finally { const list = qs('#sc-story-list'); if (list) list.classList.remove('is-uploading'); }
  });
  qs('#sc-story-images')?.addEventListener('input', () => renderStoryList());
  qs('#sc-story-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const list = qs('#sc-story-list'); if (!list) return;
    const item = e.target.closest('[data-index]'); if (!item) return;
    const idx = Array.from(list.children).indexOf(item);
    const imgs = parseStoryImages();
    const play = captureListAnimation(list);
    if (btn.classList.contains('sc-story-del')) {
      const removed = imgs.splice(idx, 1)[0];
      if (removed && previewCache[removed]) delete previewCache[removed];
      writeStoryImages(imgs); renderStoryList(); play(); return;
    }
    if (btn.classList.contains('sc-story-up') && idx > 0) {
      const [m] = imgs.splice(idx, 1); imgs.splice(idx - 1, 0, m);
      writeStoryImages(imgs); renderStoryList(); play(); return;
    }
    if (btn.classList.contains('sc-story-down') && idx < imgs.length - 1) {
      const [m] = imgs.splice(idx, 1); imgs.splice(idx + 1, 0, m);
      writeStoryImages(imgs); renderStoryList(); play(); return;
    }
  });

  // Story 圖片清單：拖曳排序與拖放上傳
  let __scStoryDragSrc = null;
  qs('#sc-story-list')?.addEventListener('dragstart', (e) => {
    const cell = e.target.closest('.sc-story-cell'); if (!cell) return;
    __scStoryDragSrc = cell; if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    cell.classList.add('drag-transition', 'dragging');
  });
  qs('#sc-story-list')?.addEventListener('dragover', (e) => {
    const dt = e.dataTransfer; if (!dt) return;
    const types = Array.from(dt.types || []);
    const isFiles = types.includes('Files');
    const isText = types.includes('text/uri-list') || types.includes('text/plain');
    if (isFiles || isText || e.target.closest('.sc-story-cell')) { e.preventDefault(); dt.dropEffect = isFiles ? 'copy' : (e.target.closest('.sc-story-cell') ? 'move' : 'link'); }
    const list = qs('#sc-story-list'); if ((isFiles || isText) && list) list.classList.add('dropzone-hover');
  });
  qs('#sc-story-list')?.addEventListener('dragenter', (e) => {
    const cell = e.target.closest('.sc-story-cell'); if (cell) cell.classList.add('drag-over');
  });
  qs('#sc-story-list')?.addEventListener('dragleave', (e) => {
    const cell = e.target.closest('.sc-story-cell'); if (cell) cell.classList.remove('drag-over');
  });
  qs('#sc-story-list')?.addEventListener('drop', async (e) => {
    const list = qs('#sc-story-list'); if (!list) return; const dt = e.dataTransfer; if (!dt) return;
    // 檔案拖放上傳
    if (dt.files && dt.files.length) {
      e.preventDefault();
      const tip = qs('#sc-story-loading'); if (tip) tip.textContent = '上傳中…';
      list.classList.add('is-uploading');
      const arr = parseStoryImages();
      try {
        let i = 0; const total = dt.files.length;
        for (const f of Array.from(dt.files)) {
          i++; if (tip) tip.textContent = `上傳中… (${i}/${total})`;
          try { const ph = await uploadFileAndGetPlaceholder(f); arr.push(ph); }
          catch (err) { if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000); }
        }
        writeStoryImages(arr); renderStoryList(); if (tip) tip.textContent = '已加入（待發佈）'; setTimeout(() => { if (tip) tip.textContent = ''; }, 1200);
      } finally { list.classList.remove('is-uploading'); list.classList.remove('dropzone-hover'); }
      return;
    }
    // 純文字/URL 拖放
    let text = '';
    try { text = (dt.getData('text/uri-list') || dt.getData('text/plain') || dt.getData('text') || '').trim(); } catch (e) { }
    if (text) { e.preventDefault(); const arr = parseStoryImages(); arr.push(text); writeStoryImages(arr); renderStoryList(); list.classList.remove('dropzone-hover'); return; }
    // 內部拖曳排序
    const dst = e.target.closest('.sc-story-cell'); if (!dst || !__scStoryDragSrc) return; e.preventDefault();
    const imgs = parseStoryImages();
    const a = parseInt(__scStoryDragSrc.dataset.index || '0', 10);
    const b = parseInt(dst.dataset.index || '0', 10);
    if (a !== b) { const [m] = imgs.splice(a, 1); imgs.splice(b, 0, m); writeStoryImages(imgs); renderStoryList(); }
    __scStoryDragSrc.classList.remove('dragging'); dst.classList.remove('drag-over');
    __scStoryDragSrc = null; list.classList.remove('dropzone-hover');
  });
  qs('#sc-story-list')?.addEventListener('dragend', () => {
    const list = qs('#sc-story-list');
    list?.querySelectorAll('.sc-story-cell.dragging,.sc-story-cell.drag-over')?.forEach(el => el.classList.remove('dragging', 'drag-over'));
    list?.classList.remove('dropzone-hover');
  });

  // Site｜首頁首圖欄位與上傳事件
  qs('#sc-hero-image')?.addEventListener('input', () => updateHeroPreview());
  qs('#sc-hero-upload')?.addEventListener('change', async (e) => {
    try {
      const file = e.target?.files?.[0]; if (!file) return;
      const pv = qs('#sc-hero-preview'); const tip = qs('#sc-hero-loading');
      if (pv) pv.classList.add('is-uploading'); if (tip) tip.textContent = '上傳中…';
      const ph = await uploadFileAndGetPlaceholder(file);
      const input = qs('#sc-hero-image'); if (input) { input.value = ph; }
      updateHeroPreview(); if (tip) tip.textContent = '已加入（待發佈）';
      setTimeout(() => { if (tip) tip.textContent = ''; }, 1600);
    } catch (err) { if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000); }
    finally { const pv = qs('#sc-hero-preview'); if (pv) pv.classList.remove('is-uploading'); }
  });

  // 初次進入頁面時依下拉狀態顯示/隱藏
  toggleSections();
  // 已改為各欄位以 <label> 包裹說明與輸入框，移除舊的自動補齊 caption 機制。

  // ===== 自訂下拉（資料集與 Provider）與插入連結 Modal =====
  function updateDsButtonLabelFromSelect() {
    try {
      const sel = qs('#ds-select'); const label = qs('#ds-button-label');
      if (!sel || !label) return;
      const v = sel.value;
      const map = { site: '主畫面（siteContent）', about: '關於我們（aboutContent）', providers: '探索資源平台（providers）' };
      label.textContent = map[v] || v;
    } catch (e) { }
  }
  function updatePvProvButtonLabelFromSelect() {
    try {
      const sel = qs('#pv-prov-select'); const label = qs('#pv-prov-button-label');
      if (!sel || !label) return;
      const opt = sel.options[sel.selectedIndex];
      label.textContent = (opt && opt.textContent) ? opt.textContent : '請選擇';
    } catch (e) { }
  }
  function bindDropdowns() {
    // DS dropdown
    const dsBtn = qs('#ds-button'); const dsMenu = qs('#ds-menu'); const dsSel = qs('#ds-select');
    function openDs() { if (!dsBtn || !dsMenu) return; dsMenu.classList.remove('opacity-0', 'scale-95', 'pointer-events-none'); dsMenu.classList.add('opacity-100', 'scale-100'); dsBtn.setAttribute('aria-expanded', 'true'); }
    function closeDs() { if (!dsBtn || !dsMenu) return; dsMenu.classList.add('opacity-0', 'scale-95', 'pointer-events-none'); dsMenu.classList.remove('opacity-100', 'scale-100'); dsBtn.setAttribute('aria-expanded', 'false'); }
    dsBtn?.addEventListener('click', (e) => { e.stopPropagation(); const isOpen = dsBtn.getAttribute('aria-expanded') === 'true'; isOpen ? closeDs() : openDs(); });
    dsMenu?.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-value]'); if (!b || !dsSel) return;
      const val = b.getAttribute('data-value');
      dsSel.value = val;
      // 觸發既有 change 事件邏輯
      try { dsSel.dispatchEvent(new Event('change', { bubbles: true })); } catch (err) { }
      updateDsButtonLabelFromSelect();
      closeDs();
    });
    document.addEventListener('click', (e) => { if (dsMenu && dsBtn && !dsMenu.contains(e.target) && !dsBtn.contains(e.target)) closeDs(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDs(); });

    // Provider dropdown
    const pvBtn = qs('#pv-prov-button'); const pvMenu = qs('#pv-prov-menu'); const pvSel = qs('#pv-prov-select');
    function openPv() { if (!pvBtn || !pvMenu) return; pvMenu.classList.remove('opacity-0', 'scale-95', 'pointer-events-none'); pvMenu.classList.add('opacity-100', 'scale-100'); pvBtn.setAttribute('aria-expanded', 'true'); }
    function closePv() { if (!pvBtn || !pvMenu) return; pvMenu.classList.add('opacity-0', 'scale-95', 'pointer-events-none'); pvMenu.classList.remove('opacity-100', 'scale-100'); pvBtn.setAttribute('aria-expanded', 'false'); }
    pvBtn?.addEventListener('click', (e) => { e.stopPropagation(); const isOpen = pvBtn.getAttribute('aria-expanded') === 'true'; isOpen ? closePv() : openPv(); });
    pvMenu?.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-value]'); if (!b || !pvSel) return;
      const val = b.getAttribute('data-value');
      pvSel.value = val;
      try { pvSel.dispatchEvent(new Event('change', { bubbles: true })); } catch (err) { }
      updatePvProvButtonLabelFromSelect();
      closePv();
    });
    document.addEventListener('click', (e) => { if (pvMenu && pvBtn && !pvMenu.contains(e.target) && !pvBtn.contains(e.target)) closePv(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePv(); });

    updateDsButtonLabelFromSelect();
    updatePvProvButtonLabelFromSelect();
  }

  // 插入連結 Modal
  function openLinkModal() {
    const modal = qs('#link-modal'); if (!modal) return;
    const url = qs('#link-url'); const txt = qs('#link-text');
    // 預填選取文字
    try {
      const el = activeEditable; if (el) {
        const s = typeof el.selectionStart === 'number' ? el.selectionStart : 0;
        const e = typeof el.selectionEnd === 'number' ? el.selectionEnd : s;
        activeSelStart = s; activeSelEnd = e;
        const val = el.value || ''; const sel = val.slice(s, e);
        if (txt) txt.value = sel;
      }
    } catch (err) { }
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.add('open'); }, 0);
    document.documentElement.classList.add('overflow-hidden');
    url?.focus();
  }
  function closeLinkModal() {
    const modal = qs('#link-modal'); if (!modal) return;
    modal.classList.remove('open');
    const hide = () => modal.classList.add('hidden');
    modal.addEventListener('transitionend', function onEnd(e) { if (e.target === modal) { modal.removeEventListener('transitionend', onEnd); hide(); } });
    setTimeout(() => { hide(); }, 200);
    document.documentElement.classList.remove('overflow-hidden');
  }
  function insertLinkFromModal() {
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
    const start = (activeSelStart != null ? activeSelStart : (el.selectionStart || 0));
    const end = (activeSelEnd != null ? activeSelEnd : (el.selectionEnd || start));
    const val = el.value || '';
    const sel = textVal || val.slice(start, end) || url;
    const safeHref = url.replace(/"/g, '%22');
    const styles = [];
    if (color) styles.push(`color:${color}`);
    if (font) styles.push(`font-family:${font}`);
    if (sizePx) styles.push(`font-size:${sizePx}px`);
    const styleAttr = styles.length ? ` style="${styles.join(';')}"` : '';
    const a = `<a href="${safeHref}" target="_blank" rel="noopener"${styleAttr}>${sel}</a>`;
    el.value = val.slice(0, start) + a + val.slice(end);
    try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { }
    el.focus();
    const pos = start + a.length; el.setSelectionRange(pos, pos);
    // 清除暫存選取範圍
    activeSelStart = null; activeSelEnd = null;
    closeLinkModal();
  }
  function bindLinkModal() {
    qs('#link-cancel')?.addEventListener('click', () => closeLinkModal());
    qs('#link-insert')?.addEventListener('click', () => insertLinkFromModal());
    qs('#link-modal')?.addEventListener('click', (e) => { const t = e.target; if (t && (t.id === 'link-modal' || t.classList.contains('overlay-bg'))) closeLinkModal(); });
    // 在 Modal 內按 Enter 直接插入（避免換行；此處只有 input/select）
    qs('#link-modal')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); insertLinkFromModal(); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLinkModal(); });
  }

  // ==============================
  // Live Preview (Site/About/Provider)
  // ==============================
  function debounce(fn, wait) { let t = null; return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); }; }
  function pvwRoot() { return qs('#live-preview-viewport'); }
  function setPreviewSize(mode) {
    const vp = pvwRoot(); if (!vp) return;
    vp.classList.remove('pvw-mobile', 'pvw-tablet', 'pvw-desktop');
    vp.classList.add('pvw-' + (mode || 'desktop'));
    const ids = ['pvw-mobile', 'pvw-tablet', 'pvw-desktop'];
    ids.forEach(id => { const b = qs('#' + id); if (b) { const on = id.endsWith(mode); b.setAttribute('aria-pressed', on ? 'true' : 'false'); } });
  }
  function bindPreviewControls() {
    // Toggle preview panel visibility
    const tgl = qs('#btn-toggle-preview');
    const panel = qs('#preview-panel');
    if (tgl && panel) {
      const adminPanel = qs('#admin-panel');
      function openPanel() {
        panel.classList.remove('hidden');
        void panel.offsetHeight;
        panel.classList.add('open');
        // 隱藏編輯區（含 About/Providers/Site 視覺化）
        if (adminPanel) adminPanel.classList.add('preview-edit-hidden');
      }
      function closePanel() {
        panel.classList.remove('open');
        const onEnd = (e) => { if (e.target === panel) { panel.classList.add('hidden'); panel.removeEventListener('transitionend', onEnd); } };
        panel.addEventListener('transitionend', onEnd);
        setTimeout(() => { panel.removeEventListener('transitionend', onEnd); panel.classList.add('hidden'); }, 260);
        // 顯示編輯區
        if (adminPanel) adminPanel.classList.remove('preview-edit-hidden');
      }
      tgl.addEventListener('click', () => {
        const willOpen = panel.classList.contains('hidden') || !panel.classList.contains('open');
        if (willOpen) {
          openPanel();
          tgl.textContent = '編結內容';
          tgl.setAttribute('aria-pressed', 'true');
          try { renderLivePreview(); } catch (e) { }
        } else {
          closePanel();
          tgl.textContent = '預覽';
          tgl.setAttribute('aria-pressed', 'false');
        }
      });
    }

    // Device size controls (optional). If not present, keep responsive width.
    const hasControls = qs('#pvw-mobile') || qs('#pvw-tablet') || qs('#pvw-desktop');
    if (hasControls) {
      qs('#pvw-mobile')?.addEventListener('click', () => setPreviewSize('mobile'));
      qs('#pvw-tablet')?.addEventListener('click', () => setPreviewSize('tablet'));
      qs('#pvw-desktop')?.addEventListener('click', () => setPreviewSize('desktop'));
      setPreviewSize('desktop');
    } else {
      const vp = pvwRoot(); if (vp) vp.classList.remove('pvw-mobile', 'pvw-tablet', 'pvw-desktop');
    }
  }

  // 解析 GAS 佔位符為可預覽的 dataURL（若有）
  function resolveImage(u) {
    if (!u) return '';
    if (/^gas:\/\/image\//.test(u) && previewCache && previewCache[u]) return previewCache[u];
    return u;
  }

  function renderPreviewSite(siteObj) {
    const vp = pvwRoot(); if (!vp) return;
    const d = siteObj && siteObj.index || {};
    const heroUrl = resolveImage(d.heroImage || '').replace(/\"/g, '&quot;');
    function esc(s) { return (s == null ? '' : String(s)); }
    function isYT(u) { return /youtube\.com\/watch\?v=|youtu\.be\//.test(u || ''); }
    function ytId(u) { const m = (u || '').match(/[?&]v=([^&]+)|youtu\.be\/([^?&]+)/); return (m && (m[1] || m[2])) || ''; }
    function isVimeo(u) { return /vimeo\.com\//.test(u || ''); }
    function vimeoId(u) { const m = (u || '').match(/vimeo\.com\/(\d+)/); return (m && m[1]) || ''; }
    const svc = Array.isArray(d.services) ? d.services : [];
    const intro = Array.isArray(d.platformIntro) ? d.platformIntro : [];
    const imgs = Array.isArray(d.story?.images) ? d.story.images : [];
    vp.innerHTML = `
      <div class="space-y-10">
        <section>
          <div id="hero" class="hero-banner" style="${heroUrl ? `background-image:url('${heroUrl}')` : ''}">
            <div class="hero-band">
              <h1 id="hero-title" class="hero-title">${esc(d.heroTitle || '')}</h1>
              <p id="hero-subtitle" class="hero-subtitle">${d.heroSubtitle || ''}</p>
            </div>
          </div>
        </section>

        ${(d.story && (d.story.heading || d.story.body || imgs.length)) ? `
        <section id="story-section">
          <div class="grid md:grid-cols-2 gap-8 items-start">
            <div class="space-y-4">
              ${d.story.heading ? `<h2 class="text-3xl md:text-4xl font-extrabold">${esc(d.story.heading)}</h2>` : ''}
              ${d.story.body ? `<div class="prose prose-lg dark:prose-invert max-w-none leading-relaxed">${d.story.body}</div>` : ''}
            </div>
            <div class="grid grid-cols-2 gap-3">
              ${imgs.slice(0, 4).map((u, i) => { const src = resolveImage(u); return `<div class=\"rounded-lg overflow-hidden shadow\"><img src=\"${src}\" alt=\"story${i + 1}\" class=\"w-full h-40 md:h-52 object-cover\"></div>`; }).join('')}
            </div>
          </div>
        </section>`: ''}

        <section id="platform-intro" class="space-y-8">
          ${intro.map((it, idx) => {
      const left = (idx % 2 === 0);
      const url = resolveImage(it.image || `https://picsum.photos/seed/intro${idx + 1}/1200/800`);
      return `
            <div class="intro-row grid md:grid-cols-2 gap-8 items-center">
              <div class="${left ? 'md:order-1' : 'md:order-2'} order-1">
                <div class="intro-imgwrap ${left ? 'zig-right' : 'zig-left'} shadow-lg">
                  <img src="${url}" alt="${esc(it.title || '')}" class="w-full h-64 md:h-80 object-cover" />
                </div>
              </div>
              <div class="${left ? 'md:order-2' : 'md:order-1'} order-2">
                <div class="pl-8 p-2 md:p-3">
                  <h3 class="text-2xl font-bold mb-2">${esc(it.title || '')}</h3>
                  <p class="text-lg text-gray-700 dark:text-gray-300">${it.text || ''}</p>
                  ${it.details ? `<div class="collapse-content mt-3"><p class="text-base md:text-lg text-gray-700 dark:text-gray-200">${it.details}</p></div>` : ''}
                </div>
              </div>
            </div>`;
    }).join('')}
        </section>

        <section>
          <h3 id="services-title" class="text-xl font-semibold mb-3">${esc(d.servicesTitle || '服務項目')}</h3>
          <div id="services-list" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            ${svc.map(s => {
      const img = resolveImage(s.image || '');
      return `
              <div class="relative h-72 rounded-2xl overflow-hidden shadow-lg group">
                ${img ? `<img src="${img}" alt="${esc(s.title || '')}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">` : ''}
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                <div class="absolute bottom-4 left-4"><span class="px-3 py-1 rounded-full bg-white text-gray-900 text-sm font-semibold shadow">${esc(s.title || '')}</span></div>
              </div>`;
    }).join('')}
          </div>
        </section>

        <section id="video-section">
          ${d.video?.title ? `<div id="video-title" class="text-xl font-semibold mb-3">${esc(d.video.title)}</div>` : ''}
          <div id="index-video" class="aspect-video rounded overflow-hidden bg-gray-200 dark:bg-gray-700 grid place-items-center">
            ${(() => {
        const url = d.video?.url || ''; if (!url) return '<div class="text-sm text-gray-500 dark:text-gray-300">尚未設定影片</div>';
        if (isYT(url)) return `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${ytId(url)}" allowfullscreen></iframe>`;
        if (isVimeo(url)) return `<iframe class="w-full h-full" src="https://player.vimeo.com/video/${vimeoId(url)}" allowfullscreen></iframe>`;
        if (/\.mp4(\?|$)/i.test(url)) return `<video class="w-full h-full" controls src="${url}"></video>`;
        return `<a class="link-cta" href="${url}" target="_blank" rel="noopener">前往觀看 <span class="arrow">→</span></a>`;
      })()}
          </div>
        </section>
      </div>`;
  }

  function renderPreviewAbout(obj) {
    const vp = pvwRoot(); if (!vp) return;
    const data = obj || {};
    const team = Array.isArray(data.team) ? data.team : [];
    vp.innerHTML = `
      <div class="space-y-10">
        <header class="text-center">
          <h1 class="heading-display">${(data.heroTitle || '關於我們')}</h1>
          <p class="mt-3 lead-text text-gray-700 dark:text-gray-300">${data.lead || ''}</p>
        </header>
        <section>
          <h2 class="heading-section mb-6">${data.modelTitle || '四階段引導模型'}</h2>
          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            ${(Array.isArray(data.model) ? data.model : []).map(m => `
              <div class="p-6 shadow-lg rounded-lg bg-gray-50 dark:bg-gray-800">
                <h3 class="font-semibold mb-2">${m.title || ''}</h3>
                <p class="text-gray-700 dark:text-gray-300 text-sm">${m.desc || ''}</p>
                ${m.href ? `<div class="mt-3"><a class="link-cta small" href="${m.href}" target="_blank" rel="noopener">${m.linkText || '前往連結'} <span class="arrow">→</span></a></div>` : ''}
              </div>`).join('')}
          </div>
        </section>
        ${team.length ? `
        <section>
          <h2 class="heading-section mb-6 text-center">Our Team.</h2>
          <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            ${team.map(t => `
              <article class="overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900">
                ${t.photo ? `<img class=\"w-full h-64 object-cover\" src=\"${resolveImage(t.photo)}\" alt=\"${t.name || ''}\">` : ''}
                <div class="p-5 space-y-3">
                  <div class="flex items-center gap-2 flex-wrap">${(t.roles || []).map(r => `<span class='inline-block px-2 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'>${r}</span>`).join('')}</div>
                  <h3 class="text-xl font-semibold">${t.name || ''}</h3>
                  ${t.motto ? `<blockquote class="text-gray-800 dark:text-gray-100 text-base italic">${t.motto}</blockquote>` : ''}
                </div>
              </article>`).join('')}
          </div>
        </section>`: ''}
        <section>
          <h2 class="heading-section mb-6">${data.achievementsTitle || '成就經歷'}</h2>
          <ul class="space-y-2 text-lg text-gray-700 dark:text-gray-300">
            ${(Array.isArray(data.achievements) ? data.achievements : []).map(a => {
      if (typeof a === 'string') { return `<li>${a}</li>`; }
      if (a && a.href) { return `<li><a class='link-cta outcard' href='${a.href}' target='_blank' rel='noopener'>${a.text || ''} <span class='arrow'>→</span></a></li>`; }
      const t = a && (a.text || a.title) || ''; return `<li>${t}</li>`;
    }).join('')}
          </ul>
        </section>
      </div>`;
  }

  function renderPreviewProvider(p) {
    const vp = pvwRoot(); if (!vp) return;
    const cases = Array.isArray(p.cases) ? p.cases : [];
    const textOnly = cases.filter(c => !(c && ((Array.isArray(c.images) && c.images.length) || c.video)));
    const withMedia = cases.filter(c => !textOnly.includes(c));
    function mediaBlock(c) {
      if (Array.isArray(c.images) && c.images.length) {
        const src = resolveImage(c.images[0]);
        return `<div class='rounded-lg overflow-hidden'><img src='${src}' alt='${c.title || ''}' class='w-full h-56 object-cover'/></div>`;
      }
      if (c.video) { return `<div class='w-full aspect-video rounded-lg overflow-hidden bg-black text-white grid place-items-center'><span class='text-sm'>影片</span></div>`; }
      return '';
    }
    vp.innerHTML = `
      <div class="space-y-10">
        <header>
          <h1 class="text-3xl md:text-4xl font-bold">${p.name || ''}</h1>
          ${p.category ? `<div class="mt-2 inline-block bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 text-sm px-2 py-1 rounded">${p.category}</div>` : ''}
          ${p.description ? `<p class="mt-4 text-gray-700 dark:text-gray-300">${p.description}</p>` : ''}
        </header>
        <section class="grid md:grid-cols-3 gap-6">
          <div class="p-6 rounded-lg bg-gray-50 dark:bg-gray-800 shadow">
            <div class="text-gray-500 text-sm">課程時間</div>
            <div class="font-semibold mt-1">${p.schedule || '-'}</div>
          </div>
          <div class="p-6 rounded-lg bg-gray-50 dark:bg-gray-800 shadow md:col-span-2">
            <div class="text-gray-500 text-sm">地點</div>
            <div class="font-semibold mt-1">${[p.location || '', p.address || ''].filter(Boolean).join(' ') || '-'}</div>
          </div>
        </section>
        ${Array.isArray(p.timeline) && p.timeline.length ? `
        <section>
          <h2 class="text-2xl font-bold mb-4">課程安排（時間軸）</h2>
          <div class="space-y-3">
            ${p.timeline.map(t => `<div><div class='text-sm text-gray-500'>${t.time || ''}</div><div class='font-semibold'>${t.title || ''}</div><div class='text-gray-600 dark:text-gray-300'>${t.detail || ''}</div></div>`).join('')}
          </div>
        </section>`: ''}
        ${(withMedia.length || textOnly.length) ? `
        <section>
          <h2 class="text-2xl font-bold mb-4">精選案例</h2>
          ${withMedia.length ? `<div class='grid sm:grid-cols-2 lg:grid-cols-3 gap-4'>${withMedia.map(c => `<article class='p-4 rounded-lg bg-gray-50 dark:bg-gray-800 shadow'>${mediaBlock(c)}<h3 class='mt-3 font-semibold'>${c.title || ''}</h3>${c.summary ? `<p class='text-gray-600 dark:text-gray-300 text-sm'>${c.summary}</p>` : ''}</article>`).join('')}</div>` : ''}
          ${textOnly.length ? `<ul class='mt-6 space-y-3'>${textOnly.map(c => `<li class='p-4 rounded-lg bg-gray-50 dark:bg-gray-800 shadow'><div class='font-semibold'>${c.title || ''}</div>${c.summary ? `<div class='text-gray-600 dark:text-gray-300'>${c.summary}</div>` : ''}</li>`).join('')}</ul>` : ''}
        </section>`: ''}
      </div>`;
  }

  function renderPreviewBlog(data) {
    const vp = pvwRoot(); if (!vp) return;
    const posts = Array.isArray(data.posts) ? data.posts : [];
    vp.innerHTML = `
        <div class="space-y-8">
           <h1 class="text-3xl font-bold">資源與部落格 (Preview)</h1>
           <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
             ${posts.map(p => `
               <article class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow">
                  <div class="h-48 overflow-hidden bg-gray-200">
                     ${p.cover ? `<img src="${p.cover}" class="w-full h-full object-cover">` : ''}
                  </div>
                  <div class="p-4">
                     <div class="text-xs text-gray-500 mb-1">${p.date || ''}</div>
                     <h3 class="font-bold text-lg mb-2 line-clamp-2">${p.title || '無標題'}</h3>
                     <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">${p.summary || ''}</p>
                  </div>
               </article>
             `).join('')}
           </div>
        </div>
     `;
  }

  function renderLivePreview() {
    const iframe = qs('#preview-iframe');
    const label = qs('#preview-page-label');
    if (!iframe) return;

    const sel = qs('#ds-select')?.value || 'site';

    // Determine which page to load based on dataset
    let pagePath = './index.html';
    let dataKey = 'siteContent';
    let collectFn = null;

    if (sel === 'site') {
      pagePath = './index.html';
      dataKey = 'siteContent';
      collectFn = collectSiteFromUI;
    } else if (sel === 'about') {
      pagePath = './about.html';
      dataKey = 'aboutContent';
      collectFn = collectAboutFromUI;
    } else if (sel === 'blog') {
      pagePath = './blog.html';
      dataKey = 'blogContent';
      collectFn = collectBlogFromUI;
    } else if (sel === 'providers') {
      pagePath = './explore.html';
      dataKey = 'providersData';
      collectFn = () => {
        const root = getEditorJSON();
        const id = qs('#pv-prov-select')?.value;
        if (!id) return root;
        const base = root[id] || {};
        const merged = { ...base, ...collectBasicFields() };
        merged.timeline = collectTimeline();
        merged.cases = collectCasesFromUI();
        root[id] = merged;
        return root;
      };
    }

    if (label) label.textContent = pagePath.replace('./', '');

    // Collect current edited data
    const editedData = collectFn ? collectFn() : {};

    // Create a blob URL with the page that injects data before loading scripts
    // This approach: load page in iframe, then use srcdoc with injected data

    // Simpler approach: use postMessage after load
    // First load the page, then send data to override

    // We'll use the srcdoc approach to inject data before page scripts run
    fetch(pagePath)
      .then(res => res.text())
      .then(html => {
        // Inject data override script before closing </head> or at start of <body>
        const dataScript = `
<script>
// Admin preview data injection
window.__ADMIN_PREVIEW__ = true;
window.${dataKey} = ${JSON.stringify(editedData, null, 2)};
// Also set aboutContent for index.html Team section if editing site
${sel === 'site' ? `window.aboutContent = ${JSON.stringify(window.aboutContent || {}, null, 2)};` : ''}
</script>
`;
        // Insert after <head> opening or before first <script>
        let modifiedHtml;
        if (html.includes('<head>')) {
          modifiedHtml = html.replace('<head>', '<head>' + dataScript);
        } else if (html.includes('<body>')) {
          modifiedHtml = html.replace('<body>', '<body>' + dataScript);
        } else {
          modifiedHtml = dataScript + html;
        }

        // Remove nav and footer placeholders to keep preview clean
        modifiedHtml = modifiedHtml.replace(/<div id="nav-placeholder"><\/div>/gi, '');
        modifiedHtml = modifiedHtml.replace(/<div id="footer-placeholder"><\/div>/gi, '');
        // Also remove navFooter.js script
        modifiedHtml = modifiedHtml.replace(/<script src="\.\/js\/navFooter\.js"><\/script>/gi, '');

        // CRITICAL FIX: Remove original data scripts that would overwrite injected data
        // These scripts load window.aboutContent, window.siteContent, etc. from js/data/*.js
        // and would overwrite our injected edited data. Must remove them!
        modifiedHtml = modifiedHtml.replace(/<script[^>]*src="[^"]*\/data\/aboutContent\.js[^"]*"[^>]*><\/script>/gi, '');
        modifiedHtml = modifiedHtml.replace(/<script[^>]*src="[^"]*\/data\/siteContent\.js[^"]*"[^>]*><\/script>/gi, '');
        modifiedHtml = modifiedHtml.replace(/<script[^>]*src="[^"]*\/data\/providers\.js[^"]*"[^>]*><\/script>/gi, '');
        modifiedHtml = modifiedHtml.replace(/<script[^>]*src="[^"]*\/data\/blogContent\.js[^"]*"[^>]*><\/script>/gi, '');
        modifiedHtml = modifiedHtml.replace(/<script[^>]*src="[^"]*navFooter\.js[^"]*"[^>]*><\/script>/gi, '');

        iframe.srcdoc = modifiedHtml;
      })
      .catch(err => {
        console.error('Preview load error:', err);
        iframe.srcdoc = '<div style="padding:2rem;color:red;">預覽載入失敗: ' + err.message + '</div>';
      });
  }

  function bindPreviewLive() {
    // Increased debounce for iframe-based preview (loading page takes time)
    const deb = debounce(renderLivePreview, 500);
    const panel = qs('#admin-panel');
    panel?.addEventListener('input', (e) => { const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) deb(); });
    panel?.addEventListener('change', () => deb());
    panel?.addEventListener('click', (e) => {
      const btn = e.target.closest('button'); if (!btn) return;
      // 結構變動（新增/刪除/排序）後也更新預覽
      setTimeout(deb, 0);
    });
  }

  // 綁定自訂下拉、連結 Modal、預覽控制（確保在 DOM 準備之後）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { bindDropdowns(); bindLinkModal(); bindPreviewControls(); bindPreviewLive(); try { renderLivePreview(); } catch (e) { } });
  } else {
    bindDropdowns(); bindLinkModal(); bindPreviewControls(); bindPreviewLive(); try { renderLivePreview(); } catch (e) { }
  }
  // ===== Blog Editor Logic (Schema: id, title, date, category, excerpt, image, link, content) =====
  function buildPostItem(p = {}, idx = 0) {
    const wrap = document.createElement('div');
    wrap.className = 'p-4 rounded-lg bg-gray-50 dark:bg-gray-800 shadow relative';
    wrap.dataset.index = String(idx);

    // Ensure ID exists
    const pid = p.id || ('post-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5));
    // Default link to blog.html if empty
    const plink = p.link || './blog.html';

    wrap.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
           <h4 class="font-bold text-gray-700 dark:text-gray-200">#${idx + 1}</h4>
           <span class="text-xs text-gray-400 font-mono">${pid}</span>
           <input type="hidden" class="bl-id" value="${pid}">
        </div>
        <div class="flex gap-2">
            <a href="${plink}" target="_blank" class="btn-soft btn-blue bl-view text-xs no-underline flex items-center" title="查看文章">
              <i class="fas fa-external-link-alt mr-1"></i> 查看
            </a>
            <button type="button" class="btn-soft btn-yellow bl-move-up" title="上移">↑</button>
            <button type="button" class="btn-soft btn-yellow bl-move-down" title="下移">↓</button>
            <button type="button" class="btn-soft btn-purple bl-del" title="刪除">×</button>
        </div>
      </div>
      <div class="grid admin-grid gap-4">
        <label class="text-sm">標題 (title)
          <input class="bl-title w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${escHtml(p.title)}">
        </label>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label class="text-sm">日期 (date)
              <input type="text" class="bl-date w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${p.date || ''}" placeholder="YYYY/MM/DD">
            </label>
             <label class="text-sm">類別 (category)
              <input class="bl-category w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${escHtml(p.category || '')}" placeholder="如：news, daily, interview">
            </label>
             <label class="text-sm">連結 (link)
              <input class="bl-link w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${escHtml(plink)}" placeholder="./blog.html">
            </label>
        </div>
         <label class="text-sm">摘要 (excerpt)
          <textarea class="bl-excerpt w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="2">${escHtml(p.excerpt)}</textarea>
        </label>
         <label class="text-sm">圖片 (image)
           <div class="flex gap-2 items-end">
              <input class="bl-image flex-1 rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${escHtml(p.image || '')}" placeholder="./img/... 或上傳">
              <label class="btn-soft btn-blue text-xs cursor-pointer shrink-0">上傳<input type="file" class="hidden bl-image-upload" accept="image/*"></label>
              <div class="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden relative shrink-0">
                 <img src="${p.image || ''}" class="w-full h-full object-cover bl-image-preview" onerror="this.style.display='none'" onload="this.style.display='block'">
              </div>
           </div>
        </label>
      </div>
    `;

    // Bind events
    wrap.querySelector('.bl-del').onclick = () => wrap.remove();
    wrap.querySelector('.bl-move-up').onclick = () => { if (wrap.previousElementSibling) wrap.parentNode.insertBefore(wrap, wrap.previousElementSibling); };
    wrap.querySelector('.bl-move-down').onclick = () => { if (wrap.nextElementSibling) wrap.parentNode.insertBefore(wrap.nextElementSibling, wrap); };

    // Update View button href when link input changes
    const linkInput = wrap.querySelector('.bl-link');
    const viewBtn = wrap.querySelector('.bl-view');
    linkInput.addEventListener('input', () => {
      viewBtn.href = linkInput.value || '#';
    });

    // Live preview for image
    const imgInput = wrap.querySelector('.bl-image');
    const imgPreview = wrap.querySelector('.bl-image-preview');
    imgInput.addEventListener('input', () => {
      imgPreview.src = imgInput.value;
      imgPreview.style.display = 'block';
    });

    // Upload handler for image
    wrap.querySelector('.bl-image-upload').addEventListener('change', async (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      try {
        const ph = await uploadFileAndGetPlaceholder(file);
        imgInput.value = ph;
        imgPreview.src = previewCache[ph] || ph;
        imgPreview.style.display = 'block';
        if (window.Toast) Toast.show('圖片已加入（待發佈）', 'success', 2000);
      } catch (err) {
        if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000);
      } finally {
        e.target.value = '';
      }
    });

    return wrap;
  }

  function renderBlogEditor(data) {
    const list = qs('#bl-post-list');
    if (!list) return;
    list.innerHTML = '';
    const posts = Array.isArray(data.posts) ? data.posts : [];
    posts.forEach((p, i) => list.appendChild(buildPostItem(p, i)));

    // Bind Add button
    const addBtn = qs('#bl-add-post');
    if (addBtn) addBtn.onclick = () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}/${mm}/${dd}`;
      list.prepend(buildPostItem({ title: '新文章', date: dateStr, category: 'news', link: './blog.html' }, 0));
    };
  }

  function collectBlogFromUI() {
    const list = qs('#bl-post-list');
    if (!list) return { posts: [] };
    const posts = Array.from(list.children).map(el => {
      const get = sel => el.querySelector(sel);
      return {
        id: get('.bl-id')?.value || '',
        title: get('.bl-title')?.value || '',
        date: get('.bl-date')?.value || '',
        category: get('.bl-category')?.value || '',
        excerpt: get('.bl-excerpt')?.value || '',
        image: get('.bl-image')?.value || '',
        link: get('.bl-link')?.value || './blog.html'
      };
    });
    return { posts };
  }

})();
