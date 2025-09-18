// Authentication helpers (ready for future GAS backend)
(function () {
  const AppConfig = window.AppConfig || { GAS_BASE_URL: '', endpoints: { memberLogin: '/memberLogin', memberRegister: '/memberRegister', memberForgot: '/memberForgot', profileRead: '/profileRead', profileUpdate: '/profileUpdate' } };

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
      default: label = '極強'; color = 'green'; break;
    }
    return { score, label, color, max, rules: { length8, length12, mixcase, digit, symbol } };
  }

  async function register(username, email, password, options) {
    if (!username || !email || !password) return { ok: false, message: '請完整填寫資料' };
    const base = (AppConfig && AppConfig.GAS_BASE_URL) || '';
    if (base) {
      try {
        const ep = (AppConfig.endpoints && AppConfig.endpoints.memberRegister) || '/memberRegister';
        const payload = { username, email, password };
        if (options && (options.isAdmin || options.adminCode)) {
          if (typeof options.isAdmin !== 'undefined') payload.isAdmin = !!options.isAdmin;
          if (options.adminCode) payload.adminCode = String(options.adminCode);
        }
        const resp = await fetch(base + ep, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) });
        if (!resp.ok) return { ok: false, message: '註冊失敗' };
        const data = await resp.json();
        if (!data || !data.ok) return { ok: false, message: data && data.message || '註冊失敗' };
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', username);
          localStorage.setItem('auth_role', data.role || 'member');
        }
        return { ok: true, role: data.role || 'member' };
      } catch(e) {
        return { ok:false, message: '註冊錯誤：' + e.message };
      }
    }
    // Demo local registration: ensure unique username in localStorage
    const key = 'registered_users';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    if (list.some(u => u.username === username)) return { ok:false, message: '此帳號已被註冊' };
    list.push({ username, email });
    localStorage.setItem(key, JSON.stringify(list));
    localStorage.setItem('auth_token', 'demo-token');
    localStorage.setItem('auth_user', username);
    localStorage.setItem('auth_role', (options && options.isAdmin) ? 'admin' : 'member');
    return { ok:true, role: localStorage.getItem('auth_role') || 'member' };
  }

  async function login(username, password) {
    if (!username || !password) return { ok: false, message: '請輸入帳號與密碼' };
    const base = (AppConfig && AppConfig.GAS_BASE_URL) || '';
    if (base) {
      try {
        const ep = (AppConfig.endpoints && AppConfig.endpoints.memberLogin) || '/memberLogin';
        const resp = await fetch(base + ep, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ username, password })
        });
        if (!resp.ok) return { ok: false, message: '登入失敗，請確認帳密' };
        const data = await resp.json();
        if (!data || !data.token) return { ok: false, message: '登入失敗：缺少 token' };
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', username);
        if (data.role) localStorage.setItem('auth_role', data.role); else localStorage.setItem('auth_role', localStorage.getItem('auth_role') || 'member');
        return { ok: true, token: data.token, role: data.role || localStorage.getItem('auth_role') || 'member' };
      } catch (e) {
        return { ok: false, message: '登入錯誤：' + e.message };
      }
    }
    // Demo mode (no backend): accept demo users
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

  async function forgot(usernameOrEmail){
    const base = (AppConfig && AppConfig.GAS_BASE_URL) || '';
    if (!base) return { ok:false, message: '未設定後端' };
    try {
      const ep = (AppConfig.endpoints && AppConfig.endpoints.memberForgot) || '/memberForgot';
      const payload = {};
      if (usernameOrEmail.includes('@')) payload.email = usernameOrEmail; else payload.username = usernameOrEmail;
      const resp = await fetch(base + ep, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) });
      const data = await resp.json();
      return data;
    } catch(e){ return { ok:false, message: '忘記密碼錯誤：' + e.message }; }
  }

  async function changePassword(currentPassword, newPassword){
    const base = (AppConfig && AppConfig.GAS_BASE_URL) || '';
    if (!base) return { ok:false, message: '未設定後端' };
    try {
      const ep = (AppConfig.endpoints && AppConfig.endpoints.memberChangePassword) || '/memberChangePassword';
      const token = localStorage.getItem('auth_token') || '';
      const resp = await fetch(base + ep, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ token, current: currentPassword, new: newPassword }) });
      const data = await resp.json();
      return data || { ok:false };
    } catch(e){ return { ok:false, message: '修改密碼錯誤：' + e.message }; }
  }

  function getRole(){ return localStorage.getItem('auth_role') || 'member'; }
  function isAdmin(){ return getRole() === 'admin'; }

  window.Auth = { evaluatePasswordStrength, login, register, logout, forgot, changePassword, getRole, isAdmin };
})();
