// UI logic for member login page: password visibility, strength meter, and submit
(function () {
  function qs(s, r = document) { return r.querySelector(s); }
  function setBtnLoading(btn, loading = true) {
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
    bar.classList.remove('bg-red-500', 'bg-orange-500', 'bg-yellow-400', 'bg-green-500');
    const colorClass = str.color === 'red' ? 'bg-red-500' : str.color === 'orange' ? 'bg-orange-500' : str.color === 'yellow' ? 'bg-[var(--primary)]' : 'bg-[var(--primary)]';
    bar.classList.add(colorClass);

    const rules = str.rules || {};
    function setDot(id, ok) {
      const li = qs('#' + prefix + id);
      if (!li) return;
      const dot = li.querySelector('.rule-dot');
      if (!dot) return;
      dot.classList.toggle('bg-[var(--primary)]', !!ok);
      dot.classList.toggle('bg-gray-300', !ok);
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

    // 若已登入，依角色自動導向不同介面
    try {
      const logged = window.MemberData && window.MemberData.isLoggedIn && window.MemberData.isLoggedIn();
      if (logged) {
        const role = (window.Auth && window.Auth.getRole && window.Auth.getRole()) || 'member';
        window.location.href = role === 'admin' ? './member-admin.html' : './member-profile.html';
        return;
      }
    } catch (e) { }

    // Apply Font Awesome icons to buttons/links for consistency
    try {
      const icon = (html) => html; // helper placeholder
      const loginSubmit = qs('#login-submit');
      const regSubmit = qs('#register-submit');
      const switchToReg = qs('#switch-to-register');
      const switchToLogin = qs('#switch-to-login');
      const forgotCancel = qs('#forgot-cancel');
      const forgotSubmit = qs('#forgot-submit');
      const avCancelBtn = qs('#admin-verify-cancel');
      const avOkBtn = qs('#admin-verify-ok');
      if (loginSubmit) loginSubmit.innerHTML = icon('<i class="fas fa-sign-in-alt mr-2"></i> 登入');
      if (regSubmit) regSubmit.innerHTML = icon('<i class="fas fa-user-plus mr-2"></i> 註冊');
      if (switchToReg) switchToReg.innerHTML = icon('<i class="fas fa-user-plus mr-1"></i> 沒有帳號？註冊');
      if (switchToLogin) switchToLogin.innerHTML = icon('<i class="fas fa-sign-in-alt mr-1"></i> 已有帳號？登入');
      if (forgotCancel) forgotCancel.innerHTML = icon('<i class="fas fa-times mr-2"></i> 取消');
      if (forgotSubmit) forgotSubmit.innerHTML = icon('<i class="fas fa-paper-plane mr-2"></i> 送出');
      if (avCancelBtn) avCancelBtn.innerHTML = icon('<i class="fas fa-times mr-2"></i> 取消');
      if (avOkBtn) avOkBtn.innerHTML = icon('<i class="fas fa-user-check mr-2"></i> 繼續註冊');
    } catch (e) { }

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

    // 忘記密碼（改為 Modal）
    const forgot = qs('#forgot-link');
    const modal = qs('#forgot-modal');
    const modalInput = qs('#forgot-input');
    const modalCancel = qs('#forgot-cancel');
    const modalSubmit = qs('#forgot-submit');
    const modalStatus = qs('#forgot-status');
    function openForgot() { if (!modal) return; modal.classList.remove('hidden'); setTimeout(() => modal.classList.add('open'), 0); modalInput?.focus(); }
    function closeForgot() { if (!modal) return; modal.classList.remove('open'); const hide = () => modal.classList.add('hidden'); modal.addEventListener('transitionend', function onEnd(e) { if (e.target === modal) { modal.removeEventListener('transitionend', onEnd); hide(); } }); setTimeout(hide, 220); }
    function setForgotLoading(on = true) { if (!modalSubmit) return; if (!modalSubmit.dataset.orig) modalSubmit.dataset.orig = modalSubmit.innerHTML; modalSubmit.disabled = !!on; modalSubmit.classList.toggle('opacity-50', !!on); modalSubmit.classList.toggle('cursor-not-allowed', !!on); modalStatus && (modalStatus.textContent = on ? '送出中…' : ''); if (on) { modalSubmit.innerHTML = `<svg class="animate-spin h-4 w-4 mr-2 inline-block align-[-2px]" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>` + (modalSubmit.textContent || '送出'); } else { modalSubmit.innerHTML = modalSubmit.dataset.orig; } }
    if (forgot && modal) {
      forgot.addEventListener('click', (e) => { e.preventDefault(); openForgot(); });
      modalCancel?.addEventListener('click', () => closeForgot());
      modal?.addEventListener('click', (e) => { const t = e.target; if (t && (t.id === 'forgot-modal' || t.classList.contains('overlay-bg'))) closeForgot(); });
      // 驗證 Email 格式
      function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
      }

      modalSubmit?.addEventListener('click', async () => {
        const val = (modalInput?.value || '').trim();
        if (!val) {
          modalStatus && (modalStatus.textContent = '請輸入帳號或 Email');
          modalInput?.focus();
          return;
        }
        // 如果輸入包含 @，則驗證 Email 格式
        if (val.includes('@') && !isValidEmail(val)) {
          modalStatus && (modalStatus.textContent = '請輸入有效的 Email 格式（例如：user@example.com）');
          modalInput?.focus();
          modalInput?.select();
          return;
        }
        if (!window.Auth || !window.Auth.forgot) {
          modalStatus && (modalStatus.textContent = '忘記密碼功能尚未載入');
          return;
        }
        try {
          setForgotLoading(true);
          const r = await window.Auth.forgot(val);
          const msg = (r && r.message) ? r.message : (r && r.ok ? '已發送重設指示' : '操作失敗');
          if (window.Toast && window.Toast.show) window.Toast.show(msg, r && r.ok ? 'success' : 'error', 3000);
          modalStatus && (modalStatus.textContent = msg);
          if (r && r.ok) setTimeout(() => { closeForgot(); }, 800);
        } catch (err) {
          const msg = '操作失敗：' + err.message;
          if (window.Toast && window.Toast.show) window.Toast.show(msg, 'error', 3000);
          modalStatus && (modalStatus.textContent = msg);
        } finally { setForgotLoading(false); }
      });
      // Enter: submit; Escape: close
      modalInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); modalSubmit?.click(); } });
      document.addEventListener('keydown', (e) => { if (!modal || modal.classList.contains('hidden')) return; if (e.key === 'Escape') { e.preventDefault(); closeForgot(); } });
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
      const role = (res && res.role) || (window.Auth && window.Auth.getRole && window.Auth.getRole()) || 'member';
      if (window.Toast && window.Toast.show) window.Toast.show('登入成功，前往' + (role === 'admin' ? '管理頁' : '個人頁') + '…', 'success', 1500);
      window.location.href = role === 'admin' ? './member-admin.html' : './member-profile.html';
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

    // Admin verify modal（用於註冊時選擇是否升級管理者並輸入驗證碼）
    const avModal = qs('#admin-verify-modal');
    const avToggle = qs('#admin-verify-toggle');
    const avWrap = qs('#admin-code-wrap');
    const avCode = qs('#admin-verify-code');
    const avStatus = qs('#admin-verify-status');
    const avCancel = qs('#admin-verify-cancel');
    const avOk = qs('#admin-verify-ok');
    function updateOkLabel() { if (!avOk) return; avOk.innerHTML = (avToggle && avToggle.checked) ? '<i class="fas fa-user-shield mr-2"></i> 以管理者註冊' : '<i class="fas fa-user-check mr-2"></i> 繼續註冊'; }
    function openAdminVerify() { if (!avModal) return; avStatus && (avStatus.textContent = ''); if (avToggle) { avToggle.checked = false; } if (avWrap) avWrap.classList.add('hidden'); if (avCode) avCode.value = ''; updateOkLabel(); avModal.classList.remove('hidden'); setTimeout(() => avModal.classList.add('open'), 0); }
    function closeAdminVerify() { if (!avModal) return; avModal.classList.remove('open'); const hide = () => avModal.classList.add('hidden'); avModal.addEventListener('transitionend', function onEnd(e) { if (e.target === avModal) { avModal.removeEventListener('transitionend', onEnd); hide(); } }); setTimeout(hide, 220); }
    function setAdminLoading(on = true) { if (!avOk) return; if (!avOk.dataset.orig) avOk.dataset.orig = avOk.innerHTML; avOk.disabled = !!on; avOk.classList.toggle('opacity-50', !!on); avOk.classList.toggle('cursor-not-allowed', !!on); if (on) { avOk.innerHTML = `<svg class="animate-spin h-4 w-4 mr-2 inline-block align-[-2px]" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>` + (avOk.textContent || '送出'); } else { avOk.innerHTML = avOk.dataset.orig; } }
    avToggle?.addEventListener('change', () => { if (!avWrap) return; avWrap.classList.toggle('hidden', !avToggle.checked); updateOkLabel(); if (avToggle.checked) avCode?.focus(); });

    async function proceedRegister(isAdmin) {
      ensureError('', 'register-error', '#register-form');
      const u = qs('#reg-username')?.value?.trim();
      const email = qs('#reg-email')?.value?.trim();
      const p1 = qs('#reg-password')?.value || '';
      const p2 = qs('#reg-confirm')?.value || '';
      if (!u || !email || !p1 || !p2) { ensureError('請完整填寫資料', 'register-error', '#register-form'); return; }
      if (p1 !== p2) { ensureError('兩次密碼不一致', 'register-error', '#register-form'); return; }
      if (p1.length < 8) { ensureError('密碼至少 8 碼', 'register-error', '#register-form'); return; }
      if (!window.Auth || !window.Auth.register) { ensureError('註冊功能尚未載入', 'register-error', '#register-form'); return; }
      let options = undefined;
      if (isAdmin) {
        const code = (avCode?.value || '').trim();
        if (!code) { avStatus && (avStatus.textContent = '請輸入管理者驗證碼'); avCode?.focus(); return; }
        options = { isAdmin: true, adminCode: code };
      }
      try {
        setAdminLoading(true);
        const r = await window.Auth.register(u, email, p1, options);
        if (!r || !r.ok) {
          const msg = (r && r.message) || '註冊失敗';
          ensureError(msg, 'register-error', '#register-form');
          avStatus && (avStatus.textContent = msg);
          if (window.Toast && window.Toast.show) window.Toast.show(msg, 'error', 3000);
          return;
        }
        closeAdminVerify();
        const role = (r && r.role) || (window.Auth && window.Auth.getRole && window.Auth.getRole()) || 'member';
        if (window.Toast && window.Toast.show) window.Toast.show('註冊成功，前往' + (role === 'admin' ? '管理頁' : '個人頁') + '…', 'success', 1500);
        window.location.href = role === 'admin' ? './member-admin.html' : './member-profile.html';
      } catch (err) {
        const msg = '註冊錯誤：' + err.message;
        ensureError(msg, 'register-error', '#register-form');
        avStatus && (avStatus.textContent = msg);
        if (window.Toast && window.Toast.show) window.Toast.show(msg, 'error', 3000);
      } finally {
        setAdminLoading(false);
      }
    }

    avCancel?.addEventListener('click', () => { // 僅關閉，不送出
      closeAdminVerify();
    });
    avOk?.addEventListener('click', () => {
      const wantAdmin = !!avToggle?.checked;
      proceedRegister(wantAdmin);
    });
    avModal?.addEventListener('click', (e) => { const t = e.target; if (t && (t.id === 'admin-verify-modal' || t.classList.contains('overlay-bg'))) { closeAdminVerify(); /* 不自動註冊，使用者可再按註冊 */ } });
    document.addEventListener('keydown', (e) => { if (!avModal || avModal.classList.contains('hidden')) return; if (e.key === 'Escape') { e.preventDefault(); closeAdminVerify(); } if (e.key === 'Enter') { e.preventDefault(); avOk?.click(); } });

    // Register submit（以 Modal 取代 confirm/prompt）
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
      // 開啟管理者驗證 Modal，讓使用者選擇是否為管理者並輸入驗證碼
      openAdminVerify();
    });

    // Enter 鍵保證送出（瀏覽器預設已送出，這裡確保在輸入框也觸發）
    [usr, pwd].forEach(el => { el?.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); form.requestSubmit?.(); } }); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
