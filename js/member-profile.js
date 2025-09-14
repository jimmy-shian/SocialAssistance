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

  function listItems(items) {
    if (!items || !items.length) return '<div class="text-gray-500 dark:text-gray-400">尚無資料</div>';
    return `<ul class="space-y-2">${items.map((it,i)=>`<li class="p-3 rounded bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between"><span>${it.title || it.name || ('項目'+(i+1))}${it.date?` <span class='text-xs text-gray-500'>(${it.date})</span>`:''}</span></li>`).join('')}</ul>`;
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
    const profile = await window.MemberData.loadProfile(user);
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
          <button id=\"export-json\" class=\"btn-soft btn-purple\">匯出 JSON</button>
          <button id=\"export-png\" class=\"btn-soft btn-orange\">匯出圖片</button>
        </div>
      `;
      const c = card('資料總覽', body, actions);
      c.id = 'profile-dashboard';
      return c;
    }

    const dash = dashboardCard(profile);
    sections.appendChild(dash);

    // Basic
    const basicBody = `
      ${textInput('pf-name','姓名', profile.basic?.name)}
      ${textInput('pf-email','Email', profile.basic?.email,'email')}
      ${textInput('pf-phone','電話', profile.basic?.phone,'tel')}
      ${textInput('pf-birthday','生日', profile.basic?.birthday,'date')}
      ${textInput('pf-address','地址', profile.basic?.address)}
    `;
    const basicActions = `<button id=\"save-basic\" class=\"btn-soft btn-green\">儲存</button>`;
    const basicCard = card('基本資料', basicBody, basicActions);
    sections.appendChild(basicCard);

    // Self Evaluation
    const evalBody = `
      ${textArea('pf-interests','興趣/志向', profile.selfEvaluation?.interests, 3)}
      ${textArea('pf-strengths','優勢/擅長', profile.selfEvaluation?.strengths, 3)}
      ${textArea('pf-goals','短中期目標', profile.selfEvaluation?.goals, 3)}
    `;
    const evalActions = `<button id=\"save-eval\" class=\"btn-soft btn-green\">儲存</button>`;
    const evalCard = card('自立評估', evalBody, evalActions);
    sections.appendChild(evalCard);

    // Activities
    const actBody = `
      ${listItems(profile.activities)}
      <div class="mt-4 grid md:grid-cols-3 gap-2">
        <input id="act-title" type="text" placeholder="活動名稱" class="rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        <input id="act-date" type="date" class="rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        <button id=\"add-activity\" class=\"btn-soft btn-green\">新增</button>
      </div>
    `;
    const actCard = card('活動記錄', actBody);
    sections.appendChild(actCard);

    // Learning Records
    const learnBody = `
      ${listItems(profile.learningRecords)}
      <div class="mt-4 grid md:grid-cols-3 gap-2">
        <input id="lr-title" type="text" placeholder="學習主題" class="rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        <input id="lr-date" type="date" class="rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        <button id=\"add-learning\" class=\"btn-soft btn-green\">新增</button>
      </div>
    `;
    const learnCard = card('學習歷程', learnBody);
    sections.appendChild(learnCard);

    // Change Password card
    const pwdBody = `
      <div class="grid md:grid-cols-3 gap-3">
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
    const pwdActions = `<button id="btn-change-pwd" class="btn-soft btn-purple">修改密碼</button>`;
    const pwdCard = card('修改密碼', pwdBody, pwdActions);
    sections.appendChild(pwdCard);

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

    qs('#save-basic')?.addEventListener('click', async ()=>{
      profile.basic = {
        name: qs('#pf-name')?.value || '',
        email: qs('#pf-email')?.value || '',
        phone: qs('#pf-phone')?.value || '',
        birthday: qs('#pf-birthday')?.value || '',
        address: qs('#pf-address')?.value || ''
      };
      const res = await window.MemberData.saveProfile(user, profile);
      toast(res.ok? '基本資料已儲存':'儲存失敗', !!res.ok);
    });

    qs('#save-eval')?.addEventListener('click', async ()=>{
      profile.selfEvaluation = {
        interests: qs('#pf-interests')?.value || '',
        strengths: qs('#pf-strengths')?.value || '',
        goals: qs('#pf-goals')?.value || ''
      };
      const res = await window.MemberData.saveProfile(user, profile);
      toast(res.ok? '自立評估已儲存':'儲存失敗', !!res.ok);
    });

    qs('#add-activity')?.addEventListener('click', async ()=>{
      const title = qs('#act-title')?.value?.trim();
      const date = qs('#act-date')?.value;
      if (!title) { toast('請輸入活動名稱', false); return; }
      profile.activities = profile.activities || [];
      profile.activities.push({ title, date });
      const res = await window.MemberData.saveProfile(user, profile);
      toast(res.ok? '已新增活動':'新增失敗', !!res.ok);
      render();
    });

    qs('#add-learning')?.addEventListener('click', async ()=>{
      const title = qs('#lr-title')?.value?.trim();
      const date = qs('#lr-date')?.value;
      if (!title) { toast('請輸入學習主題', false); return; }
      profile.learningRecords = profile.learningRecords || [];
      profile.learningRecords.push({ title, date });
      const res = await window.MemberData.saveProfile(user, profile);
      toast(res.ok? '已新增學習紀錄':'新增失敗', !!res.ok);
      render();
    });

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
      const dataStr = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profile, null, 2));
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
