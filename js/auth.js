// Authentication helpers for Wix Backend
(function () {
  const AppConfig = window.AppConfig || { API_BASE: '', endpoints: {} };

  function evaluatePasswordStrength(pwd) {
    const max = 5;
    if (!pwd) return { score: 0, label: '太短', color: 'red', max, rules: { length8: false, length12: false, mixcase: false, digit: false, symbol: false } };
    const length8 = pwd.length >= 8;
    const length12 = pwd.length >= 12;
    const mixcase = /[a-z]/.test(pwd) && /[A-Z]/.test(pwd);
    const digit = /\d/.test(pwd);
    const symbol = /[^\w\s]/.test(pwd);
    let score = 0;
    if (length8) score++;
    if (mixcase) score++;
    if (digit) score++;
    if (symbol) score++;
    if (length12) score++;
    let label = '太短'; let color = 'red';
    switch (score) {
      case 0: label = '太短'; color = 'red'; break;
      case 1: label = '很弱'; color = 'red'; break;
      case 2: label = '普通'; color = 'orange'; break;
      case 3: label = '良好'; color = 'yellow'; break;
      case 4: label = '強'; color = 'green'; break;
      case 5: default: label = '極強'; color = 'green'; break;
    }
    return { score, label, color, max, rules: { length8, length12, mixcase, digit, symbol } };
  }

  function getApiUrl(endpointKey) {
    const base = (AppConfig && AppConfig.API_BASE) || '';
    if (!base) return '';
    // 如果 endpointKey 本身已包含完整 URL 或以 / 開頭，則需特殊處理(這裡假設都是簡單字串)
    const ep = (AppConfig.endpoints && AppConfig.endpoints[endpointKey]) || endpointKey;
    // 確保 base 結尾無斜線，ep 開頭無斜線 (或反之)
    return base.replace(/\/$/, '') + '/' + ep.replace(/^\//, '');
  }

  async function register(username, email, password, options) {
    if (!username || !email || !password) return { ok: false, message: '請完整填寫資料' };
    const url = getApiUrl('memberRegister');

    if (url) {
      try {
        const payload = { username, email, password };
        if (options && (options.isAdmin || options.adminCode)) {
          if (typeof options.isAdmin !== 'undefined') payload.isAdmin = !!options.isAdmin;
          if (options.adminCode) payload.adminCode = String(options.adminCode);
        }
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!resp.ok) {
          // 嘗試讀取錯誤訊息
          let errMsg = '註冊失敗';
          try { const errData = await resp.json(); errMsg = errData.message || errMsg; } catch (e) { }
          return { ok: false, message: errMsg };
        }
        const data = await resp.json();
        if (!data || !data.ok) return { ok: false, message: data && data.message || '註冊失敗' };
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', username);
          localStorage.setItem('auth_role', data.role || 'member');
        }
        return { ok: true, role: data.role || 'member' };
      } catch (e) {
        return { ok: false, message: '註冊錯誤：' + e.message };
      }
    }
    // Demo local registration
    const key = 'registered_users';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    if (list.some(u => u.username === username)) return { ok: false, message: '此帳號已被註冊' };
    list.push({ username, email });
    localStorage.setItem(key, JSON.stringify(list));
    localStorage.setItem('auth_token', 'demo-token');
    localStorage.setItem('auth_user', username);
    localStorage.setItem('auth_role', (options && options.isAdmin) ? 'admin' : 'member');
    return { ok: true, role: localStorage.getItem('auth_role') || 'member' };
  }

  async function login(username, password) {
    if (!username || !password) return { ok: false, message: '請輸入帳號與密碼' };
    const url = getApiUrl('memberLogin');

    if (url) {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        let data = null;
        try { data = await resp.json(); } catch { }

        if (!resp.ok) {
          const msg = (data && (data.message || data.error)) || '帳號或密碼錯誤';
          return { ok: false, message: msg };
        }
        if (data && data.ok === false) {
          const msg = data.message || '帳號或密碼錯誤';
          return { ok: false, message: msg };
        }
        if (!data || !data.token) {
          const msg = (data && (data.message || data.error)) || '帳號或密碼錯誤';
          return { ok: false, message: msg };
        }
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', username);
        if (data.role) localStorage.setItem('auth_role', data.role); else localStorage.setItem('auth_role', localStorage.getItem('auth_role') || 'member');
        return { ok: true, token: data.token, role: data.role || localStorage.getItem('auth_role') || 'member' };
      } catch (e) {
        return { ok: false, message: '登入錯誤：' + e.message };
      }
    }
    // Demo mode
    if (password.length >= 6) {
      const token = 'demo-token';
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', username);
      localStorage.setItem('auth_role', 'member');
      return { ok: true, token, role: 'member' };
    }
    return { ok: false, message: '密碼長度不足' };
  }

  function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_role');
  }

  async function forgot(usernameOrEmail) {
    const url = getApiUrl('memberForgot');
    if (!url) return { ok: false, message: '未設定後端' };
    try {
      const payload = {};
      if (usernameOrEmail.includes('@')) payload.email = usernameOrEmail; else payload.username = usernameOrEmail;
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await resp.json();
      return data;
    } catch (e) { return { ok: false, message: '忘記密碼錯誤：' + e.message }; }
  }

  async function changePassword(currentPassword, newPassword) {
    const url = getApiUrl('memberChangePassword');
    if (!url) return { ok: false, message: '未設定後端' };
    try {
      const token = localStorage.getItem('auth_token') || '';
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, current: currentPassword, new: newPassword }) });
      const data = await resp.json();
      return data || { ok: false };
    } catch (e) { return { ok: false, message: '修改密碼錯誤：' + e.message }; }
  }

  function getRole() { return localStorage.getItem('auth_role') || 'member'; }
  function isAdmin() { return getRole() === 'admin'; }

  window.Auth = { evaluatePasswordStrength, login, register, logout, forgot, changePassword, getRole, isAdmin };
})();
