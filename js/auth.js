/**
 * auth.js
 * 會員認證模組
 * 支援 GAS 和 Wix 兩種後端模式
 */
(function () {
  const AppConfig = window.AppConfig || { GAS_BASE_URL: '', endpoints: { memberLogin: '/memberLogin', memberRegister: '/memberRegister', memberForgot: '/memberForgot', profileRead: '/profileRead', profileUpdate: '/profileUpdate' } };
  
  // 判斷是否使用 Wix 模式
  const USE_WIX = AppConfig.isWixMode ? AppConfig.isWixMode() : false;
  const WIX_BASE = AppConfig.WIX_BASE_URL || '';
  const WIX_EP = AppConfig.wixEndpoints || {};

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

  // Wix 模式的 HTTP 請求
  async function wixRequest(endpoint, payload) {
    const url = WIX_BASE + endpoint;
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, credentials: 'omit' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  }

  async function register(username, email, password, options) {
    if (!username || !email || !password) return { ok: false, message: '請完整填寫資料' };
    
    if (USE_WIX) {
      try {
        const res = await wixRequest(WIX_EP.memberRegister, { username, email, password });
        if (res && res.ok) {
          // 註冊成功後自動登入
          return { ok: true, role: 'member' };
        }
        return { ok: false, message: res?.message || '註冊失敗' };
      } catch (e) {
        return { ok: false, message: '註冊錯誤：' + e.message };
      }
    }
    
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
    // Demo local registration
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
    
    if (USE_WIX) {
      try {
        const res = await wixRequest(WIX_EP.memberLogin, { username, password });
        if (res && res.ok && res.token) {
          localStorage.setItem('auth_token', res.token);
          localStorage.setItem('auth_user', username);
          if (res.role) localStorage.setItem('auth_role', res.role);
          return { ok: true, token: res.token, role: res.role || 'member' };
        }
        return { ok: false, message: res?.message || '帳號或密碼錯誤' };
      } catch (e) {
        return { ok: false, message: '登入錯誤：' + e.message };
      }
    }
    
    const base = (AppConfig && AppConfig.GAS_BASE_URL) || '';
    if (base) {
      try {
        const ep = (AppConfig.endpoints && AppConfig.endpoints.memberLogin) || '/memberLogin';
        const resp = await fetch(base + ep, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ username, password })
        });
        let data = null;
        try { data = await resp.json(); } catch {}
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

  async function forgot(usernameOrEmail){
    if (USE_WIX) {
      try {
        const email = usernameOrEmail.includes('@') ? usernameOrEmail : null;
        const res = await wixRequest(WIX_EP.memberForgot, { email });
        return res;
      } catch (e) {
        return { ok: false, message: '忘記密碼錯誤：' + e.message };
      }
    }
    
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
    if (USE_WIX) {
      try {
        const token = localStorage.getItem('auth_token') || '';
        const res = await wixRequest(WIX_EP.memberChangePassword, { 
          token, 
          oldPassword: currentPassword, 
          newPassword 
        });
        return res;
      } catch (e) {
        return { ok: false, message: '修改密碼錯誤：' + e.message };
      }
    }
    
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