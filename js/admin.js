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
// Admin UI for editing local js/data datasets, with GAS used only for auth/publish.
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

  function cloneData(obj) {
    try { return JSON.parse(JSON.stringify(obj || {})); } catch (e) { return obj || {}; }
  }

  function normalizeRepoImagePath(path) {
    const s = String(path || '').trim();
    if (!s) return '';
    if (/^(https?:|data:|blob:|\.\/|\/)/i.test(s)) return s;
    if (/^img\//i.test(s)) return './' + s;
    return s;
  }

  async function fileToDataUrl(file) {
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('讀檔失敗'));
      r.readAsDataURL(file);
    });
  }

  function replaceExt(filename, ext) {
    const clean = String(filename || 'image').replace(/\.[A-Za-z0-9]+$/, '') || 'image';
    return clean + '.' + ext;
  }

  async function prepareImageUpload(file) {
    const type = String(file && file.type || '').toLowerCase();
    if (type === 'image/svg+xml' || type === 'image/gif') {
      return { dataUrl: await fileToDataUrl(file), filename: file.name || 'image.png' };
    }
    const src = await fileToDataUrl(file);
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = function () {
        const maxSide = 1600;
        const w = img.naturalWidth || img.width || maxSide;
        const h = img.naturalHeight || img.height || maxSide;
        const ratio = Math.min(1, maxSide / Math.max(w, h));
        if (type === 'image/webp' && ratio >= 1 && file.size <= 900 * 1024) {
          resolve({ dataUrl: src, filename: file.name || 'image.webp' });
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * ratio));
        canvas.height = Math.max(1, Math.round(h * ratio));
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL('image/webp', 0.82), filename: replaceExt(file.name || 'image', 'webp') });
      };
      img.onerror = async function () {
        resolve({ dataUrl: await fileToDataUrl(file), filename: replaceExt(file.name || 'image', 'webp') });
      };
      img.src = src;
    });
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
  const SITE_IMAGE_LIBRARY = [
    'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/_a799b8ef-9cac-4078-8e34-851a4c93d040_045c08ee4c.webp',
    'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/_2026-06-10_015100_fec24d89d2.webp',
    'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/_-_.webp',
    'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/soundcore3co-title.webp',
    'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/soundcore3co-min.webp',
    'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/puzzle-404.webp',
    'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/index-bg.webp',
    'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/DSC09555___ba0754ae5a.webp',
    'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/DSC01739__8a8686e4b1_20250917_153644.webp',
    'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/DSC01739__8a8686e4b1.webp',
    'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/doctor_icon_142653_ce6d756a37.webp',
    'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/1000012756_61e30f039f.webp',
    'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/1000012016_6e6b5da647.webp',
    'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/1000010964_bdb0404a99.webp'
  ];
  let imagePickerTarget = null;

  function openAnimatedModal(modal) {
    if (!modal) return;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function closeAnimatedModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => modal.classList.add('hidden'), 210);
  }

  function showBusy(title, message) {
    const modal = qs('#admin-busy-overlay');
    if (!modal) return;
    const t = qs('#admin-busy-title');
    const m = qs('#admin-busy-message');
    if (t) t.textContent = title || '處理中';
    if (m) m.textContent = message || '請稍候，不要關閉頁面。';
    openAnimatedModal(modal);
  }

  function hideBusy() {
    closeAnimatedModal(qs('#admin-busy-overlay'));
  }

  async function withBusy(title, message, fn) {
    showBusy(title, message);
    try { return await fn(); }
    finally { hideBusy(); }
  }

  function confirmDialog(title, message, okText) {
    const modal = qs('#admin-confirm-modal');
    if (!modal) return Promise.resolve(confirm(message || title || '確認操作？'));
    qs('#admin-confirm-title').textContent = title || '確認操作';
    qs('#admin-confirm-message').textContent = message || '';
    const ok = qs('#admin-confirm-ok');
    const cancel = qs('#admin-confirm-cancel');
    if (ok) ok.textContent = okText || '確認';
    openAnimatedModal(modal);
    return new Promise(resolve => {
      function done(value) {
        ok?.removeEventListener('click', onOk);
        cancel?.removeEventListener('click', onCancel);
        modal.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
        closeAnimatedModal(modal);
        resolve(value);
      }
      function onOk() { done(true); }
      function onCancel() { done(false); }
      function onBackdrop(e) { if (e.target === modal || e.target.classList.contains('overlay-bg')) done(false); }
      function onKey(e) { if (e.key === 'Escape') done(false); if (e.key === 'Enter') done(true); }
      ok?.addEventListener('click', onOk);
      cancel?.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
    });
  }
  
  // 判斷是否使用 Wix 模式
  function isWixMode() {
    return window.AppConfig && window.AppConfig.isWixMode && window.AppConfig.isWixMode();
  }
  
  // 全域：上傳圖片並回傳實際前端可用路徑（通常為 ./img/...）
  async function uploadFileAndGetPlaceholder(file) {
    const t = (window.DataAPI && window.DataAPI.token && window.DataAPI.token()) || '';
    if (!t) throw new Error('未登入');
    const prepared = await prepareImageUpload(file);
    return await withBusy('圖片上傳中', '正在寫入遠端 img 資料夾，請稍候。', async () => {
    
      if (isWixMode()) {
        // Wix 模式：直接回傳 Wix CDN URL
        const base = (window.AppConfig && window.AppConfig.WIX_BASE_URL) || '';
        const ep = (window.AppConfig && window.AppConfig.wixEndpoints && window.AppConfig.wixEndpoints.uploadImage) || '';
        if (!base || !ep) throw new Error('未設定 Wix');

        const resp = await fetch(base + ep, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ token: t, dataUrl: prepared.dataUrl, filename: prepared.filename }) });
        if (!resp.ok) throw new Error('上傳失敗(' + resp.status + ')');
        const data = await resp.json();
        if (!data || !data.ok) throw new Error(data?.message || '上傳失敗');

        if (!data.url && !data.path) throw new Error('上傳成功但未回傳圖片路徑');
        return normalizeRepoImagePath(data.url || data.path);
      } else {
        // GAS 模式：圖片直接寫入 GitHub img/，資料欄位保存可公開讀取的路徑。
        const base = (window.AppConfig && window.AppConfig.GAS_BASE_URL) || '';
        const ep = (window.AppConfig && window.AppConfig.endpoints && window.AppConfig.endpoints.uploadImage) || '';
        if (!base || !ep) throw new Error('未登入或未設定 GAS');

        const resp = await fetch(base + ep, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ token: t, dataUrl: prepared.dataUrl, filename: prepared.filename }) });
        if (!resp.ok) throw new Error('上傳失敗(' + resp.status + ')');
        const data = await resp.json();
        if (!data || !data.ok) throw new Error(data && data.message || '上傳失敗');
        if (data.url || data.path) {
          const path = normalizeRepoImagePath(data.url || data.path);
          if (window.Toast) Toast.show('圖片已寫入 GitHub img：' + path, 'success', 2500);
          return path;
        }
        if (!data.id || !data.filename) throw new Error('上傳成功但未回傳圖片路徑');
        const ph = `gas://image/${data.id}/${data.filename}`;
        previewCache[ph] = prepared.dataUrl; // 舊版後端 fallback
        return ph;
      }
    });
  }

  function renderImagePicker(filterText) {
    const grid = qs('#image-picker-grid');
    if (!grid) return;
    const q = String(filterText || '').trim().toLowerCase();
    const items = SITE_IMAGE_LIBRARY.filter(src => !q || src.toLowerCase().includes(q));
    grid.innerHTML = items.length ? items.map(src => {
      const name = src.split('/').pop();
      return `<button type="button" class="image-picker-item" data-src="${escHtml(src)}" title="${escHtml(name)}">
        <img decoding="async" src="${escHtml(src)}" alt="${escHtml(name)}" loading="lazy">
        <span class="image-picker-name">${escHtml(name)}</span>
      </button>`;
    }).join('') : '<div class="text-sm text-gray-500 dark:text-gray-300">沒有符合的圖片。</div>';
  }

  function applyPickedImage(uploadInput, src) {
    if (!uploadInput || !src) return;
    const item = uploadInput.closest('div[data-index], article[data-index], .pv-imgmgr') || uploadInput.closest('section') || document;
    if (uploadInput.classList.contains('pv-img-upload')) {
      const mgr = uploadInput.closest('.pv-imgmgr');
      const caseEl = mgr?.closest('div[data-index]');
      const imgs = parseImagesFrom(caseEl);
      imgs.push(src);
      writeImagesTo(caseEl, imgs);
      renderImgList(caseEl);
      return;
    }
    if (uploadInput.id === 'sc-story-upload') {
      const arr = parseStoryImages();
      arr.push(src);
      writeStoryImages(arr);
      renderStoryList();
      return;
    }
    const fieldMap = [
      ['sc-slide-upload', '.sc-slide-img'],
      ['sc-svc-upload', '.sc-svc-image'],
      ['tm-photo-upload', '.ab-team-photo'],
      ['sc-intro-upload', '.sc-intro-image'],
      ['bl-image-upload', '.bl-image']
    ];
    let input = null;
    for (const pair of fieldMap) {
      if (uploadInput.classList.contains(pair[0])) {
        input = item.querySelector(pair[1]);
        break;
      }
    }
    if (uploadInput.id === 'sc-phil-upload') input = qs('#sc-phil-img');
    if (uploadInput.id === 'sc-hero-upload') input = qs('#sc-hero-image');
    if (input) {
      input.value = src;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (uploadInput.classList.contains('sc-slide-upload')) {
      const img = item.querySelector('.sc-slide-preview');
      if (img) { img.src = src; img.style.display = 'block'; }
    }
    if (uploadInput.classList.contains('sc-svc-upload')) updateServicePreview(item);
    if (uploadInput.classList.contains('tm-photo-upload')) updateTeamPreview(item);
    if (uploadInput.classList.contains('sc-intro-upload')) updateIntroPreview(item);
    if (uploadInput.id === 'sc-phil-upload') {
      const preview = qs('#sc-phil-preview-img');
      if (preview) preview.src = src;
    }
    if (uploadInput.id === 'sc-hero-upload') updateHeroPreview();
  }

  function openImagePicker(uploadInput) {
    const modal = qs('#image-picker-modal');
    if (!modal || !uploadInput) return;
    imagePickerTarget = uploadInput;
    const search = qs('#image-picker-search');
    if (search) search.value = '';
    renderImagePicker('');
    openAnimatedModal(modal);
  }

  function closeImagePicker() {
    closeAnimatedModal(qs('#image-picker-modal'));
  }

  function bindImagePicker() {
    document.addEventListener('click', (e) => {
      const label = e.target.closest('label');
      if (!label) return;
      const input = label.querySelector('input[type="file"][accept*="image"]');
      if (!input || input.dataset.directFilePick === '1') return;
      e.preventDefault();
      e.stopPropagation();
      openImagePicker(input);
    }, true);

    qs('#image-picker-grid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-src]');
      if (!btn || !imagePickerTarget) return;
      applyPickedImage(imagePickerTarget, btn.getAttribute('data-src'));
      closeImagePicker();
      if (window.Toast) Toast.show('已選用既有圖片', 'success', 1600);
    });
    qs('#image-picker-search')?.addEventListener('input', (e) => renderImagePicker(e.target.value));
    qs('#image-picker-upload')?.addEventListener('click', () => {
      if (!imagePickerTarget) return;
      imagePickerTarget.dataset.directFilePick = '1';
      closeImagePicker();
      imagePickerTarget.click();
      setTimeout(() => { if (imagePickerTarget) delete imagePickerTarget.dataset.directFilePick; }, 0);
    });
    qs('#image-picker-close')?.addEventListener('click', closeImagePicker);
    qs('#image-picker-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'image-picker-modal' || e.target.classList.contains('overlay-bg')) closeImagePicker();
    });
  }
  // 全域：目前編輯焦點（供插入連結使用）
  let activeEditable = null;
  // 全域：記錄最後焦點的路徑（用於 DOM re-render 後尋回對應元素）
  let activeSelectorPath = null;
  // 全域：在開啟 Modal 當下的選取範圍
  let activeSelStart = null;
  let activeSelEnd = null;

  // Helper: 產生元素的 CSS selector path
  function getSelectorPath(el) {
    if (!(el instanceof Element)) return '';
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE && el !== document.body) {
      let selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector = '#' + el.id;
        path.unshift(selector);
        break; // ID is unique enough
      } else {
        let sib = el, nth = 1;
        while (sib = sib.previousElementSibling) {
          if (sib.nodeName.toLowerCase() === selector) nth++;
        }
        if (nth !== 1) selector += `:nth-of-type(${nth})`;
      }
      path.unshift(selector);
      el = el.parentNode;
      if (!el) break;
    }
    return path.join(' > ');
  }

  // Fix: Track last focused editable element to handle "insert link" correctly
  const trackActive = (t) => {
    if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !['button', 'submit', 'checkbox', 'radio', 'file', 'hidden'].includes(t.type)))) {
      if (t.closest('#link-modal')) return;
      activeEditable = t;
      activeSelectorPath = getSelectorPath(t);
    }
  };
  // Track on focus
  document.addEventListener('focusin', (e) => trackActive(e.target));
  // Track on interaction (mousedown/touch) to catch clicks before focus might be lost or shifted
  // Use capture phase to ensure we register before any other handlers might stop propagation
  document.addEventListener('mousedown', (e) => trackActive(e.target), true);
  document.addEventListener('touchstart', (e) => trackActive(e.target), true);

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

  // Helper: 根據原圖比例計算預覽高度，讓編輯區縮圖比原本更好辨識。
  function setPreviewHeightFromImage(pv, url, factor) {
    try {
      if (!pv || !url) return;
      factor = factor || 0.9;
      const img = new Image();
      img.onload = function () {
        const ar = (img.naturalHeight && img.naturalWidth) ? (img.naturalHeight / img.naturalWidth) : 0.5625;
        pv.dataset.ar = String(ar);
        const w = pv.clientWidth || pv.offsetWidth || 300;
        // 已停用：禁止在 JS 中寫死圖片尺寸
        // pv.style.height = Math.round(w * ar * factor) + 'px';
      };
      img.onerror = function () {
        // 已停用：禁止在 JS 中寫死圖片尺寸
        // pv.style.height = ''; pv.style.minHeight = '12rem';
      };
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
        // 已停用：禁止在 JS 中寫死圖片尺寸
        // pv.style.height = Math.round(w * ar * 0.9) + 'px';
      });
    } catch (e) { }
  }
  // 已停用：禁止在 JS 中寫死圖片尺寸
  // window.addEventListener('resize', () => { try { recalcPreviewHeights(); } catch (e) { } });

  // 已移除：欄位說明改以 <label> 包裹，不再需要自動插入 caption。

  // 預覽：首頁英雄圖（site.index.heroImage）
  function updateHeroPreview() {
    const pv = qs('#sc-hero-preview'); const input = qs('#sc-hero-image'); if (!pv || !input) return;
    const img = pv.querySelector('img');
    const val = (input.value || '').trim();
    if (!val) {
      if (img) { img.removeAttribute('src'); img.classList.add('hidden'); }
      pv.textContent = '尚未選擇';
      return;
    }
    let url = val;
    if (/^gas:\/\/image\//.test(val)) { const p = previewCache[val]; if (p) url = p; }
    if (img) {
      img.src = url;
      img.classList.remove('hidden');
    }
    pv.textContent = '';
    setPreviewHeightFromImage(pv, url, 0.9);
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
        ? `<div class="image-frame image-frame--card w-full h-full">
             <img decoding="async" src="${preview}" alt="story${i + 1}" class="opacity-90">
             <div class="absolute inset-0 grid place-items-center bg-black/10 text-[10px] text-white">待發佈</div>
           </div>`
        : url
          ? `<div class="image-frame image-frame--card w-full h-full">
               <img decoding="async" src="${url}" alt="story${i + 1}">
             </div>`
          : `<div class="w-full h-full grid place-items-center bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">無圖片</div>`;
      const ctrls = document.createElement('div');
      ctrls.className = 'absolute top-1 right-1 flex gap-1 z-10';
      ctrls.innerHTML = `
        <button type="button" class="sc-story-up bg-yellow-500/90 hover:bg-yellow-600 text-white rounded px-1 text-xs">↑</button>
        <button type="button" class="sc-story-down bg-yellow-500/90 hover:bg-yellow-600 text-white rounded px-1 text-xs">↓</button>
        <button type="button" class="sc-story-del bg-rose-600 hover:bg-rose-700 text-white rounded px-1 text-xs">×</button>`;
      cell.appendChild(ctrls);
      list.appendChild(cell);
      // 動態依原圖比例設定高度。
      const calcSrc = preview || url;
      if (calcSrc) setPreviewHeightFromImage(cell, calcSrc, 0.9);
    });
  }

  // 預覽：About Team 照片
  function updateTeamPreview(item) {
    try {
      const pv = item.querySelector('.tm-photo-preview'); const input = item.querySelector('.ab-team-photo');
      if (!pv || !input) return;
      const img = pv.querySelector('img');
      const val = (input.value || '').trim();
      if (!val) {
        if (img) { img.removeAttribute('src'); img.classList.add('hidden'); }
        pv.textContent = '尚未選擇';
        return;
      }
      let url = val; if (/^gas:\/\/image\//.test(val) && previewCache[val]) url = previewCache[val];
      if (img) {
        img.src = url;
        img.classList.remove('hidden');
      }
      pv.textContent = '';
      setPreviewHeightFromImage(pv, url, 0.9);
    } catch (e) { }
  }

  // 預覽：Site 平台導覽/服務 圖片
  function updateIntroPreview(item) {
    try {
      const pv = item.querySelector('.sc-intro-preview'); const input = item.querySelector('.sc-intro-image');
      if (!pv || !input) return;
      const img = pv.querySelector('img');
      const val = (input.value || '').trim();
      if (!val) {
        if (img) { img.removeAttribute('src'); img.classList.add('hidden'); }
        pv.textContent = '尚未選擇';
        return;
      }
      let url = val; if (/^gas:\/\/image\//.test(val) && previewCache[val]) url = previewCache[val];
      if (img) {
        img.src = url;
        img.classList.remove('hidden');
      }
      pv.textContent = '';
      setPreviewHeightFromImage(pv, url, 0.9);
    } catch (e) { }
  }
  function updateServicePreview(item) {
    try {
      const pv = item.querySelector('.sc-svc-thumb'); const input = item.querySelector('.sc-svc-image');
      if (!pv || !input) return;
      const val = (input.value || '').trim();
      if (!val) { pv.removeAttribute('src'); pv.classList.add('hidden'); return; }
      let url = val; if (/^gas:\/\/image\//.test(val) && previewCache[val]) url = previewCache[val];
      pv.src = url;
      pv.classList.remove('hidden');
    } catch (e) { }
  }

  const AppConfig = window.AppConfig || { datasets: { about: 'aboutContent', providers: 'providers', site: 'siteContent', blog: 'blogContent', services: 'servicesContent' }, versionCacheKey: 'app_data_version' };
  const DS = AppConfig.datasets || { about: 'aboutContent', providers: 'providers', site: 'siteContent', blog: 'blogContent', services: 'servicesContent' };
  const VERSION_KEY = AppConfig.versionCacheKey || 'app_data_version';
  const LOCAL_DRAFT_PREFIX = 'admin_local_draft_';

  function keyFromSelect() {
    const v = (qs('#ds-select')?.value) || 'about';
    if (v === 'about') return DS.about;
    if (v === 'providers') return DS.providers;
    if (v === 'site') return DS.site;
    if (v === 'blog') return DS.blog;
    if (v === 'services') return DS.services || 'servicesContent';
    return v; // fallback
  }

  function getPublishedData(key) {
    if (key === DS.about || key === 'aboutContent') return cloneData(window.aboutContent || {});
    if (key === DS.providers || key === 'providers') return cloneData(window.providersData || {});
    if (key === DS.site || key === 'siteContent') return cloneData(window.siteContent || {});
    if (key === DS.blog || key === 'blogContent') return cloneData(window.blogContent || { posts: [] });
    if (key === DS.services || key === 'servicesContent') return cloneData(window.servicesContent || {});
    return {};
  }

  function applyLocalData(key, data) {
    if (key === DS.about || key === 'aboutContent') window.aboutContent = data;
    else if (key === DS.providers || key === 'providers') window.providersData = data;
    else if (key === DS.site || key === 'siteContent') window.siteContent = data;
    else if (key === DS.blog || key === 'blogContent') window.blogContent = data;
    else if (key === DS.services || key === 'servicesContent') window.servicesContent = data;
    try { document.dispatchEvent(new CustomEvent((window.DataAPI && window.DataAPI.EVENT) || 'data:updated', { detail: { keys: [key] } })); } catch (e) { }
  }

  function draftKey(key) { return LOCAL_DRAFT_PREFIX + key; }
  function readLocalDraft(key) {
    try {
      const raw = localStorage.getItem(draftKey(key));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.data ? parsed : null;
    } catch (e) { return null; }
  }
  function saveLocalDraft(key, data) {
    const payload = { key, data, savedAt: new Date().toISOString() };
    localStorage.setItem(draftKey(key), JSON.stringify(payload));
    applyLocalData(key, data);
    return payload;
  }
  function clearLocalDraft(key) {
    try { localStorage.removeItem(draftKey(key)); } catch (e) { }
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
  function mergeByIndex(existing, rows, keyField) {
    const base = Array.isArray(existing) ? existing : [];
    return (rows || []).map((row, i) => ({ ...(base[i] || {}), ...(row || {}) })).filter(item => {
      if (!keyField) return true;
      return item && String(item[keyField] || '').trim();
    });
  }
  function normalizeSiteContentData(data) {
    const src = (data && typeof data === 'object') ? data : {};
    const legacy = (src.index && typeof src.index === 'object') ? src.index : {};
    const hero = src.hero || {};
    const philosophy = src.philosophy || {};
    const legacySlides = Array.isArray(legacy.slides)
      ? legacy.slides
      : (legacy.heroImage ? [{ img: legacy.heroImage, alt: legacy.heroAlt || '' }] : []);
    const normalizedServices = Array.isArray(src.services)
      ? src.services
      : (Array.isArray(legacy.services) ? legacy.services : []);
    return {
      ...src,
      hero: {
        ...hero,
        label: hero.label || src.heroLabel || legacy.heroLabel || 'SOUND CORE STUDIO',
        title: hero.title || src.heroTitle || legacy.heroTitle || '',
        subtitle: hero.subtitle || src.heroSubtitle || legacy.heroSubtitle || '',
        info: hero.info || src.heroInfo || legacy.heroInfo || '',
        slides: (Array.isArray(hero.slides) && hero.slides.length ? hero.slides : legacySlides).map(item => ({
          ...item,
          img: item.img || item.image || '',
          alt: item.alt || ''
        })).filter(item => item.img)
      },
      philosophy: {
        ...philosophy,
        label: philosophy.label || src.philosophyLabel || '',
        title: philosophy.title || src.philosophyTitle || '',
        content: philosophy.content || src.philosophyContent || '',
        img: philosophy.img || src.philosophyImage || ''
      },
      services: normalizedServices.map(item => ({
        ...item,
        image: item.image || item.img || '',
        img: item.img || item.image || ''
      }))
    };
  }
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
    if (logged) { try { const tip = qs('#admin-header-tip'); if (tip) tip.textContent = '已登入：資料從 js/data 載入；暫存只保存在本機，發布後才更新網站。'; } catch (e) { } }

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

    // 先註冊 ds-select change handler，確保在 async loadDatasetAndRender 執行期間使用者切換資料集也能被處理
    qs('#ds-select')?.addEventListener('change', async () => {
      try { const v = qs('#ds-select')?.value || ''; localStorage.setItem('admin_ds_selected', v); } catch (e) { }
      updateVersionLabel();
      toggleSections();
      try { await loadDatasetAndRender(); } catch (e) { }
    });

    // 若已登入，初次載入並渲染目前資料集（此時 change handler 已註冊，使用者切換無 race condition）
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
        try { const tip = qs('#admin-header-tip'); if (tip) tip.textContent = '已登入：資料從 js/data 載入；暫存只保存在本機，發布後才更新網站。'; } catch (e) { }
        show(qs('#admin-login'), false);
        show(qs('#admin-panel'), true);
        try { await loadDatasetAndRender(); } catch (e) { }
        try { await updateVersionLabel(); } catch (e) { }
      } catch (e) { text(status, '錯誤：' + e.message); if (window.Toast) Toast.show('登入錯誤：' + e.message, 'error', 3000); }
      finally { setBtnLoading(admBtn, false); }
    });
    // Enter 送出
    [admUsr, admPwd].forEach(el => el?.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); admBtn?.click(); } }));

    qs('#btn-logout')?.addEventListener('click', () => { window.DataAPI.logout(); window.location.reload(); });

    // 儲存並同步
    qs('#btn-save-publish')?.addEventListener('click', onSavePublish);

    // 追蹤目前聚焦的輸入元件，供「插入連結」使用
    // 追蹤目前聚焦的輸入元件，供「插入連結」使用
    // Note: trackActive 已在全域宣告並綁定，此處不需要重複綁定

    // Insert Link Button Event Handlers
    const btnInsert = qs('#btn-insert-link');
    if (btnInsert) {
      // 1. Mousedown: 趁焦點還在 editor 時，搶先記下 selection
      btnInsert.addEventListener('mousedown', (e) => {
        // 防止按鈕本身的預設行為導致失焦（視瀏覽器而定），但我們主要是為了抓取數據
        // e.preventDefault(); // 視情況決定是否需要
        if (activeEditable) {
          // 即使 activeEditable 已經有點舊，只要它還沒被銷毀，數值就是對的
          // 若已被銷毀，則數值可能為 0，等到 click/openModal 時再嘗試救回
          activeSelStart = activeEditable.selectionStart;
          activeSelEnd = activeEditable.selectionEnd;
        }
      });
      // 2. Click: 開啟視窗
      btnInsert.addEventListener('click', (e) => {
        openLinkModal();
      });
    }

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

    // Toolbar Shadow Logic
    const toolbar = qs('#admin-toolbar');
    if (toolbar) {
      const updateShadow = () => {
        const scrolled = window.scrollY > 10;
        // 寬度變淡 + 陰影出現
        toolbar.classList.toggle('shadow-lg', scrolled);
        toolbar.classList.toggle('border-opacity-60', scrolled);
        toolbar.classList.toggle('dark:border-opacity-60', scrolled);
      };
      window.addEventListener('scroll', updateShadow, { passive: true });
      updateShadow(); // init check
    }
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
  function isServicesSelected() { return (qs('#ds-select')?.value) === 'services'; }
  // 平滑展開/收合區塊
  let __curSectionId = null;
  let _loadGen = 0;
  function currentSectionId() { if (isProvidersSelected()) return 'providers-visual'; if (isAboutSelected()) return 'about-visual'; if (isSiteSelected()) return 'site-visual'; if (isServicesSelected()) return 'services-visual'; if (isBlogSelected()) return 'blog-visual'; return null; }
  function asEl(id) { return id ? qs('#' + id) : null; }
  function ensureCollapsible(el) { if (!el) return; el.classList.add('admin-collapsible'); }
  function toggleSections() {
    const ids = ['providers-visual', 'about-visual', 'site-visual', 'services-visual', 'blog-visual'];
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

  // 載入資料：以 js/data 的公開資料為基底，再覆蓋 localStorage 草稿。
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
  function hideLoading(sectionId) {
    const box = qs('#admin-loading'); if (!box) return;
    box.classList.add('hidden');
    box.innerHTML = '';
    // 恢復應顯示的視覺化區塊（若有指定 sectionId 則直接顯示該區塊，避免 toggleSections 使用當前的 select value）
    if (sectionId) {
      const ids = ['providers-visual', 'about-visual', 'site-visual', 'services-visual', 'blog-visual'];
      ids.forEach(id => ensureCollapsible(asEl(id)));
      // 隱藏其他 section
      ids.forEach(id => { const el = asEl(id); if (el && id !== sectionId) el.classList.add('hidden'); });
      // 顯示目標 section
      const target = asEl(sectionId);
      if (target) {
        target.classList.remove('hidden');
        void target.offsetHeight;
        target.classList.add('open');
      }
      __curSectionId = sectionId;
    } else {
      try { toggleSections(); } catch (e) { }
    }
  }

  async function loadDatasetAndRender() {
    const gen = ++_loadGen;
    const key = keyFromSelect();
    showLoading();
    let payload = getPublishedData(key);
    const draft = readLocalDraft(key);
    if (draft && draft.data && typeof draft.data === 'object') payload = cloneData(draft.data);
    if (key === DS.site || key === 'siteContent') payload = normalizeSiteContentData(payload);
    if (key === DS.services || key === 'servicesContent') {
      payload = { ...(payload || {}), items: Array.isArray(payload?.items) ? payload.items.map(item => ({ ...item, image: item.image || item.img || '' })) : [] };
    }

    // 若在此次 await 期間已有更新的載入請求，則捨棄這次的結果（避免 out-of-order 覆寫）
    if (gen !== _loadGen) return;

    // 寫入內部編輯器狀態
    if (key === DS.providers || key === 'providers') { try { ensureProviderIds(payload); } catch (e) { } }
    setEditor(payload);
    // 渲染對應視覺化介面（使用載入時捕捉的 key，避免 await 後 select 值已變）
    if (key === DS.providers || key === 'providers') {
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
    } else if (key === DS.about || key === 'aboutContent') {
      renderAboutEditor(payload || {});
    } else if (key === DS.site || key === 'siteContent') {
      renderSiteEditor(payload || {});
    } else if (key === DS.services || key === 'servicesContent') {
      renderServicesEditor(payload || {});
    } else if (key === DS.blog || key === 'blogContent') {
      renderBlogEditor(payload || {});
    }
    // 確保顯示正確的 section（與載入的 key 同步）
    const expectedSectionId = key === DS.providers || key === 'providers' ? 'providers-visual'
      : key === DS.about || key === 'aboutContent' ? 'about-visual'
      : key === DS.site || key === 'siteContent' ? 'site-visual'
      : key === DS.services || key === 'servicesContent' ? 'services-visual'
      : key === DS.blog || key === 'blogContent' ? 'blog-visual'
      : null;
    hideLoading(expectedSectionId);
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
          <div class="pv-video-preview image-frame image-frame--card image-frame--rounded mt-2 bg-gray-200 dark:bg-gray-700 grid place-items-center text-xs text-gray-600 dark:text-gray-300">
            <img decoding="async" class="hidden" src="" alt="影片縮圖">
            <span class="pv-video-preview-text">${c.video ? '預覽載入中…' : '輸入影片網址後顯示縮圖'}</span>
          </div>
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
    const img = box.querySelector('img');
    const textEl = box.querySelector('.pv-video-preview-text');
    const poster = posterFrom(url);
    if (poster) {
      if (img) {
        img.src = poster;
        img.classList.remove('hidden');
      }
      if (textEl) textEl.textContent = '';
    } else if (/\.mp4($|\?)/i.test(url)) {
      if (img) { img.removeAttribute('src'); img.classList.add('hidden'); }
      if (textEl) textEl.textContent = 'MP4 影片';
    } else {
      if (img) { img.removeAttribute('src'); img.classList.add('hidden'); }
      if (textEl) textEl.textContent = '輸入影片網址後顯示縮圖';
    }
  }
  function refreshCasePreviews() { qs('#pv-cases-list')?.querySelectorAll('div[data-index]')?.forEach(updatePreviewFor); }
  // 初始化與輸入變動時即時更新
  document.addEventListener('DOMContentLoaded', refreshCasePreviews);
  qs('#pv-cases-list')?.addEventListener('input', (e) => { if (e.target && e.target.classList.contains('pv-video')) { const item = e.target.closest('div[data-index]'); if (item) updatePreviewFor(item); } });

  // ===== 圖片管理（排序／上傳／拖放） =====
  function parseImagesFrom(item) {
    if (!item) return [];
    const ta = item.querySelector('.pv-images');
    const arr = (ta?.value || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
    return arr;
  }
  function writeImagesTo(item, arr) {
    if (!item) return;
    const ta = item.querySelector('.pv-images'); if (!ta) return;
    ta.value = (arr || []).join('\n');
  }
  function renderImgList(item) {
    if (!item) return;
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
          <img decoding="async" src="${preview}" alt="pending" class="w-full h-full object-contain opacity-90">
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
          <img decoding="async" src="${url}" alt="img${i + 1}" class="w-full h-full object-contain">
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

  function normalizePayloadForSelectedDataset(payload) {
    if (isSiteSelected()) return normalizeSiteContentData(payload);
    if (isServicesSelected()) {
      return {
        ...(payload || {}),
        items: Array.isArray(payload?.items) ? payload.items.map(item => ({
          ...item,
          image: item.image || item.img || ''
        })) : []
      };
    }
    return payload || {};
  }

  function collectCurrentPayload() {
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
    else if (isServicesSelected()) { payload = collectServicesFromUI(); }
    else if (isBlogSelected()) { payload = collectBlogFromUI(); }
    else { payload = getEditorJSON(); }
    return normalizePayloadForSelectedDataset(payload);
  }

  // 儲存＋同步 GitHub
  async function onSavePublish() {
    const key = keyFromSelect();
    const st = qs('#publish-status'); if (st) st.textContent = '儲存並同步中…';
    try {
      setBtnLoading(qs('#btn-save-publish'), true);
      let payload = collectCurrentPayload();
      const okToPublish = await confirmDialog('儲存並發布', '確定要儲存並發布嗎？\n\n這會同步到 GitHub，且每日最多 10 次。', '發布');
      if (!okToPublish) {
        if (st) st.textContent = '已取消發布';
        return;
      }
      let res = await withBusy('發布中', '正在儲存資料並同步 GitHub，請稍候。', () => window.DataAPI.savePublish(key, payload, [key]));
      if (res && res.ok && res.data && typeof res.data === 'object') payload = res.data;
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
      if (res && res.ok && !hasPublishErrors) {
        applyLocalData(key, payload);
        clearLocalDraft(key);
        setEditor(payload);
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
      const payload = await withBusy('暫存中', '正在保存本機草稿，請稍候。', async () => {
        const data = collectCurrentPayload();
        saveLocalDraft(key, data);
        return data;
      });
      setEditor(payload);
      if (st) st.textContent = '已暫存於本機';
      if (window.Toast) Toast.show('已暫存於本機，發布後才會更新 js/data', 'success', 3000);
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
          <div class="tm-photo-preview image-frame image-frame--card image-frame--rounded mt-2">
            <img decoding="async" src="${row.photo ? resolveImage(row.photo) : ''}" alt="預覽" class="${row.photo ? '' : 'hidden'}">
          </div>
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
        <div class="h-36 bg-gray-100 dark:bg-gray-800 rounded mt-1 overflow-hidden relative sc-slide-preview-box">
           <img decoding="async" src="${row.img || ''}" class="sc-slide-preview w-full h-full object-contain" onerror="this.style.display='none'" onload="this.style.display='block'">
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
            <input class="sc-svc-image flex-1 rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${row.image || row.img || ''}" placeholder="./img/... 或上傳">
            <label class="btn-soft btn-blue text-xs cursor-pointer shrink-0">上傳<input type="file" class="hidden sc-svc-upload" accept="image/*"></label>
            <div class="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden shrink-0">
              <img decoding="async" src="${row.image || row.img || ''}" class="w-full h-full object-contain sc-svc-thumb" onerror="this.style.display='none'" onload="this.style.display='block'">
            </div>
          </div>
        </div>
      </div>`;
    // Live preview for image
    wrap.querySelector('.sc-svc-image').addEventListener('input', e => {
      const preview = wrap.querySelector('.sc-svc-thumb');
      if (preview) {
        preview.src = e.target.value;
        preview.style.display = 'block';
      }
    });
    // Upload handler
    wrap.querySelector('.sc-svc-upload').addEventListener('change', async e => {
      e.__scSvcUploadHandled = true;
      const file = e.target.files?.[0]; if (!file) return;
      const input = wrap.querySelector('.sc-svc-image');
      const preview = wrap.querySelector('.sc-svc-thumb');
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
    data = normalizeSiteContentData(data);
    const hero = data.hero || {};
    const hTitle = qs('#sc-hero-title'); if (hTitle) hTitle.value = hero.title || '';
    const hSub = qs('#sc-hero-subtitle'); if (hSub) hSub.value = hero.subtitle || '';
    const hInfo = qs('#sc-hero-info'); if (hInfo) hInfo.value = hero.info || '';

    const sList = qs('#sc-hero-slides');
    if (sList) {
      sList.innerHTML = '';
      (hero.slides || []).forEach((s, i) => sList.appendChild(buildHeroSlideItem(s, i)));
    }

    const phil = data.philosophy || {};
    if (qs('#sc-phil-label')) qs('#sc-phil-label').value = phil.label || '';
    if (qs('#sc-phil-title')) qs('#sc-phil-title').value = phil.title || '';
    if (qs('#sc-phil-content')) qs('#sc-phil-content').value = phil.content || '';
    if (qs('#sc-phil-img')) qs('#sc-phil-img').value = phil.img || '';
    // Update philosophy preview
    const philPreview = qs('#sc-phil-preview-img');
    if (philPreview) philPreview.src = phil.img || '';

    const svcList = qs('#sc-service-list');
    if (svcList) {
      svcList.innerHTML = '';
      (data.services || []).forEach((s, i) => {
        const node = buildServiceItem(s, i);
        svcList.appendChild(node);
        try { updateServicePreview(node); } catch (e) { }
      });
    }

    // 其餘區塊若頁面上有對應欄位，也一併回填，避免切到主畫面時只看到半套資料
    if (qs('#sc-sdgs-title')) qs('#sc-sdgs-title').value = data.sdgsTitle || '';
    if (qs('#sc-resources-title')) qs('#sc-resources-title').value = data.resources?.title || '';
    if (qs('#sc-map-title')) qs('#sc-map-title').value = data.map?.title || '';
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
    // Preserve existing loaded/draft data for fields not edited via UI.
    const existing = normalizeSiteContentData(getEditorJSON() || {});
    const existingHero = existing.hero || {};
    const existingPhil = existing.philosophy || {};
    const slideRows = Array.from(qs('#sc-hero-slides')?.children || []).map(el => ({
      img: el.querySelector('.sc-slide-img')?.value?.trim() || '',
      alt: el.querySelector('.sc-slide-alt')?.value?.trim() || ''
    })).filter(x => x.img);
    const serviceRows = Array.from(qs('#sc-service-list')?.children || []).map(el => ({
      title: el.querySelector('.sc-svc-title')?.value?.trim() || '',
      desc: el.querySelector('.sc-svc-desc')?.value?.trim() || '',
      icon: el.querySelector('.sc-svc-icon')?.value?.trim() || '',
      link: el.querySelector('.sc-svc-link')?.value?.trim() || '',
      img: el.querySelector('.sc-svc-image')?.value?.trim() || ''
    })).filter(x => x.title || x.desc || x.img);

    const out = {
      ...existing,
      hero: {
        ...existingHero,
        label: existingHero.label || 'SOUND CORE STUDIO',
        title: linkifyHtml(qs('#sc-hero-title')?.value || ''),
        subtitle: linkifyHtml(qs('#sc-hero-subtitle')?.value || ''),
        info: linkifyHtml(qs('#sc-hero-info')?.value || ''),
        slides: mergeByIndex(existingHero.slides, slideRows, 'img'),
        buttons: existingHero.buttons || [
          { text: '開始探索', link: './explore.html', style: 'primary' },
          { text: '了解更多', link: '#about', style: 'outline' }
        ]
      },
      philosophy: {
        ...existingPhil,
        label: qs('#sc-phil-label')?.value?.trim() || '',
        title: linkifyHtml(qs('#sc-phil-title')?.value || ''),
        content: linkifyHtml(qs('#sc-phil-content')?.value || ''),
        img: qs('#sc-phil-img')?.value?.trim() || ''
      },
      services: mergeByIndex(existing.services, serviceRows),
      sdgs: existing.sdgs || [],
      resources: {
        ...(existing.resources || {}),
        title: qs('#sc-resources-title')?.value?.trim() || existing.resources?.title || ''
      },
      blogPosts: existing.blogPosts || [],
      map: {
        ...(existing.map || {}),
        title: qs('#sc-map-title')?.value?.trim() || existing.map?.title || ''
      }
    };
    return out; // Return flat siteContent, not wrapped
  }

  function renderServicesEditor(data) {
    data = data || {};
    const title = qs('#svc-title'); if (title) title.value = data.title || '服務項目';
    const lead = qs('#svc-lead'); if (lead) lead.value = data.lead || '';
    const achTitle = qs('#svc-ach-title'); if (achTitle) achTitle.value = data.achievementsTitle || '成就經歷';
    const ach = qs('#svc-achievements');
    if (ach) {
      ach.value = (Array.isArray(data.achievements) ? data.achievements : []).map(item => {
        if (typeof item === 'string') return item;
        return item && (item.text || item.title) || '';
      }).filter(Boolean).join('\n');
    }
    const gallery = qs('#svc-gallery');
    if (gallery) gallery.value = (Array.isArray(data.gallery) ? data.gallery : []).join('\n');
    const list = qs('#svc-item-list');
    if (list) {
      list.innerHTML = '';
      const items = Array.isArray(data.items) ? data.items : [];
      items.forEach((item, i) => list.appendChild(buildServiceItem({
        title: item.title || '',
        desc: item.desc || item.description || '',
        image: item.image || item.img || '',
        link: item.link || '',
        icon: item.icon || ''
      }, i)));
    }
    renderAdaptiveNotice('services', data);
  }

  function collectServicesFromUI() {
    const existing = getEditorJSON() || {};
    return {
      ...existing,
      title: qs('#svc-title')?.value?.trim() || '服務項目',
      lead: qs('#svc-lead')?.value?.trim() || '',
      items: Array.from(qs('#svc-item-list')?.children || []).map(el => ({
        title: el.querySelector('.sc-svc-title')?.value?.trim() || '',
        desc: el.querySelector('.sc-svc-desc')?.value?.trim() || '',
        image: el.querySelector('.sc-svc-image')?.value?.trim() || ''
      })).filter(item => item.title || item.desc || item.image),
      achievementsTitle: qs('#svc-ach-title')?.value?.trim() || '成就經歷',
      achievements: (qs('#svc-achievements')?.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean),
      gallery: (qs('#svc-gallery')?.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    };
  }

  function renderAdaptiveNotice(type, data) {
    const known = {
      services: ['title', 'lead', 'items', 'achievementsTitle', 'achievements', 'gallery']
    }[type] || [];
    const extra = Object.keys(data || {}).filter(k => !known.includes(k));
    let box = qs(`#${type}-adaptive-extra`);
    const host = type === 'services' ? qs('#services-visual') : null;
    if (!host) return;
    if (!box) {
      box = document.createElement('div');
      box.id = `${type}-adaptive-extra`;
      box.className = 'mt-4 ui-card card-dynamic-bg p-4';
      host.appendChild(box);
    }
    box.innerHTML = extra.length
      ? `<h4 class="font-semibold mb-2">其他資料欄位</h4><p class="text-sm text-gray-600 dark:text-gray-300">偵測到此資料還有 ${extra.length} 個非主要欄位，儲存時會保留：${extra.map(escHtml).join('、')}</p>`
      : `<h4 class="font-semibold mb-2">資料結構</h4><p class="text-sm text-gray-600 dark:text-gray-300">目前資料符合服務項目頁表單，可直接新增、修改、排序與儲存。</p>`;
  }

  // Global Binding for Site Editor Buttons
  document.addEventListener('click', e => {
    if (!e.target) return;
    if (e.target.id === 'sc-add-slide') { e.preventDefault(); addBlankSlide(); }
    if (e.target.id === 'sc-add-service') { e.preventDefault(); addBlankService(); }
    if (e.target.id === 'svc-add-item') {
      e.preventDefault();
      const list = qs('#svc-item-list');
      if (list) list.appendChild(buildServiceItem({}, list.children.length));
    }

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
    if (e.__scSvcUploadHandled) return;
    const up = e.target.closest('.sc-svc-upload'); if (!up) return;
    const item = up.closest('div[data-index]'); if (!item) return;
    const file = up.files?.[0]; if (!file) return;
    up.disabled = true;
    try {
      const pv = item.querySelector('.sc-svc-thumb'); if (pv) pv.classList.add('is-uploading');
      const ph = await uploadFileAndGetPlaceholder(file);
      const input = item.querySelector('.sc-svc-image'); if (input) input.value = ph;
      updateServicePreview(item);
      if (window.Toast) Toast.show('圖片已加入（待發佈）', 'success', 2000);
    } catch (err) { if (window.Toast) Toast.show('上傳失敗：' + err.message, 'error', 3000); }
    finally { up.value = ''; up.disabled = false; const pv = item.querySelector('.sc-svc-thumb'); if (pv) pv.classList.remove('is-uploading'); }
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
      const map = { site: '主畫面（siteContent）', about: '關於我們（aboutContent）', providers: '探索資源平台（providers）', services: '服務項目（servicesContent）', blog: '部落格（blogContent）' };
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
    function openDs() { if (!dsBtn || !dsMenu) return; dsMenu.classList.remove('opacity-0', 'scale-95', 'pointer-events-none', 'invisible'); dsMenu.classList.add('opacity-100', 'scale-100', 'visible', 'admin-dropdown-open'); dsBtn.setAttribute('aria-expanded', 'true'); }
    function closeDs() { if (!dsBtn || !dsMenu) return; dsMenu.classList.add('opacity-0', 'scale-95', 'pointer-events-none', 'invisible'); dsMenu.classList.remove('opacity-100', 'scale-100', 'visible', 'admin-dropdown-open'); dsBtn.setAttribute('aria-expanded', 'false'); }
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
    function openPv() { if (!pvBtn || !pvMenu) return; pvMenu.classList.remove('opacity-0', 'scale-95', 'pointer-events-none', 'invisible'); pvMenu.classList.add('opacity-100', 'scale-100', 'visible', 'admin-dropdown-open'); pvBtn.setAttribute('aria-expanded', 'true'); }
    function closePv() { if (!pvBtn || !pvMenu) return; pvMenu.classList.add('opacity-0', 'scale-95', 'pointer-events-none', 'invisible'); pvMenu.classList.remove('opacity-100', 'scale-100', 'visible', 'admin-dropdown-open'); pvBtn.setAttribute('aria-expanded', 'false'); }
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
    const urlInput = qs('#link-url');
    const txtInput = qs('#link-text');

    // --- 關鍵修正：檢查並恢復 activeEditable ---
    // 1. 檢查目前的 activeEditable 是否還活著（存在於 document 中）
    if (activeEditable && !activeEditable.isConnected) {
      console.warn('AdminJS: activeEditable is detached (ghost element). Attempting recovery via path:', activeSelectorPath);
      // 嘗試透過 activeSelectorPath 找回新的 DOM 節點
      if (activeSelectorPath) {
        const recovered = document.querySelector(activeSelectorPath);
        if (recovered) {
          activeEditable = recovered;
          console.log('AdminJS: Successfully recovered activeEditable.', recovered);
        } else {
          console.error('AdminJS: Failed to recover activeEditable.');
          // 無法救援時，考慮重置（或讓使用者重新點擊）
        }
      }
    }

    // 2. 準備 Selection 數據
    // 若 mousedown 時有抓到 selection，優先使用
    // 若無（例如直接點擊按鈕而未經過 mousedown，雖然少見），則嘗試從 activeEditable 讀取
    let selStart = activeSelStart;
    let selEnd = activeSelEnd;

    // 如果 current activeEditable 是活的，且 selStart 無效，嘗試讀取目前的（雖然此時焦點可能在按鈕上，但某些瀏覽器會保留 selection）
    if (activeEditable && activeEditable.isConnected && (selStart == null)) {
      selStart = activeEditable.selectionStart || 0;
      selEnd = activeEditable.selectionEnd || selStart;
    }

    // 儲存最終決定使用的 selection，供 insert 時使用
    activeSelStart = selStart || 0;
    activeSelEnd = (selEnd != null) ? selEnd : activeSelStart;

    // 3. 抓取選取文字填入 Modal
    let selectedText = '';
    if (activeEditable && activeEditable.value) {
      selectedText = activeEditable.value.slice(activeSelStart, activeSelEnd);
    }
    if (txtInput) txtInput.value = selectedText;
    if (urlInput) urlInput.value = ''; // Reset URL

    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.add('open'); }, 0);
    document.documentElement.classList.add('overflow-hidden');
    urlInput?.focus();
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
    // 再次檢查與救援（防呆）
    if (activeEditable && !activeEditable.isConnected && activeSelectorPath) {
      const rec = document.querySelector(activeSelectorPath);
      if (rec) activeEditable = rec;
    }

    if (!activeEditable || !activeEditable.isConnected) {
      if (window.Toast) Toast.show('無法定位編輯區域，請重新點選文字輸入框', 'warning', 2500);
      closeLinkModal();
      return;
    }

    const el = activeEditable;
    const url = (qs('#link-url')?.value || '').trim();
    if (!url) { if (window.Toast) Toast.show('請輸入連結網址', 'error', 2200); return; }

    const textVal = (qs('#link-text')?.value || ''); // Allow empty to fallback
    const color = qs('#link-color')?.value || '';
    const font = qs('#link-font')?.value || '';
    const sizeKey = qs('#link-size')?.value || '';
    // 將小/中/大映射為實際像素
    const sizePxMap = { sm: 14, md: 16, lg: 18 };
    const sizePx = sizePxMap[sizeKey];

    const val = el.value || '';
    // 安全檢核：確保索引在合理範圍
    let start = activeSelStart;
    let end = activeSelEnd;
    if (start > val.length) start = val.length;
    if (end > val.length) end = val.length;
    if (end < start) end = start;

    const selText = textVal || val.slice(start, end) || url;
    const safeHref = url.replace(/"/g, '%22'); // Basic escape

    const styles = [];
    if (color) styles.push(`color:${color}`);
    if (font) styles.push(`font-family:${font}`);
    if (sizePx) styles.push(`font-size:${sizePx}px`);
    const styleAttr = styles.length ? ` style="${styles.join(';')}"` : '';

    const aTag = `<a href="${safeHref}" target="_blank" rel="noopener"${styleAttr}>${selText}</a>`;

    // 執行插入
    const newVal = val.slice(0, start) + aTag + val.slice(end);
    el.value = newVal;

    // 觸發 input 事件以讓其他監聽器（如預覽）更新
    try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { }

    // 恢復焦點並將游標移至連結後
    el.focus();
    const newPos = start + aTag.length;
    try { el.setSelectionRange(newPos, newPos); } catch (e) { }

    // 清除暫存
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
    const data = normalizeSiteContentData(siteObj || {});
    const hero = data.hero || {};
    const slides = Array.isArray(hero.slides) ? hero.slides : [];
    const d = data.index || {};
    const heroUrl = resolveImage((slides[0] && slides[0].img) || d.heroImage || '').replace(/\"/g, '&quot;');
    function esc(s) { return (s == null ? '' : String(s)); }
    function isYT(u) { return /youtube\.com\/watch\?v=|youtu\.be\//.test(u || ''); }
    function ytId(u) { const m = (u || '').match(/[?&]v=([^&]+)|youtu\.be\/([^?&]+)/); return (m && (m[1] || m[2])) || ''; }
    function isVimeo(u) { return /vimeo\.com\//.test(u || ''); }
    function vimeoId(u) { const m = (u || '').match(/vimeo\.com\/(\d+)/); return (m && m[1]) || ''; }
    const svc = Array.isArray(data.services) ? data.services : (Array.isArray(d.services) ? d.services : []);
    const intro = Array.isArray(d.platformIntro) ? d.platformIntro : [];
    const imgs = Array.isArray(d.story?.images) ? d.story.images : [];
    vp.innerHTML = `
      <div class="space-y-10">
        <section>
          <div id="hero" class="hero-banner" style="${heroUrl ? `background-image:url('${heroUrl}')` : ''}">
            <div class="hero-band">
              <h1 id="hero-title" class="hero-title">${esc(hero.title || d.heroTitle || '')}</h1>
              <p id="hero-subtitle" class="hero-subtitle">${hero.subtitle || d.heroSubtitle || ''}</p>
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
              ${imgs.slice(0, 4).map((u, i) => { const src = resolveImage(u); return `<div class=\"rounded-lg overflow-hidden shadow\"><img decoding="async" src=\"${src}\" alt=\"story${i + 1}\" class=\"w-full h-40 md:h-52 object-cover\"></div>`; }).join('')}
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
                  <img decoding="async" src="${url}" alt="${esc(it.title || '')}" class="w-full h-64 md:h-80 object-cover" />
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
      const img = resolveImage(s.img || s.image || '');
      return `
              <div class="relative h-72 rounded-2xl overflow-hidden shadow-lg group">
                ${img ? `<img decoding="async" src="${img}" alt="${esc(s.title || '')}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">` : ''}
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
                ${t.photo ? `<img decoding="async" class=\"w-full h-64 object-cover\" src=\"${resolveImage(t.photo)}\" alt=\"${t.name || ''}\">` : ''}
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
        return `<div class='rounded-lg overflow-hidden'><img decoding="async" src='${src}' alt='${c.title || ''}' class='w-full h-56 object-cover'/></div>`;
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
                     ${p.cover ? `<img decoding="async" src="${p.cover}" class="w-full h-full object-cover">` : ''}
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
    } else if (sel === 'services') {
      pagePath = './services.html';
      dataKey = 'servicesContent';
      collectFn = collectServicesFromUI;
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
    document.addEventListener('DOMContentLoaded', () => { bindDropdowns(); bindLinkModal(); bindImagePicker(); bindPreviewControls(); bindPreviewLive(); try { renderLivePreview(); } catch (e) { } });
  } else {
    bindDropdowns(); bindLinkModal(); bindImagePicker(); bindPreviewControls(); bindPreviewLive(); try { renderLivePreview(); } catch (e) { }
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
        <label class="text-sm">內文 (content，可留空)
          <textarea class="bl-content w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="3">${escHtml(p.content || '')}</textarea>
        </label>
        <label class="text-sm">時間軸 (timeline，每行：時間｜標題｜說明；榮耀時刻會自動套用)
          <textarea class="bl-timeline w-full rounded border px-2 py-1 bg-white dark:bg-gray-800" rows="4">${escHtml(formatBlogTimeline(p.timeline))}</textarea>
        </label>
         <label class="text-sm">圖片 (image)
           <div class="flex gap-2 items-end">
              <input class="bl-image flex-1 rounded border px-2 py-1 bg-white dark:bg-gray-800" value="${escHtml(p.image || '')}" placeholder="./img/... 或上傳">
              <label class="btn-soft btn-blue text-xs cursor-pointer shrink-0">上傳<input type="file" class="hidden bl-image-upload" accept="image/*"></label>
              <div class="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden relative shrink-0">
                 <img decoding="async" src="${p.image || ''}" class="w-full h-full object-contain bl-image-preview" onerror="this.style.display='none'" onload="this.style.display='block'">
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

  function formatBlogTimeline(timeline) {
    if (!Array.isArray(timeline)) return '';
    return timeline.map(row => [row.time || '', row.title || '', row.detail || ''].join('｜')).join('\n');
  }

  function parseBlogTimeline(text) {
    return String(text || '').split(/\r?\n/).map(line => {
      const raw = line.trim();
      if (!raw) return null;
      const parts = raw.split(/[｜|]/).map(s => s.trim());
      return { time: parts[0] || '', title: parts[1] || '', detail: parts.slice(2).join('｜') || '' };
    }).filter(row => row && (row.time || row.title || row.detail));
  }

  function collectBlogFromUI() {
    const list = qs('#bl-post-list');
    if (!list) return { posts: [] };
    const current = getEditorJSON();
    const existingPosts = (current && Array.isArray(current.posts)) ? current.posts : [];
    const posts = Array.from(list.children).map(el => {
      const get = sel => el.querySelector(sel);
      const id = get('.bl-id')?.value || '';
      const previous = existingPosts.find(p => String(p.id) === String(id)) || {};
      const timeline = parseBlogTimeline(get('.bl-timeline')?.value || '');
      return {
        ...previous,
        id,
        title: get('.bl-title')?.value || '',
        date: get('.bl-date')?.value || '',
        category: get('.bl-category')?.value || '',
        excerpt: get('.bl-excerpt')?.value || '',
        content: get('.bl-content')?.value || '',
        image: get('.bl-image')?.value || '',
        link: get('.bl-link')?.value || './blog.html',
        timeline: timeline
      };
    });
    return { posts };
  }

})();
