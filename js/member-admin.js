// Admin (social worker) console for listing members and reading their profiles
(function () {
  function qs(s, r = document) { return r.querySelector(s); }
  function el(tag, cls) { const x = document.createElement(tag); if (cls) x.className = cls; return x; }

  // ===== Utilities & state for completion/statistics =====
  const completionCache = new Map(); // username -> number (0-100)
  let allUsers = [];                 // raw users (exclude admins + self)
  let currentViewUsers = [];         // after search/sort/filter

  function fmtDate(d) {
    try {
      if (!d) return '';
      const dt = (d instanceof Date) ? d : new Date(d);
      if (isNaN(+dt)) return String(d).slice(0, 10);
      const pad = (n) => String(n).padStart(2, '0');
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    } catch (e) { return ''; }
  }
  function parseCreatedAtTs(v) {
    try {
      if (!v) return 0;
      if (typeof v === 'number') return v;
      const t = new Date(v).getTime();
      return isNaN(t) ? 0 : t;
    } catch (e) { return 0; }
  }
  function computeCompletionFromProfile(p) {
    try {
      p = p || {};
      const b = p.basic || {};
      const se = p.selfEvaluation || {};
      const acts = Array.isArray(p.activities) ? p.activities : [];
      const lrs = Array.isArray(p.learningRecords) ? p.learningRecords : [];
      let total = 10; let score = 0;
      const filled = (v) => !!String(v || '').trim();
      if (filled(b.name)) score++;
      if (filled(b.email)) score++;
      if (filled(b.phone)) score++;
      if (filled(b.birthday)) score++;
      if (filled(b.address)) score++;
      if (filled(se.interests)) score++;
      if (filled(se.strengths)) score++;
      if (filled(se.goals)) score++;
      if (acts.length > 0) score++;
      if (lrs.length > 0) score++;
      return (score / total) * 100;
    } catch (e) { return 0; }
  }
  async function computeCompletionFor(username) {
    if (completionCache.has(username)) return completionCache.get(username);
    const r = await profileRead(username);
    if (!r || !r.ok) { completionCache.set(username, undefined); return undefined; }
    const pct = computeCompletionFromProfile(r.profile || {});
    completionCache.set(username, pct);
    return pct;
  }

  async function membersList() {
    const base = (window.AppConfig && window.AppConfig.GAS_BASE_URL) || '';
    const ep = (window.AppConfig && window.AppConfig.endpoints && window.AppConfig.endpoints.membersList) || '';
    const token = localStorage.getItem('auth_token') || '';
    if (!base || !ep || !token) return { ok: false, message: '未登入或未設定後端' };
    try {
      const resp = await fetch(base + ep, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ token }) });
      return await resp.json();
    } catch (e) { return { ok: false, message: e.message }; }
  }

  async function profileRead(username) {
    const base = (window.AppConfig && window.AppConfig.GAS_BASE_URL) || '';
    const ep = (window.AppConfig && window.AppConfig.endpoints && window.AppConfig.endpoints.profileRead) || '';
    const token = localStorage.getItem('auth_token') || '';
    if (!base || !ep || !token) return { ok: false, message: '未登入或未設定後端' };
    try {
      const resp = await fetch(base + ep, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ token, username }) });
      return await resp.json();
    } catch (e) { return { ok: false, message: e.message }; }
  }

  function requireAdmin() {
    const role = (window.Auth && window.Auth.getRole && window.Auth.getRole()) || localStorage.getItem('auth_role');
    const token = localStorage.getItem('auth_token');
    if (!token || role !== 'admin') {
      // 非管理者轉回登入頁
      window.location.href = './member.html';
      return false;
    }
    return true;
  }

  function renderUserItem(u) {
    const li = el('li', 'p-3 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-between');
    const left = el('div'); left.innerHTML = `<div class="font-semibold text-gray-900 dark:text-gray-100">${u.username}</div><div class="text-xs text-gray-500">${u.email || ''} · 建立：${fmtDate(u.createdAt)}${(typeof u.completion === 'number') ? ` · 完成度：${Math.round(u.completion)}%` : ''}</div>`;
    const btn = el('button', 'btn-soft btn-purple text-xs px-2 py-1'); btn.textContent = '查看';
    btn.addEventListener('click', () => loadProfile(u.username));
    li.append(left, btn);
    return li;
  }

  function updateStats(arr) {
    try {
      const box = qs('#admin-stats'); if (!box) return;
      const threshold = Math.max(0, Math.min(100, Number(qs('#incomplete-threshold')?.value || 80)));
      const have = (arr || []).filter(u => typeof u.completion === 'number');
      if (!have.length) { box.textContent = '尚未計算完成度'; return; }
      const avg = have.reduce((s, u) => s + (u.completion || 0), 0) / have.length;
      const pass = have.filter(u => (u.completion || 0) >= threshold).length;
      box.textContent = `平均完成度：${Math.round(avg)}%（已計算 ${have.length} / 顯示 ${arr.length}）· 達標（≥${threshold}%）：${pass} 人`;
    } catch (e) { }
  }

  function applyFiltersAndRender() {
    const ul = qs('#users-list'); const st = qs('#users-status'); if (!ul) return;
    const q = (qs('#search-user')?.value || '').trim().toLowerCase();
    const sort = qs('#sort-select')?.value || 'createdAt_desc';
    const onlyIncomplete = !!qs('#filter-incomplete')?.checked;
    const threshold = Math.max(0, Math.min(100, Number(qs('#incomplete-threshold')?.value || 80)));
    let arr = (allUsers || [])
      .filter(u => !q || (String(u.username).toLowerCase().includes(q) || String(u.email || '').toLowerCase().includes(q)))
      .map(u => ({ ...u, completion: (typeof completionCache.get(u.username) === 'number' ? completionCache.get(u.username) : undefined), _ts: parseCreatedAtTs(u.createdAt) }));
    if (onlyIncomplete) arr = arr.filter(u => typeof u.completion === 'number' && u.completion < threshold);
    // sort
    arr.sort((a, b) => {
      switch (sort) {
        case 'createdAt_asc': return (a._ts - b._ts);
        case 'createdAt_desc': return (b._ts - a._ts);
        case 'username_desc': return String(b.username).localeCompare(String(a.username));
        case 'username_asc': return String(a.username).localeCompare(String(b.username));
        case 'completion_asc': {
          const av = (typeof a.completion === 'number') ? a.completion : Infinity;
          const bv = (typeof b.completion === 'number') ? b.completion : Infinity;
          return av - bv;
        }
        case 'completion_desc': {
          const av = (typeof a.completion === 'number') ? a.completion : -1;
          const bv = (typeof b.completion === 'number') ? b.completion : -1;
          return bv - av;
        }
      }
      return 0;
    });
    ul.innerHTML = '';
    arr.forEach(u => ul.appendChild(renderUserItem(u)));
    currentViewUsers = arr;
    if (st) st.textContent = `總學員：${(allUsers || []).length}；目前顯示：${arr.length}`;
    updateStats(arr);
  }

  async function computeCompletionsForCurrentView() {
    const st = qs('#users-status');
    const list = currentViewUsers || [];
    let done = 0;
    for (const u of list) {
      if (typeof completionCache.get(u.username) === 'number') { done++; continue; }
      if (st) st.textContent = `計算完成度中… ${done}/${list.length}`;
      try { await computeCompletionFor(u.username); } catch (e) { }
      done++;
      if (done % 3 === 0) applyFiltersAndRender();
      await new Promise(r => setTimeout(r, 650));
    }
    applyFiltersAndRender();
    if (st) st.textContent = `計算完成度完成（${done}/${list.length}）`;
  }

  function csvEscape(s) { if (s == null) return ''; const t = String(s); return (/[",\n]/.test(t)) ? '"' + t.replace(/"/g, '""') + '"' : t; }
  async function exportCsv() {
    const list = currentViewUsers || [];
    // ensure completion ready
    for (const u of list) {
      if (typeof completionCache.get(u.username) !== 'number') { try { await computeCompletionFor(u.username); } catch (e) { } await new Promise(r => setTimeout(r, 650)); }
    }
    const rows = [['username', 'email', 'createdAt', 'completion']];
    list.forEach(u => {
      const c = completionCache.get(u.username);
      rows.push([u.username, u.email || '', fmtDate(u.createdAt), (typeof c === 'number' ? Math.round(c) : '')]);
    });
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); const url = URL.createObjectURL(blob);
    a.href = url; a.download = `members-${Date.now()}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  async function refreshList() {
    const ul = qs('#users-list'); const st = qs('#users-status');
    if (st) st.textContent = '讀取中…';
    const r = await membersList();
    if (!r || !r.ok) { if (st) st.textContent = r && r.message || '讀取失敗'; return; }
    const me = localStorage.getItem('auth_user') || '';
    const onlyMembers = (r.users || []).filter(u => (u.role || 'member') !== 'admin' && u.username !== me);
    allUsers = onlyMembers;
    if (st) st.textContent = `總學員：${allUsers.length}`;
    applyFiltersAndRender();
  }

  async function loadProfile(username) {
    const label = qs('#selected-user-label'); if (label) label.textContent = username;
    const box = qs('#profile-view'); if (!box) return;
    box.innerHTML = '<div class="text-gray-500">載入中…</div>';
    const r = await profileRead(username);
    if (!r || !r.ok) { box.innerHTML = `<div class="text-rose-600">讀取失敗：${(r && r.message) || '未知錯誤'}</div>`; return; }
    const p = r.profile || {};
    const b = p.basic || {};
    const se = p.selfEvaluation || {};
    const acts = Array.isArray(p.activities) ? p.activities : [];
    const lrs = Array.isArray(p.learningRecords) ? p.learningRecords : [];

    function row(k, v) { return `<div class="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-700 last:border-0"><div class="text-gray-500 text-sm">${k}</div><div class="font-medium text-gray-900 dark:text-gray-100">${v || ''}</div></div>`; }
    function list(title, items) {
      if (!items.length) return '';
      return `<section class="mt-6"><h3 class="text-lg font-semibold mb-3 text-[var(--primary)] border-l-4 border-[var(--primary)] pl-2">${title}</h3><ul class="space-y-2">${items.map(it => `<li class="p-3 rounded bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between"><span>${it.title || it.name || ''}${it.date ? ` <span class='text-xs text-gray-500'>(${it.date})</span>` : ''}</span></li>`).join('')}</ul></section>`;
    }

    box.innerHTML = `
      <article class="space-y-2">
        <section>
          <h3 class="text-lg font-semibold mb-2">基本資料</h3>
          ${row('姓名', b.name)}
          ${row('Email', b.email)}
          ${row('電話', b.phone)}
          ${row('生日', b.birthday)}
          ${row('地址', b.address)}
        </section>
        <section class="mt-4">
          <h3 class="text-lg font-semibold mb-2">自立評估</h3>
          ${row('興趣/志向', se.interests)}
          ${row('優勢/擅長', se.strengths)}
          ${row('短中期目標', se.goals)}
        </section>
        ${list('活動記錄', acts)}
        ${list('學習歷程', lrs)}
      </article>
    `;
  }

  function bind() {
    if (!requireAdmin()) return;
    // logout
    qs('#admin-logout')?.addEventListener('click', () => { try { window.Auth && window.Auth.logout && window.Auth.logout(); } catch (e) { } window.location.href = './member.html'; });
    qs('#btn-refresh')?.addEventListener('click', refreshList);
    qs('#search-user')?.addEventListener('input', applyFiltersAndRender);
    // Custom sort dropdown (animated)
    (function () {
      const btn = qs('#sort-button');
      const menu = qs('#sort-menu');
      const label = qs('#sort-button-label');
      const sel = qs('#sort-select');
      function openMenu() { if (!menu || !btn) return; menu.classList.remove('opacity-0', 'scale-95', 'pointer-events-none'); menu.classList.add('opacity-100', 'scale-100'); btn.setAttribute('aria-expanded', 'true'); }
      function closeMenu() { if (!menu || !btn) return; menu.classList.add('opacity-0', 'scale-95', 'pointer-events-none'); menu.classList.remove('opacity-100', 'scale-100'); btn.setAttribute('aria-expanded', 'false'); }
      if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); const exp = btn.getAttribute('aria-expanded') === 'true'; exp ? closeMenu() : openMenu(); });
      if (menu) menu.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-value]'); if (!b) return;
        const val = b.getAttribute('data-value');
        const map = {
          createdAt_desc: '建立時間（新→舊）', createdAt_asc: '建立時間（舊→新）',
          username_asc: '帳號（A→Z）', username_desc: '帳號（Z→A）',
          completion_desc: '完成度（高→低）', completion_asc: '完成度（低→高）'
        };
        if (sel) { sel.value = val; try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { } }
        if (label) label.textContent = map[val] || val;
        closeMenu();
      });
      document.addEventListener('click', (e) => { if (!menu || !btn) return; if (!menu.contains(e.target) && !btn.contains(e.target)) closeMenu(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
      // init label from current value
      try {
        const map = {
          createdAt_desc: '建立時間（新→舊）', createdAt_asc: '建立時間（舊→新）',
          username_asc: '帳號（A→Z）', username_desc: '帳號（Z→A）',
          completion_desc: '完成度（高→低）', completion_asc: '完成度（低→高）'
        };
        if (label && sel) label.textContent = map[sel.value] || sel.value || '建立時間（新→舊）';
      } catch (e) { }
      sel?.addEventListener('change', applyFiltersAndRender);
    })();
    qs('#filter-incomplete')?.addEventListener('change', applyFiltersAndRender);
    qs('#incomplete-threshold')?.addEventListener('input', applyFiltersAndRender);
    qs('#btn-calc')?.addEventListener('click', computeCompletionsForCurrentView);
    qs('#btn-export')?.addEventListener('click', exportCsv);
    refreshList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else { bind(); }
})();
