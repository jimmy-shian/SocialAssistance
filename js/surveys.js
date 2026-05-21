(function () {
  'use strict';

  var qs = function (s, r) { return (r || document).querySelector(s); };
  var qsa = function (s, r) { return (r || document).querySelectorAll(s); };
  var esc = function (v) { var d = document.createElement('div'); d.textContent = v || ''; return d.innerHTML; };

  function getBaseUrl() { return (window.AppConfig && window.AppConfig.getBaseUrl) ? window.AppConfig.getBaseUrl() : ''; }
  function getToken() { return localStorage.getItem('authToken') || ''; }
  function getUserRole() { return localStorage.getItem('userRole') || 'guest'; }
  function isAdmin() { return getUserRole() === 'admin'; }
  function getSurveyEndpoints() { return (window.AppConfig && window.AppConfig.surveyEndpoints) ? window.AppConfig.surveyEndpoints : {}; }

  function setBtnLoading(btn, loading) {
    if (!btn) return;
    if (!btn.dataset.orig) btn.dataset.orig = btn.innerHTML;
    btn.disabled = !!loading;
    btn.classList.toggle('opacity-50', !!loading);
    btn.classList.toggle('cursor-not-allowed', !!loading);
    if (loading) { btn.innerHTML = '<svg class="animate-spin h-4 w-4 mr-2 inline-block" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>處理中...'; }
    else { btn.innerHTML = btn.dataset.orig; }
  }

  function toast(msg, type, dur) {
    if (window.Toast && window.Toast.show) window.Toast.show(msg, type || 'info', dur || 3000);
    else alert(msg);
  }

  function loadingHTML(msg) {
    return '<div class="text-center py-8"><div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div><p class="text-gray-500">' + esc(msg || '載入中...') + '</p></div>';
  }

  function requireAuth() {
    if (!getToken()) { toast('請先登入才能使用問卷系統', 'warning'); window.location.href = './member.html'; return false; }
    return true;
  }

  // ==================== API 呼叫 ====================

  async function apiGetSurveyList() {
    var ep = getSurveyEndpoints();
    try {
      var res = await fetch(getBaseUrl() + (ep.surveyList || '') + '?token=' + encodeURIComponent(getToken()));
      var data = await res.json();
      return data.ok ? (data.surveys || []) : [];
    } catch (e) { console.error(e); toast('載入問卷失敗', 'error'); return []; }
  }

  async function apiGetSurveyDetail(id) {
    var ep = getSurveyEndpoints();
    try {
      var res = await fetch(getBaseUrl() + (ep.surveyDetail || '') + '?token=' + encodeURIComponent(getToken()) + '&surveyId=' + encodeURIComponent(id));
      var data = await res.json();
      return data.ok ? data.survey : null;
    } catch (e) { console.error(e); toast('載入問卷失敗', 'error'); return null; }
  }

  async function apiCreateSurvey(surveyData) {
    var ep = getSurveyEndpoints();
    try {
      var body = Object.assign({ token: getToken() }, surveyData);
      var res = await fetch(getBaseUrl() + (ep.createSurvey || ''), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return await res.json();
    } catch (e) { console.error(e); return { ok: false, message: e.message }; }
  }

  async function apiSubmitResponse(surveyId, answers) {
    var ep = getSurveyEndpoints();
    try {
      var res = await fetch(getBaseUrl() + (ep.submitResponse || ''), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: getToken(), surveyId: surveyId, answers: answers }) });
      return await res.json();
    } catch (e) { console.error(e); return { ok: false, message: e.message }; }
  }

  // ==================== 載入問卷列表 ====================

  async function loadSurveys() {
    var container = qs('#surveys-list');
    if (!container) return;
    container.innerHTML = loadingHTML('載入問卷清單...');
    try {
      if (!requireAuth()) return;
      var forms = await apiGetSurveyList();
      if (!forms.length) {
        container.innerHTML = '<div class="text-center py-12"><svg class="w-16 h-16 text-gray-400 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l2 2 4-4"/><path d="M20 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8l6 6Z"/></svg><p class="font-semibold text-gray-800">目前沒有可填寫的問卷</p><p class="text-sm text-gray-500 mt-1">有新問卷時會自動出現在這裡</p></div>';
        return;
      }
      container.innerHTML = forms.map(function (f) {
        var st = f.status === 'active' ? '已發佈' : f.status === 'draft' ? '草稿' : '已完成';
        var dt = f.createdAt ? new Date(f.createdAt).toLocaleDateString('zh-TW') : '';
        var ab = isAdmin() ? '<button class="btn-soft btn-purple text-sm" data-view-responses="' + esc(f.id) + '">查看回覆</button>' : '';
        return '<article class="bg-white rounded-lg shadow-md p-5 mb-4 flex items-center justify-between"><div class="min-w-0 flex-1"><div class="text-xs text-gray-500 mb-1">' + esc(st) + ' · ' + dt + '</div><h3 class="text-lg font-semibold text-gray-800">' + esc(f.title || '未命名問卷') + '</h3><p class="text-sm text-gray-600 mt-1">' + esc(f.description || '此問卷尚無描述') + '</p></div><div class="flex gap-2 shrink-0 ml-4">' + ab + '<button class="btn-soft btn-green text-sm" data-open-survey="' + esc(f.id) + '">填寫</button></div></article>';
      }).join('');
    } catch (e) { container.innerHTML = '<div class="text-center text-rose-600 py-12"><p>載入失敗：' + esc(e.message) + '</p><button class="btn-soft btn-purple mt-4" data-reload-surveys>重新載入</button></div>'; }
  }

  // ==================== 開啟問卷填寫 Modal ====================

  async function openSurvey(surveyId) {
    if (!requireAuth()) return;
    var modal = qs('#survey-modal'), titleEl = qs('#survey-title'), contentEl = qs('#survey-content');
    if (!modal || !titleEl || !contentEl) return;
    try {
      contentEl.innerHTML = loadingHTML('載入問卷內容...');
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      var form = await apiGetSurveyDetail(surveyId);
      if (!form) { closeSurveyModal(); return; }
      titleEl.textContent = form.title || '填寫問卷';
      contentEl.innerHTML = buildFormHTML(form);
      var sf = qs('#survey-form');
      if (sf) sf.addEventListener('submit', async function (ev) { ev.preventDefault(); await submitSurvey(form, sf); });
      initRatingStars();
    } catch (e) { toast('載入問卷失敗', 'error'); closeSurveyModal(); }
  }

  function buildFormHTML(form) {
    var qs2 = Array.isArray(form.questions) ? form.questions : [];
    var html = qs2.map(function (q, i) { return buildQuestionHTML(q, i); }).join('');
    return '<form id="survey-form" class="space-y-6" data-survey-id="' + esc(form.id) + '">' + (html || '<div class="text-center py-8">此問卷尚未建立題目</div>') + '<div class="flex justify-end gap-3 pt-4 border-t border-gray-200"><button type="button" class="btn-soft btn-purple" data-close-survey>取消</button><button type="submit" class="btn-soft btn-green" id="submit-survey">送出問卷</button></div></form>';
  }

  function normOpts(o) { if (Array.isArray(o)) return o; try { var p = JSON.parse(o || '[]'); return Array.isArray(p) ? p : []; } catch (e) { return []; } }

  function buildQuestionHTML(q, idx) {
    var req = q.is_required ? '<span class="text-red-500">*</span>' : '';
    var fn = 'q_' + q.id;
    var n = (idx + 1) + '. ';
    var lbl = '<label class="block font-medium text-gray-800 mb-2">' + n + esc(q.question_text) + req + '</label>';
    var opts = normOpts(q.options);

    if (q.question_type === 'text') return '<div class="pb-4 border-b border-gray-100" data-question-id="' + esc(q.id) + '">' + lbl + '<input type="text" name="' + fn + '" ' + (q.is_required ? 'required' : '') + ' class="w-full border rounded-md px-3 py-2" placeholder="請輸入文字"></div>';
    if (q.question_type === 'textarea') return '<div class="pb-4 border-b border-gray-100" data-question-id="' + esc(q.id) + '">' + lbl + '<textarea name="' + fn + '" rows="3" ' + (q.is_required ? 'required' : '') + ' class="w-full border rounded-md px-3 py-2" placeholder="請輸入文字"></textarea></div>';
    if (q.question_type === 'number') return '<div class="pb-4 border-b border-gray-100" data-question-id="' + esc(q.id) + '">' + lbl + '<input type="number" name="' + fn + '" ' + (q.is_required ? 'required' : '') + ' class="w-full border rounded-md px-3 py-2" placeholder="請輸入數字"></div>';

    if (q.question_type === 'radio') return '<fieldset class="pb-4 border-b border-gray-100" data-question-id="' + esc(q.id) + '"><legend class="font-medium text-gray-800 mb-2">' + n + esc(q.question_text) + req + '</legend><div class="space-y-2 ml-2">' + opts.map(function (o) { return '<label class="flex items-center"><input type="radio" name="' + fn + '" value="' + esc(o) + '" class="mr-3"><span>' + esc(o) + '</span></label>'; }).join('') + '</div></fieldset>';

    if (q.question_type === 'checkbox') return '<fieldset class="pb-4 border-b border-gray-100" data-question-id="' + esc(q.id) + '"><legend class="font-medium text-gray-800 mb-2">' + n + esc(q.question_text) + req + '</legend><div class="space-y-2 ml-2">' + opts.map(function (o) { return '<label class="flex items-center"><input type="checkbox" name="' + fn + '" value="' + esc(o) + '" class="mr-3 rounded"><span>' + esc(o) + '</span></label>'; }).join('') + '</div></fieldset>';

    if (q.question_type === 'dropdown') return '<div class="pb-4 border-b border-gray-100" data-question-id="' + esc(q.id) + '">' + lbl + '<select name="' + fn + '" ' + (q.is_required ? 'required' : '') + ' class="w-full border rounded-md px-3 py-2"><option value="" disabled selected>請選擇</option>' + opts.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('') + '</select></div>';

    if (q.question_type === 'scale') return '<div class="pb-4 border-b border-gray-100" data-question-id="' + esc(q.id) + '">' + lbl + '<div class="flex gap-1" data-scale="' + fn + '">' + [1,2,3,4,5,6,7,8,9,10].map(function (v) { return '<button type="button" class="w-8 h-8 rounded border text-sm hover:bg-blue-100" data-scale-value="' + v + '">' + v + '</button>'; }).join('') + '<input type="hidden" name="' + fn + '" value="" ' + (q.is_required ? 'required' : '') + '></div></div>';

    if (q.question_type === 'rating') return '<div class="pb-4 border-b border-gray-100" data-question-id="' + esc(q.id) + '"><div class="font-medium text-gray-800 mb-2">' + n + esc(q.question_text) + req + '</div><div class="flex gap-1" data-rating="' + fn + '">' + [1,2,3,4,5].map(function (v) { return '<button type="button" class="rating-star text-gray-300 hover:text-yellow-400" data-value="' + v + '"><svg class="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 2.7 5.47 6.04.88-4.37 4.26 1.03 6.01L12 16.78l-5.4 2.84 1.03-6.01-4.37-4.26 6.04-.88Z"/></svg></button>'; }).join('') + '<input type="hidden" name="' + fn + '" value="" ' + (q.is_required ? 'required' : '') + '></div></div>';

    return '<div class="text-sm text-gray-500 pb-4">不支援的題型：' + esc(q.question_type) + '</div>';
  }

  // ==================== 提交問卷 ====================

  async function submitSurvey(form, formEl) {
    var btn = qs('#submit-survey');
    try {
      setBtnLoading(btn, true);
      var resp = {}, questions = Array.isArray(form.questions) ? form.questions : [];
      var fd = new FormData(formEl);
      for (var i = 0; i < questions.length; i++) {
        var q = questions[i], fn = 'q_' + q.id, ans;
        if (q.question_type === 'checkbox') { ans = fd.getAll(fn); ans = ans.length ? ans : null; }
        else { ans = fd.get(fn); }
        if ((ans === null || ans === '') && q.is_required) { toast('請填寫所有必答問題', 'error'); return; }
        if (ans !== null && ans !== '') resp[q.id] = ans;
      }
      var result = await apiSubmitResponse(form.id, resp);
      if (result && result.ok) { toast('問卷已成功送出，感謝您的填寫', 'success', 4000); setTimeout(closeSurveyModal, 900); }
      else { toast('送出失敗：' + ((result && result.message) || '請稍後再試'), 'error'); }
    } catch (e) { toast('送出失敗：' + (e.message || '未知錯誤'), 'error'); }
    finally { setBtnLoading(btn, false); }
  }

  // ==================== 建立問卷（管理員）====================

  async function createSurvey() {
    var ti = qs('#new-survey-title'), di = qs('#new-survey-description'), qc = qs('#new-survey-questions');
    if (!ti || !qc) return;
    var title = ti.value.trim(), desc = di ? di.value.trim() : '';
    if (!title) { toast('請輸入問卷標題', 'error'); return; }

    var items = qsa('.survey-question-item', qc), questions = [];
    items.forEach(function (item) {
      var txt = qs('.question-text', item), sel = qs('.question-type', item), chk = qs('.question-required', item), opt = qs('.question-options', item);
      if (!txt || !sel) return;
      var t = txt.value.trim();
      if (!t) return;
      var q = { id: 'q_' + Date.now() + '_' + questions.length, question_text: t, question_type: sel.value, is_required: chk ? chk.checked : false, options: [] };
      if (['radio', 'checkbox', 'dropdown'].indexOf(q.question_type) !== -1 && opt && opt.value.trim()) {
        q.options = opt.value.trim().split(',').map(function (o) { return o.trim(); }).filter(Boolean);
      }
      questions.push(q);
    });

    if (!questions.length) { toast('請至少新增一個問題', 'error'); return; }
    var result = await apiCreateSurvey({ title: title, description: desc, questions: questions });
    if (result && result.ok) { toast('問卷建立成功', 'success'); closeCreateSurveyModal(); loadSurveys(); }
    else { toast('建立失敗：' + ((result && result.message) || '請稍後再試'), 'error'); }
  }

  function addQuestionToForm() {
    var c = qs('#new-survey-questions');
    if (!c) return;
    var idx = c.children.length;
    var types = (window.AppConfig && window.AppConfig.questionTypes) ? window.AppConfig.questionTypes : {};
    var opts = Object.keys(types).map(function (k) { return '<option value="' + k + '">' + esc(types[k].label) + '</option>'; }).join('');
    var div = document.createElement('div');
    div.className = 'survey-question-item border rounded-md p-4 mb-3 bg-gray-50';
    div.innerHTML = '<div class="flex justify-between mb-2"><span class="text-sm font-medium text-gray-700">問題 ' + (idx + 1) + '</span><button type="button" class="text-red-500 text-sm" data-remove-question>移除</button></div><input type="text" class="question-text w-full border rounded-md px-3 py-2 mb-2" placeholder="輸入問題文字"><div class="flex gap-2 mb-2"><select class="question-type border rounded-md px-3 py-2">' + opts + '</select><label class="flex items-center text-sm"><input type="checkbox" class="question-required mr-1">必填</label></div><input type="text" class="question-options w-full border rounded-md px-3 py-2" placeholder="選項（逗號分隔，僅選擇題適用）">';
    c.appendChild(div);
  }

  // ==================== Modal 控制 ====================

  function openCreateSurveyModal() { var m = qs('#create-survey-modal'); if (m) { m.classList.remove('hidden'); document.body.style.overflow = 'hidden'; } }
  function closeCreateSurveyModal() { var m = qs('#create-survey-modal'); if (m) { m.classList.add('hidden'); document.body.style.overflow = ''; } }
  function closeSurveyModal() { var m = qs('#survey-modal'); if (m) { m.classList.add('hidden'); document.body.style.overflow = ''; } var c = qs('#survey-content'), t = qs('#survey-title'); if (c) c.innerHTML = ''; if (t) t.textContent = ''; }

  // ==================== 評分互動 ====================

  function initRatingStars() {
    qsa('[data-rating]').forEach(function (g) {
      var stars = Array.from(g.querySelectorAll('.rating-star')), inp = g.querySelector('input[type="hidden"]');
      var paint = function (v) { stars.forEach(function (s) { var a = Number(s.dataset.value) <= v; s.classList.toggle('text-yellow-400', a); s.classList.toggle('text-gray-300', !a); }); };
      stars.forEach(function (s) {
        var v = Number(s.dataset.value);
        s.addEventListener('click', function () { if (inp) inp.value = String(v); paint(v); });
        s.addEventListener('mouseenter', function () { paint(v); });
      });
      g.addEventListener('mouseleave', function () { paint(inp ? Number(inp.value || 0) : 0); });
    });
    qsa('[data-scale]').forEach(function (g) {
      var btns = Array.from(g.querySelectorAll('[data-scale-value]')), inp = g.querySelector('input[type="hidden"]');
      var paint = function (v) { btns.forEach(function (b) { var bv = Number(b.dataset.scaleValue); b.classList.toggle('bg-blue-500', bv <= v); b.classList.toggle('text-white', bv <= v); }); };
      btns.forEach(function (b) { b.addEventListener('click', function () { var v = Number(b.dataset.scaleValue); if (inp) inp.value = String(v); paint(v); }); });
    });
  }

  // ==================== 事件綁定 ====================

  function bind() {
    document.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-open-survey]'); if (t) { openSurvey(t.dataset.openSurvey); return; }
      if (ev.target.closest('[data-reload-surveys]')) { loadSurveys(); return; }
      if (ev.target.closest('[data-close-survey]')) { closeSurveyModal(); return; }
      if (ev.target.closest('[data-create-survey]')) { openCreateSurveyModal(); return; }
      if (ev.target.closest('[data-close-create-survey]')) { closeCreateSurveyModal(); return; }
      if (ev.target.closest('[data-submit-create-survey]')) { createSurvey(); return; }
      if (ev.target.closest('[data-add-question]')) { addQuestionToForm(); return; }
      var rb = ev.target.closest('[data-remove-question]'); if (rb) { var qi = rb.closest('.survey-question-item'); if (qi) qi.remove(); return; }
    });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { closeSurveyModal(); closeCreateSurveyModal(); } });
  }

  // ==================== 初始化 ====================

  async function init() {
    if (isAdmin()) { var ab = qs('#admin-survey-bar'); if (ab) ab.classList.remove('hidden'); }
    bind();
    await loadSurveys();
  }

  window.openSurvey = openSurvey;
  window.closeSurveyModal = closeSurveyModal;
  window.loadSurveys = loadSurveys;
  window.createSurvey = createSurvey;

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init, { once: true }); }
  else { init(); }
})();