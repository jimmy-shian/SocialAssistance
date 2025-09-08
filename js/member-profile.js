// Renders and manages the Member Profile page
(function () {
  function qs(s, r=document) { return r.querySelector(s); }

  const SURFACES = ['surface-1','surface-2','surface-3'];
  let surfaceIndex = 0;
  function nextSurface(){ const s = SURFACES[surfaceIndex % SURFACES.length]; surfaceIndex++; return s; }

  function card(title, bodyHTML, actionsHTML = '') {
    const wrap = document.createElement('section');
    wrap.className = `${nextSurface()} rounded-lg shadow p-6`;
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

    const profile = await window.MemberData.loadProfile(user);
    sections.innerHTML = '';

    // Basic
    const basicBody = `
      ${textInput('pf-name','姓名', profile.basic?.name)}
      ${textInput('pf-email','Email', profile.basic?.email,'email')}
      ${textInput('pf-phone','電話', profile.basic?.phone,'tel')}
      ${textInput('pf-birthday','生日', profile.basic?.birthday,'date')}
      ${textInput('pf-address','地址', profile.basic?.address)}
    `;
    const basicActions = `<button id="save-basic" class="px-3 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white">儲存</button>`;
    const basicCard = card('基本資料', basicBody, basicActions);
    sections.appendChild(basicCard);

    // Self Evaluation
    const evalBody = `
      ${textArea('pf-interests','興趣/志向', profile.selfEvaluation?.interests, 3)}
      ${textArea('pf-strengths','優勢/擅長', profile.selfEvaluation?.strengths, 3)}
      ${textArea('pf-goals','短中期目標', profile.selfEvaluation?.goals, 3)}
    `;
    const evalActions = `<button id="save-eval" class="px-3 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white">儲存</button>`;
    const evalCard = card('自立評估', evalBody, evalActions);
    sections.appendChild(evalCard);

    // Activities
    const actBody = `
      ${listItems(profile.activities)}
      <div class="mt-4 grid md:grid-cols-3 gap-2">
        <input id="act-title" type="text" placeholder="活動名稱" class="rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        <input id="act-date" type="date" class="rounded border px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
        <button id="add-activity" class="rounded bg-green-500 hover:bg-green-600 text-white px-3 py-2">新增</button>
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
        <button id="add-learning" class="rounded bg-green-500 hover:bg-green-600 text-white px-3 py-2">新增</button>
      </div>
    `;
    const learnCard = card('學習歷程', learnBody);
    sections.appendChild(learnCard);

    // Bind actions
    function toast(msg, ok=true) {
      const t = document.createElement('div');
      t.className = `fixed bottom-6 right-6 px-4 py-2 rounded shadow text-white ${ok?'bg-green-600':'bg-red-600'}`;
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(()=>{ t.remove(); }, 1600);
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
  }

  function init() {
    if (!window.MemberData || !window.MemberData.isLoggedIn || !window.MemberData.isLoggedIn()) {
      window.location.href = './member.html';
      return;
    }
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
