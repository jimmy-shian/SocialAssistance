// UI logic for member login page: password visibility, strength meter, and submit
(function () {
  function qs(s, r=document){ return r.querySelector(s); }
  function setBtnLoading(btn, loading=true){
    if (!btn) return;
    if (!btn.dataset.orig) btn.dataset.orig = btn.innerHTML;
    btn.disabled = !!loading;
    btn.classList.toggle('opacity-50', !!loading);
    btn.classList.toggle('cursor-not-allowed', !!loading);
    if (loading) {
      btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-2 inline-block align-[-2px]" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>` + (btn.textContent || '處理中…');
    } else {
      btn.innerHTML = btn.dataset.orig;
    }
  }

  function updateStrengthUI(str, prefix = 'reg-') {
    const label = qs(`#${prefix}strength-label`);
    const score = qs(`#${prefix}strength-score`);
    const bar = qs(`#${prefix}strength-bar`);
    if (!label || !score || !bar) return;
    label.textContent = `密碼強度：${str.label}`;
    const max = str.max || 5;
    score.textContent = `${str.score}/${max}`;
    const w = Math.max(0, Math.min(str.score, max)) * (100 / max); // 0..100
    bar.style.width = w + '%';
    bar.classList.remove('bg-red-500','bg-orange-500','bg-yellow-400','bg-green-500');
    const colorClass = str.color === 'red' ? 'bg-red-500' : str.color === 'orange' ? 'bg-orange-500' : str.color === 'yellow' ? 'bg-yellow-400' : 'bg-green-500';
    bar.classList.add(colorClass);

    const rules = str.rules || {};
    function setDot(id, ok) {
      const li = qs('#' + prefix + id);
      if (!li) return;
      const dot = li.querySelector('.rule-dot');
      if (!dot) return;
      dot.classList.toggle('bg-green-500', !!ok);
      dot.classList.toggle('bg-gray-400', !ok);
    }
    setDot('rule-length8', !!rules.length8);
    setDot('rule-length12', !!rules.length12);
    setDot('rule-mixcase', !!rules.mixcase);
    setDot('rule-digit', !!rules.digit);
    setDot('rule-symbol', !!rules.symbol);
  }

  function ensureError(msg, id = 'login-error', formSel = '#login-form') {
    let el = qs('#' + id);
    if (!el) {
      const form = qs(formSel);
      if (!form) return;
      el = document.createElement('div');
      el.id = id;
      el.className = 'mb-4 p-3 rounded bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-200';
      form.insertBefore(el, form.firstChild);
    }
    el.textContent = msg || '';
    el.classList.toggle('hidden', !msg);
  }

  function bind() {
    const pwd = qs('#password');
    const usr = qs('#username');
    const toggle = qs('#toggle-password');
    const form = qs('#login-form');
    const regForm = qs('#register-form');
    const flip = qs('.auth-flip');
    const loginBtn = qs('#login-submit');
    const regBtn = qs('#register-submit');
    if (!form) return;

    if (flip && form && regForm) {
      // 先取消 register 的 hidden，量完再加回去
      const wasHidden = regForm.classList.contains('hidden');
      if (wasHidden) regForm.classList.remove('hidden');
  
      // 取註冊表單高度
      const registerHeight = regForm.offsetHeight;
      flip.style.height = registerHeight + 'px';
  
      if (wasHidden) regForm.classList.add('hidden'); // 還原
    }
    // 註冊密碼強度（取代登入的強度顯示）
    const regPwd = qs('#reg-password');
    if (regPwd) {
      const updateReg = () => {
        const str = (window.Auth && window.Auth.evaluatePasswordStrength) ? window.Auth.evaluatePasswordStrength(regPwd.value) : { score: 0, label: '-', color: 'red', max: 5, rules: {} };
        updateStrengthUI(str, 'reg-');
      };
      regPwd.addEventListener('input', updateReg);
      updateReg();
    }

    if (toggle && pwd) {
      toggle.addEventListener('click', () => {
        const showing = pwd.type === 'text';
        pwd.type = showing ? 'password' : 'text';
        const eyeOpen = qs('#eye-open');
        const eyeClosed = qs('#eye-closed');
        if (eyeOpen && eyeClosed) {
          eyeOpen.classList.toggle('hidden', showing);
          eyeClosed.classList.toggle('hidden', !showing);
        }
      });
    }

    // 忘記密碼
    const forgot = qs('#forgot-link');
    if (forgot) {
      forgot.addEventListener('click', async (e)=>{
        e.preventDefault();
        try {
          const input = prompt('請輸入帳號或 Email：');
          if (!input) return;
          if (!window.Auth || !window.Auth.forgot) { alert('忘記密碼功能尚未載入'); return; }
          const r = await window.Auth.forgot(input.trim());
          if (window.Toast && window.Toast.show) window.Toast.show(r && r.message ? r.message : '已發送重設指示（模擬）', 'info', 3000);
          else alert(r && r.message ? r.message : '已發送重設指示（模擬）');
        } catch(err){ alert('操作失敗：' + err.message); }
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      ensureError('', 'login-error', '#login-form');
      const username = usr ? usr.value.trim() : '';
      const password = pwd ? pwd.value : '';
      const Auth = window.Auth;
      if (!Auth || !Auth.login) return;
      setBtnLoading(loginBtn, true);
      const res = await Auth.login(username, password);
      if (!res.ok) {
        if (window.Toast && window.Toast.show) window.Toast.show(res.message || '登入失敗', 'error', 3000);
        ensureError(res.message || '登入失敗', 'login-error', '#login-form');
        setBtnLoading(loginBtn, false);
        return;
      }
      if (window.Toast && window.Toast.show) window.Toast.show('登入成功，前往個人頁…', 'success', 1500);
      window.location.href = './member-profile.html';
    });

    // Switch to register / login
    // 翻轉切換（登入 <-> 註冊）
    qs('#switch-to-register')?.addEventListener('click', () => {
      if (regForm) regForm.classList.remove('hidden');
      flip?.classList.add('flipped');
    });
    qs('#switch-to-login')?.addEventListener('click', () => {
      flip?.classList.remove('flipped');
      // 不再加 hidden，保留兩面以供翻轉
    });

    // Register submit
    regForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      ensureError('', 'register-error', '#register-form');
      const u = qs('#reg-username')?.value?.trim();
      const email = qs('#reg-email')?.value?.trim();
      const p1 = qs('#reg-password')?.value || '';
      const p2 = qs('#reg-confirm')?.value || '';
      if (!u || !email || !p1 || !p2) { ensureError('請完整填寫資料', 'register-error', '#register-form'); return; }
      if (p1 !== p2) { ensureError('兩次密碼不一致', 'register-error', '#register-form'); return; }
      if (p1.length < 8) { ensureError('密碼至少 8 碼', 'register-error', '#register-form'); return; }
      if (!window.Auth || !window.Auth.register) { ensureError('註冊功能尚未載入', 'register-error', '#register-form'); return; }
      setBtnLoading(regBtn, true);
      const r = await window.Auth.register(u, email, p1);
      if (!r.ok) { ensureError(r.message || '註冊失敗', 'register-error', '#register-form'); setBtnLoading(regBtn, false); if (window.Toast && window.Toast.show) window.Toast.show(r.message || '註冊失敗', 'error', 3000); return; }
      // auto login and redirect
      if (window.Toast && window.Toast.show) window.Toast.show('註冊成功，前往個人頁…', 'success', 1500);
      window.location.href = './member-profile.html';
    });

    // Enter 鍵保證送出（瀏覽器預設已送出，這裡確保在輸入框也觸發）
    [usr, pwd].forEach(el=>{ el?.addEventListener('keydown', (ev)=>{ if (ev.key === 'Enter') { ev.preventDefault(); form.requestSubmit?.(); } }); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
