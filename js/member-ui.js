// UI logic for member login page: password visibility, strength meter, and submit
(function () {
  function qs(s, r=document){ return r.querySelector(s); }

  function updateStrengthUI(str) {
    const label = qs('#pwd-strength-label');
    const score = qs('#pwd-strength-score');
    const bar = qs('#pwd-strength-bar');
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
      const li = qs('#' + id);
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

  function ensureError(msg) {
    let el = qs('#login-error');
    if (!el) {
      const form = qs('#login-form');
      if (!form) return;
      el = document.createElement('div');
      el.id = 'login-error';
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
    if (!form) return;

    if (pwd) {
      const update = () => {
        const str = (window.Auth && window.Auth.evaluatePasswordStrength) ? window.Auth.evaluatePasswordStrength(pwd.value) : { score: 0, label: '-', color: 'red', max: 5, rules: {} };
        updateStrengthUI(str);
      };
      pwd.addEventListener('input', update);
      // initial
      update();
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

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      ensureError('');
      const username = usr ? usr.value.trim() : '';
      const password = pwd ? pwd.value : '';
      const Auth = window.Auth;
      if (!Auth || !Auth.login) return;
      const res = await Auth.login(username, password);
      if (!res.ok) {
        ensureError(res.message || '登入失敗');
        return;
      }
      window.location.href = './member-profile.html';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
