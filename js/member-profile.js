// Renders and manages the Member Profile page
(function () {
  function qs(s, r=document) { return r.querySelector(s); }
  function setBtnLoading(btn, loading=true){
    if (!btn) return;
    if (!btn.dataset.orig) btn.dataset.orig = btn.innerHTML;
    btn.disabled = !!loading;
    btn.classList.toggle('opacity-50', !!loading);
    btn.classList.toggle('cursor-not-allowed', !!loading);
    if (loading) { btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-2 inline-block align-[-2px]" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>` + (btn.textContent || '處理中…'); } else { btn.innerHTML = btn.dataset.orig; }
  }

  const SURFACES = ['surface-1','surface-2','surface-3'];
  let surfaceIndex = 0;
  function nextSurface(){ const s = SURFACES[surfaceIndex % SURFACES.length]; surfaceIndex++; return s; }
  // Keep a draft profile and user across re-renders
  let currentProfile = null;
  let currentUser = '';

  function card(title, bodyHTML, actionsHTML = '') {
    const wrap = document.createElement('section');
    wrap.className = `${nextSurface()} rounded-lg shadow p-6 fade-appear`;
    wrap.innerHTML = `
      <header class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-semibold">${title}</h2>
        <div>${actionsHTML}</div>
      </header>
      <div>${bodyHTML}</div>
    `;
    return wrap;
  }

  function textInput(id, label, value, type='text', extra='') {
    return `
      <label class="block mb-2 text-sm text-gray-700 dark:text-gray-300" for="${id}">${label}</label>
      <input id="${id}" type="${type}" value="${value || ''}" class="w-full mb-4 rounded border px-3 py-2 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400" ${extra} />
    `;
  }

  function textArea(id, label, value, rows=3) {
    return `
      <label class="block mb-2 text-sm text-gray-700 dark:text-gray-300" for="${id}">${label}</label>
      <textarea id="${id}" rows="${rows}" class="w-full mb-4 rounded border px-3 py-2 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400">${value || ''}</textarea>
    `;
  }

  // Generic editable list for items with title/date fields (活動、學習)
  function listItems(items, listName) {
    const arr = Array.isArray(items) ? items : [];
    if (!arr.length) return '<div class="text-gray-500 dark:text-gray-400">尚無資料</div>';
    return `<ul class="space-y-2" data-list-container="${listName}">${arr.map((it,i)=>`
      <li class="p-3 rounded bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2 flex-wrap">
        <input data-list="${listName}" data-index="${i}" data-field="title" type="text" placeholder="名稱" value="${it.title||''}" class="flex-1 rounded border px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        <input data-list="${listName}" data-index="${i}" data-field="date" type="date" value="${it.date||''}" class="rounded border px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        <div class="ml-auto inline-flex items-center gap-1">
          <button type="button" class="btn-soft btn-yellow" data-action="up" data-list="${listName}" data-index="${i}" title="上移"><i class="fas fa-arrow-up"></i></button>
          <button type="button" class="btn-soft btn-yellow" data-action="down" data-list="${listName}" data-index="${i}" title="下移"><i class="fas fa-arrow-down"></i></button>
          <button type="button" class="btn-soft btn-orange" data-action="dup" data-list="${listName}" data-index="${i}" title="複製"><i class="fas fa-copy"></i></button>
          <button type="button" class="btn-soft btn-purple" data-action="del" data-list="${listName}" data-index="${i}" title="刪除"><i class="fas fa-trash"></i></button>
        </div>
      </li>`).join('')}</ul>`;
  }

  function showSkeleton(){
    const sections = qs('#profile-sections'); if (!sections) return;
    const sk = [];
    for (let i=0;i<5;i++){
      sk.push(`
        <div class="skeleton-card surface-2">
          <div class="flex items-center gap-3 mb-3">
            <div class="skeleton-avatar skeleton"></div>
            <div class="flex-1">
              <div class="skeleton skeleton-line" style="width: 40%"></div>
              <div class="skeleton skeleton-line" style="width: 24%"></div>
            </div>
          </div>
          <div class="skeleton skeleton-line" style="width: 90%"></div>
          <div class="skeleton skeleton-line" style="width: 75%"></div>
          <div class="skeleton skeleton-line" style="width: 60%"></div>
        </div>
      `);
    }
    sections.innerHTML = sk.join('');
  }

  async function render() {
    const sections = qs('#profile-sections');
    const welcome = qs('#welcome-user');
    const user = (window.MemberData && window.MemberData.currentUser && window.MemberData.currentUser()) || '';
    if (welcome) welcome.textContent = user ? `歡迎回來，${user}` : '歡迎回來！';

    if (!window.MemberData || !window.MemberData.isLoggedIn || !window.MemberData.isLoggedIn()) {
      // not logged in
      window.location.href = './member.html';
      return;
    }

    // skeleton loading while request
    showSkeleton();
    let profile = currentProfile ? JSON.parse(JSON.stringify(currentProfile)) : await window.MemberData.loadProfile(user);
    // ensure new fields exist
    profile.activities = Array.isArray(profile.activities) ? profile.activities : [];
    profile.learningRecords = Array.isArray(profile.learningRecords) ? profile.learningRecords : [];
    profile.skills = Array.isArray(profile.skills) ? profile.skills : [];
    profile.portfolio = Array.isArray(profile.portfolio) ? profile.portfolio : [];
    profile.journal = Array.isArray(profile.journal) ? profile.journal : [];
    currentProfile = profile;
    currentUser = user;

    sections.innerHTML = '';

    // Dashboard summary (completion + export)
    function completion(profile) {
      const b = profile.basic || {};
      const s = profile.selfEvaluation || {};
      const basicFields = ['name','email','phone','birthday','address'];
      const selfFields = ['interests','strengths','goals'];
      const basicFilled = basicFields.reduce((acc,k)=> acc + (b[k]?1:0), 0);
      const selfFilled = selfFields.reduce((acc,k)=> acc + (s[k]?1:0), 0);
      const actCount = (profile.activities||[]).length;
      const lrCount = (profile.learningRecords||[]).length;
      const score = Math.min(100,
        Math.round((basicFilled/5)*45 + (selfFilled/3)*30 + Math.min(actCount,3)/3*12 + Math.min(lrCount,3)/3*13)
      );
      return { score, basicFilled, selfFilled, actCount, lrCount };
    }

    function dashboardCard(p){
      const d = completion(p);
      const body = `
        <div class="grid md:grid-cols-4 gap-4 items-center">
          <div class="md:col-span-2">
            <div class="text-sm text-gray-600 dark:text-gray-300 mb-1">完成度</div>
            <div class=\"w-full h-3 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden\">
              <div class=\"h-3 bg-purple-500\" style=\"width:${d.score}%;\"></div>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${d.score}%</div>
          </div>
          <div class="space-y-1">
            <div class="text-sm">基本資料 <span class="text-gray-500">${d.basicFilled}/5</span></div>
            <div class="text-sm">自立評估 <span class="text-gray-500">${d.selfFilled}/3</span></div>
          </div>
          <div class="space-y-1">
            <div class="text-sm">活動記錄 <span class="text-gray-500">${d.actCount}</span></div>
            <div class="text-sm">學習歷程 <span class="text-gray-500">${d.lrCount}</span></div>
          </div>
        </div>
      `;
      const actions = `
        <div class=\"flex gap-2\">
          <button id=\"export-json\" class=\"btn-soft btn-purple\"><i class=\"fas fa-file-export mr-2\"></i> 匯出 JSON</button>
          <button id=\"export-png\" class=\"btn-soft btn-orange\"><i class=\"fas fa-image mr-2\"></i> 匯出圖片</button>
        </div>
      `;
      const c = card('資料總覽', body, actions);
      c.id = 'profile-dashboard';
      return c;
    }

    // Header summary with avatar
    function headerCard(p){
      const b = p.basic || {};
      const name = b.name || user || '使用者';
      const avatar = p.avatarData || '';
      const body = `
        <div class="flex items-center gap-4">
          <div id="pf-avatar-view" class="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-300">
            ${avatar ? `<img alt="avatar" src="${avatar}" class="w-full h-full object-cover"/>` : (name ? name.charAt(0).toUpperCase() : '?')}
          </div>
          <div class="flex-1">
            <div class="text-lg font-semibold">${name}</div>
            <div class="text-sm text-gray-500">${b.email||''}</div>
          </div>
        </div>
        <div class="mt-4 grid flex-wrap gap-2 items-center">
          <input id="pf-avatar-file" type="file" accept="image/*" class="hidden" />
          <button id="btn-avatar-choose" class="btn-soft btn-purple"><i class="fas fa-file-upload mr-2"></i> 選擇檔案</button>
          <span id="avatar-file-name" class="text-sm text-gray-500"></span>
          <div class="flex gap-2">
          <button id="btn-avatar-remove" class="btn-soft btn-orange"><i class="fas fa-trash mr-2"></i> 移除</button>
        </div>
      </div>`;
      return card('個人檔案', body);
    }

    const header = headerCard(profile);
    sections.appendChild(header);

    const dash = dashboardCard(profile);
    sections.appendChild(dash);

    // Prepare a two-column grid for editable sections
    const gridWrap = document.createElement('div');
    gridWrap.className = 'grid md:grid-cols-2 gap-6';
    sections.appendChild(gridWrap);

    // Basic
    const basicBody = `
      ${textInput('pf-name','姓名', profile.basic?.name)}
      ${textInput('pf-email','Email', profile.basic?.email,'email')}
      ${textInput('pf-phone','電話', profile.basic?.phone,'tel')}
      ${textInput('pf-birthday','生日', profile.basic?.birthday,'date')}
      ${textInput('pf-address','地址', profile.basic?.address)}
    `;
    const basicActions = '';
    const basicCard = card('基本資料', basicBody, basicActions);
    gridWrap.appendChild(basicCard);

    // Self Evaluation
    const evalBody = `
      ${textArea('pf-interests','興趣/志向', profile.selfEvaluation?.interests, 3)}
      ${textArea('pf-strengths','優勢/擅長', profile.selfEvaluation?.strengths, 3)}
      ${textArea('pf-goals','短中期目標', profile.selfEvaluation?.goals, 3)}
    `;
    const evalActions = '';
    const evalCard = card('自立評估', evalBody, evalActions);
    gridWrap.appendChild(evalCard);

    // Activities
    const actBody = `
      <div data-list-host="activities">${listItems(profile.activities, 'activities')}</div>
      <div class="mt-4 grid flex-wrap gap-2">
        <input id="act-title" type="text" placeholder="活動名稱" class="rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        <input id="act-date" type="date" class="rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        <button id=\"add-activity\" class=\"btn-soft btn-green\"><i class=\"fas fa-plus mr-2\"></i> 新增</button>
      </div>
    `;
    const actCard = card('活動記錄', actBody);
    gridWrap.appendChild(actCard);

    // Learning Records
    const learnBody = `
      <div data-list-host="learningRecords">${listItems(profile.learningRecords, 'learningRecords')}</div>
      <div class="mt-4 grid flex-wrap gap-2">
        <input id="lr-title" type="text" placeholder="學習主題" class="rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        <input id="lr-date" type="date" class="rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        <button id=\"add-learning\" class=\"btn-soft btn-green\"><i class=\"fas fa-plus mr-2\"></i> 新增</button>
      </div>
    `;
    const learnCard = card('學習歷程', learnBody);
    gridWrap.appendChild(learnCard);

    // Skills / Tags
    function listSkills(items){
      const arr = Array.isArray(items) ? items : [];
      if (!arr.length) return '<div class="text-gray-500 dark:text-gray-400">尚無標籤</div>';
      return `<ul class="space-y-2" data-list-container="skills">${arr.map((t,i)=>`
        <li class="p-3 rounded bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2 flex-wrap">
          <input data-list="skills" data-index="${i}" data-field="value" type="text" value="${String(t)}" class="flex-1 rounded border px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
          <div class="ml-auto inline-flex items-center gap-1">
            <button type="button" class="btn-soft btn-yellow" data-action="up" data-list="skills" data-index="${i}" title="上移"><i class="fas fa-arrow-up"></i></button>
            <button type="button" class="btn-soft btn-yellow" data-action="down" data-list="skills" data-index="${i}" title="下移"><i class="fas fa-arrow-down"></i></button>
            <button type="button" class="btn-soft btn-orange" data-action="dup" data-list="skills" data-index="${i}" title="複製"><i class="fas fa-copy"></i></button>
            <button type="button" class="btn-soft btn-purple" data-action="del" data-list="skills" data-index="${i}" title="刪除"><i class="fas fa-trash"></i></button>
          </div>
        </li>`).join('')}</ul>`;
    }
    const skillsBody = `
      <div data-list-host="skills">${listSkills(profile.skills)}</div>
      <div class="mt-4 grid flex-wrap gap-2">
        <input id="skill-input" type="text" placeholder="新增技能/證照" class="rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 md:col-span-2">
        <button id=\"add-skill\" class=\"btn-soft btn-green\"><i class=\"fas fa-plus mr-2\"></i> 新增</button>
      </div>`;
    const skillsCard = card('技能／證照標籤', skillsBody);
    gridWrap.appendChild(skillsCard);

    // Portfolio links
    function listLinks(items){
      const arr = Array.isArray(items) ? items : [];
      if (!arr.length) return '<div class="text-gray-500 dark:text-gray-400">尚無連結</div>';
      return `<ul class="space-y-2" data-list-container="portfolio">${arr.map((it,i)=>`
        <li class="p-3 rounded bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2 flex-wrap">
          <input data-list="portfolio" data-index="${i}" data-field="title" type="text" placeholder="連結名稱" value="${it.title||''}" class="rounded border px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 flex-1">
          <input data-list="portfolio" data-index="${i}" data-field="url" type="url" placeholder="https://..." value="${it.url||''}" class="rounded border px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 flex-[2]">
          <a href="${it.url||'#'}" target="_blank" class="btn-soft btn-green" title="開啟"><i class="fas fa-external-link-alt"></i></a>
          <div class="ml-auto inline-flex items-center gap-1">
            <button type="button" class="btn-soft btn-yellow" data-action="up" data-list="portfolio" data-index="${i}" title="上移"><i class="fas fa-arrow-up"></i></button>
            <button type="button" class="btn-soft btn-yellow" data-action="down" data-list="portfolio" data-index="${i}" title="下移"><i class="fas fa-arrow-down"></i></button>
            <button type="button" class="btn-soft btn-orange" data-action="dup" data-list="portfolio" data-index="${i}" title="複製"><i class="fas fa-copy"></i></button>
            <button type="button" class="btn-soft btn-purple" data-action="del" data-list="portfolio" data-index="${i}" title="刪除"><i class="fas fa-trash"></i></button>
          </div>
        </li>`).join('')}</ul>`;
    }
    const pfBody = `
      <div data-list-host="portfolio">${listLinks(profile.portfolio)}</div>
      <div class="mt-4 grid flex-wrap gap-2">
        <input id="pf-link-title" type="text" placeholder="連結名稱" class="rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        <input id="pf-link-url" type="url" placeholder="https://..." class="rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        <button id=\"add-link\" class=\"btn-soft btn-green\"><i class=\"fas fa-plus mr-2\"></i> 新增</button>
      </div>`;
    const pfCard = card('作品／連結', pfBody);
    gridWrap.appendChild(pfCard);

    // Mood journal
    function listJournal(items){
      const arr = Array.isArray(items) ? items : [];
      if (!arr.length) return '<div class="text-gray-500 dark:text-gray-400">尚無紀錄</div>';
      return `<ul class="space-y-2" data-list-container="journal">${arr.map((it,i)=>`
        <li class="p-3 rounded bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2 flex-wrap">
          <input data-list="journal" data-index="${i}" data-field="date" type="date" value="${it.date||''}" class="rounded border px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
          <input data-list="journal" data-index="${i}" data-field="text" type="text" placeholder="內容" value="${it.text||''}" class="flex-1 rounded border px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
          <div class="ml-auto inline-flex items-center gap-1">
            <button type="button" class="btn-soft btn-yellow" data-action="up" data-list="journal" data-index="${i}" title="上移"><i class="fas fa-arrow-up"></i></button>
            <button type="button" class="btn-soft btn-yellow" data-action="down" data-list="journal" data-index="${i}" title="下移"><i class="fas fa-arrow-down"></i></button>
            <button type="button" class="btn-soft btn-orange" data-action="dup" data-list="journal" data-index="${i}" title="複製"><i class="fas fa-copy"></i></button>
            <button type="button" class="btn-soft btn-purple" data-action="del" data-list="journal" data-index="${i}" title="刪除"><i class="fas fa-trash"></i></button>
          </div>
        </li>`).join('')}</ul>`;
    }
    const jBody = `
      <div data-list-host="journal">${listJournal(profile.journal)}</div>
      <div class="mt-4 grid flex-wrap gap-2">
        <input id="journal-date" type="date" class="rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        <input id="journal-text" type="text" placeholder="今天的心情／學習心得" class="rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 md:col-span-2">
        <button id=\"add-journal\" class=\"btn-soft btn-green\"><i class=\"fas fa-plus mr-2\"></i> 新增</button>
      </div>`;
    const jCard = card('情緒／學習札記', jBody);
    gridWrap.appendChild(jCard);

    // Timeline (full width, after grid)
    function timelineCard(p){
      const evts = [];
      (p.activities||[]).forEach(it=> evts.push({ type:'活動', title: it.title||'', date: it.date||'' }));
      (p.learningRecords||[]).forEach(it=> evts.push({ type:'學習', title: it.title||'', date: it.date||'' }));
      (p.journal||[]).forEach(it=> evts.push({ type:'札記', title: (it.text||'').slice(0,30), date: it.date||'' }));
      evts.sort((a,b)=> new Date(b.date||0) - new Date(a.date||0));
      const body = evts.length ? `
        <ol class="relative border-l border-gray-200 dark:border-gray-600 space-y-4 pl-4">
          ${evts.slice(0,12).map(e=>`
            <li>
              <div class=\"absolute -left-1.5 w-3 h-3 rounded-full ${e.type==='活動'?'bg-green-400':e.type==='學習'?'bg-blue-400':'bg-purple-400'}\"></div>
              <time class=\"mb-1 text-xs text-gray-500\">${e.date||''}</time>
              <div class=\"text-sm\"><span class=\"text-gray-500\">${e.type}</span> · ${e.title||''}</div>
            </li>`).join('')}
        </ol>` : '<div class="text-gray-500 dark:text-gray-400">尚無時間軸資料</div>';
      return card('我的里程碑', body);
    }
    const tl = timelineCard(profile);
    sections.appendChild(tl);
    try { tl.id = 'profile-timeline'; } catch(e){}

    // Change Password card
    const pwdBody = `
      <div class="grid flex-wrap gap-3">
        <label class="text-sm">當前密碼
          <input id="pwd-current" type="password" class="w-full rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        </label>
        <label class="text-sm">新密碼
          <input id="pwd-new" type="password" class="w-full rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        </label>
        <label class="text-sm">確認新密碼
          <input id="pwd-confirm" type="password" class="w-full rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        </label>
      </div>`;
    const pwdActions = `<button id="btn-change-pwd" class="btn-soft btn-purple"><i class="fas fa-key mr-2"></i> 修改密碼</button>`;
    const pwdCard = card('修改密碼', pwdBody, pwdActions);
    sections.appendChild(pwdCard);

    // local helpers to re-render just parts to avoid full-screen flicker
    function rerenderList(listName){
      try {
        const host = sections.querySelector(`[data-list-host="${listName}"]`);
        if (!host) return;
        let html = '';
        if (listName === 'skills') html = listSkills(currentProfile.skills);
        else if (listName === 'portfolio') html = listLinks(currentProfile.portfolio);
        else if (listName === 'journal') html = listJournal(currentProfile.journal);
        else html = listItems(currentProfile[listName] || [], listName);
        host.innerHTML = html;
      } catch(e) { /* noop */ }
    }
    function rerenderTimeline(){
      try {
        const host = sections.querySelector('#profile-timeline');
        if (!host) return;
        const fresh = timelineCard(currentProfile);
        fresh.id = 'profile-timeline';
        host.replaceWith(fresh);
      } catch(e){}
    }

    function focusListItem(listName, index, field){
      try{
        const sel = field ? `[data-list="${listName}"][data-index="${index}"][data-field="${field}"]` : `[data-list="${listName}"][data-index="${index}"]`;
        const el = sections.querySelector(sel);
        if (el && typeof el.focus === 'function') {
          el.focus();
          if (typeof el.setSelectionRange === 'function' && typeof el.value === 'string') {
            const pos = el.value.length; el.setSelectionRange(pos, pos);
          }
        }
      }catch(e){}
    }

    // fade in
    requestAnimationFrame(()=>{
      sections.querySelectorAll('.fade-appear').forEach(el=> el.classList.add('show'));
    });

    // Bind actions
    function toast(msg, ok=true) {
      if (window.Toast && window.Toast.show) {
        window.Toast.show(String(msg||''), ok ? 'success' : 'error', 3000);
        return;
      }
      // fallback
      alert(String(msg||''));
    }

    // Global saving overlay (full screen)
    function getSavingOverlay(){
      let ov = document.getElementById('saving-overlay');
      if (!ov){
        ov = document.createElement('div');
        ov.id = 'saving-overlay';
        ov.className = 'fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] hidden';
        ov.innerHTML = `
          <div class="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-6 py-4 shadow-lg flex items-center gap-3">
            <svg class="h-6 w-6 animate-spin text-purple-600" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
            <span>儲存中…</span>
          </div>`;
        document.body.appendChild(ov);
      }
      return ov;
    }
    function showSavingOverlay(show){
      const ov = getSavingOverlay();
      if (!ov) return;
      ov.classList.toggle('hidden', !show);
    }

    // Avatar helpers: choose button, resize/compress, save & update header without full rerender
    function updateHeaderAvatarElement(dataUrl){
      try{
        const box = qs('#pf-avatar-view');
        if (!box) return;
        if (dataUrl) {
          box.innerHTML = `<img alt="avatar" src="${dataUrl}" class="w-full h-full object-cover"/>`;
        } else {
          const nm = (currentProfile.basic && currentProfile.basic.name) || currentUser || 'U';
          box.textContent = (nm ? nm.charAt(0).toUpperCase() : '?');
        }
      }catch(e){}
    }

    function resizeImageToDataURL(file, size=192, mime='image/png', quality=0.9){
      return new Promise((resolve, reject)=>{
        try{
          const fr = new FileReader();
          fr.onerror = reject;
          fr.onload = ()=>{
            const img = new Image();
            img.onload = ()=>{
              try{
                const canvas = document.createElement('canvas');
                canvas.width = size; canvas.height = size;
                const ctx = canvas.getContext('2d');
                // cover crop center-square
                const iw = img.naturalWidth, ih = img.naturalHeight;
                const side = Math.min(iw, ih);
                const sx = Math.max(0, (iw - side)/2);
                const sy = Math.max(0, (ih - side)/2);
                ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,size,size);
                ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
                const url = canvas.toDataURL(mime, quality);
                resolve(url);
              }catch(err){ reject(err); }
            };
            img.onerror = reject;
            img.src = fr.result;
          };
          fr.readAsDataURL(file);
        }catch(e){ reject(e); }
      });
    }

    qs('#btn-avatar-choose')?.addEventListener('click', ()=>{ qs('#pf-avatar-file')?.click(); });
    qs('#pf-avatar-file')?.addEventListener('change', async ()=>{
      try{
        const inp = qs('#pf-avatar-file');
        const f = inp?.files?.[0];
        qs('#avatar-file-name').textContent = f ? f.name : '';
        if (!f) return;
        // 立即產生縮圖並預覽，但先不儲存到遠端；等待全域儲存按鈕
        const dataUrl = await resizeImageToDataURL(f, 192, 'image/png', 0.9);
        currentProfile.avatarData = String(dataUrl||'');
        profile.avatarData = String(dataUrl||'');
        updateHeaderAvatarElement(currentProfile.avatarData);
        toast('已載入新大頭貼，請按「儲存」以完成', true);
      }catch(e){ toast('大頭貼處理失敗：' + e.message, false); }
    });
    qs('#btn-avatar-remove')?.addEventListener('click', async ()=>{
      delete profile.avatarData;
      delete currentProfile.avatarData;
      updateHeaderAvatarElement('');
      toast('已移除大頭貼，請按「儲存」以完成', true);
    });

    // Global Save button
    function syncFromForm(){
      currentProfile.basic = {
        name: qs('#pf-name')?.value || '',
        email: qs('#pf-email')?.value || '',
        phone: qs('#pf-phone')?.value || '',
        birthday: qs('#pf-birthday')?.value || '',
        address: qs('#pf-address')?.value || ''
      };
      currentProfile.selfEvaluation = {
        interests: qs('#pf-interests')?.value || '',
        strengths: qs('#pf-strengths')?.value || '',
        goals: qs('#pf-goals')?.value || ''
      };
    }
    const btnGlobalSave = document.getElementById('profile-save');
    if (btnGlobalSave && !btnGlobalSave.dataset.bound) {
      btnGlobalSave.dataset.bound = '1';
      btnGlobalSave.addEventListener('click', async ()=>{
        try {
          showSavingOverlay(true);
          setBtnLoading(btnGlobalSave, true);
          syncFromForm();
          const r = await window.MemberData.saveProfile(currentUser, currentProfile);
          toast(r && r.ok ? '已儲存' : (r && r.message) || '儲存失敗', !!(r && r.ok));
          await render();
        } catch(e){ toast('儲存錯誤：' + e.message, false); }
        finally { setBtnLoading(btnGlobalSave, false); showSavingOverlay(false); }
      });
    }

    qs('#add-activity')?.addEventListener('click', (ev)=>{
      try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){}
      const title = qs('#act-title')?.value?.trim();
      const date = qs('#act-date')?.value;
      if (!title) { toast('請輸入活動名稱', false); return; }
      currentProfile.activities = Array.isArray(currentProfile.activities) ? currentProfile.activities : [];
      currentProfile.activities.push({ title, date });
      try{ qs('#act-title').value=''; qs('#act-date').value=''; }catch(e){}
      rerenderList('activities');
      rerenderTimeline();
      focusListItem('activities', (currentProfile.activities.length-1), 'title');
    });

    qs('#add-learning')?.addEventListener('click', (ev)=>{
      try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){}
      const title = qs('#lr-title')?.value?.trim();
      const date = qs('#lr-date')?.value;
      if (!title) { toast('請輸入學習主題', false); return; }
      currentProfile.learningRecords = Array.isArray(currentProfile.learningRecords) ? currentProfile.learningRecords : [];
      currentProfile.learningRecords.push({ title, date });
      try{ qs('#lr-title').value=''; qs('#lr-date').value=''; }catch(e){}
      rerenderList('learningRecords');
      rerenderTimeline();
      focusListItem('learningRecords', (currentProfile.learningRecords.length-1), 'title');
    });

    // Add skill/tag
    qs('#add-skill')?.addEventListener('click', (ev)=>{
      try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){}
      const t = (qs('#skill-input')?.value || '').trim();
      if (!t) { toast('請輸入技能/證照', false); return; }
      currentProfile.skills = Array.isArray(currentProfile.skills) ? currentProfile.skills : [];
      if (!currentProfile.skills.includes(t)) currentProfile.skills.push(t);
      try{ qs('#skill-input').value=''; }catch(e){}
      rerenderList('skills');
      focusListItem('skills', (currentProfile.skills.length-1), 'value');
    });

    // Add portfolio link
    qs('#add-link')?.addEventListener('click', (ev)=>{
      try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){}
      const title = (qs('#pf-link-title')?.value || '').trim();
      const url = (qs('#pf-link-url')?.value || '').trim();
      if (!title || !url) { toast('請輸入連結名稱與網址', false); return; }
      currentProfile.portfolio = Array.isArray(currentProfile.portfolio) ? currentProfile.portfolio : [];
      currentProfile.portfolio.push({ title, url });
      try{ qs('#pf-link-title').value=''; qs('#pf-link-url').value=''; }catch(e){}
      rerenderList('portfolio');
      focusListItem('portfolio', (currentProfile.portfolio.length-1), 'title');
    });

    // Add journal
    qs('#add-journal')?.addEventListener('click', (ev)=>{
      try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){}
      const text = (qs('#journal-text')?.value || '').trim();
      const date = qs('#journal-date')?.value || new Date().toISOString().slice(0,10);
      if (!text) { toast('請輸入內容', false); return; }
      currentProfile.journal = Array.isArray(currentProfile.journal) ? currentProfile.journal : [];
      currentProfile.journal.push({ text, date });
      try{ qs('#journal-text').value=''; }catch(e){}
      rerenderList('journal');
      rerenderTimeline();
      focusListItem('journal', (currentProfile.journal.length-1), 'text');
    });

    // Delegate edits and list controls (bind once per page life)
    if (sections && !sections.dataset.delegated) {
      sections.addEventListener('input', (e)=>{
        const el = e.target;
        if (!(el instanceof HTMLElement)) return;
        const list = el.getAttribute('data-list');
        const idxStr = el.getAttribute('data-index');
        const field = el.getAttribute('data-field');
        if (!list || idxStr == null) return;
        const idx = Number(idxStr);
        if (!currentProfile[list]) return;
        if (list === 'skills' && field === 'value') {
          currentProfile.skills[idx] = el.value || '';
        } else if (Array.isArray(currentProfile[list])) {
          const item = currentProfile[list][idx] || {};
          item[field] = el.value || '';
          currentProfile[list][idx] = item;
        }
      });

      sections.addEventListener('click', (e)=>{
        const btn = (e.target && (e.target.closest && e.target.closest('button[data-action]')));
        if (!btn) return;
        try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
        const action = btn.getAttribute('data-action');
        const list = btn.getAttribute('data-list');
        const idx = Number(btn.getAttribute('data-index'));
        if (!list || !Array.isArray(currentProfile[list])) return;
        const arr = currentProfile[list];
        let newIdx = idx;
        if (action === 'up' && idx > 0) {
          [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
          newIdx = idx-1;
        } else if (action === 'down' && idx < arr.length-1) {
          [arr[idx+1], arr[idx]] = [arr[idx], arr[idx+1]];
          newIdx = idx+1;
        } else if (action === 'dup') {
          const copy = JSON.parse(JSON.stringify(arr[idx]));
          arr.splice(idx+1, 0, copy);
          newIdx = idx+1;
        } else if (action === 'del') {
          arr.splice(idx, 1);
          newIdx = Math.max(0, Math.min(idx, arr.length-1));
        }
        rerenderList(list);
        if (list==='activities' || list==='learningRecords' || list==='journal') rerenderTimeline();
        if (arr.length) {
          const fieldMap = { activities:'title', learningRecords:'title', skills:'value', portfolio:'title', journal:'text' };
          focusListItem(list, newIdx, fieldMap[list]);
        }
      });
      sections.dataset.delegated = '1';
    }

    // Change password
    const btnPwd = qs('#btn-change-pwd');
    btnPwd?.addEventListener('click', async ()=>{
      const cur = qs('#pwd-current')?.value || '';
      const nw = qs('#pwd-new')?.value || '';
      const cf = qs('#pwd-confirm')?.value || '';
      if (!cur || !nw || !cf) { toast('請完整填寫欄位', false); return; }
      if (nw !== cf) { toast('兩次新密碼不一致', false); return; }
      try {
        setBtnLoading(btnPwd, true);
        const r = await (window.Auth && window.Auth.changePassword ? window.Auth.changePassword(cur, nw) : Promise.resolve({ ok:false, message:'尚未載入 Auth' }));
        if (!r || !r.ok) { toast((r && r.message) || '修改密碼失敗', false); return; }
        toast('已修改密碼，請妥善保管');
        qs('#pwd-current').value = qs('#pwd-new').value = qs('#pwd-confirm').value = '';
      } catch(e){ toast('修改密碼錯誤：' + e.message, false); }
      finally { setBtnLoading(btnPwd, false); }
    });

    // Export handlers
    qs('#export-json')?.addEventListener('click', ()=>{
      const dataStr = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentProfile, null, 2));
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = `profile_${user || 'guest'}.json`;
      document.body.appendChild(a); a.click(); a.remove();
    });
    qs('#export-png')?.addEventListener('click', async ()=>{
      if (!window.html2canvas) {
        toast('圖片匯出元件未載入', false);
        return;
      }
      const target = qs('#profile-sections');
      const bg = getComputedStyle(document.body).backgroundColor || (document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff');
      const canvas = await window.html2canvas(target, { useCORS: true, backgroundColor: bg, scale: 2 });
      canvas.toBlob((blob)=>{
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `profile_${user || 'guest'}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=> URL.revokeObjectURL(url), 1500);
      });
    });
  }

  function init() {
    if (!window.MemberData || !window.MemberData.isLoggedIn || !window.MemberData.isLoggedIn()) {
      window.location.href = './member.html';
      return;
    }
    // 登出
    try {
      const btn = document.getElementById('member-logout');
      if (btn) {
        btn.addEventListener('click', ()=>{ try { window.Auth && window.Auth.logout && window.Auth.logout(); } catch(e){} window.location.href = './member.html'; });
      }
    } catch(e){}
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
