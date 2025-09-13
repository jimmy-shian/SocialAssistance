// Authentication helpers (ready for future GAS backend)
(function () {
  const AppConfig = window.AppConfig || { GAS_BASE_URL: '', endpoints: { login: '/login', profile: '/profile' } };

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

  async function login(username, password) {
    if (!username || !password) return { ok: false, message: '請輸入帳號與密碼' };
    const base = (AppConfig && AppConfig.GAS_BASE_URL) || '';
    if (base) {
      try {
        if (window.DataAPI && window.DataAPI.login) {
          const data = await window.DataAPI.login(username, password);
          if (!data || !data.ok || !data.token) return { ok: false, message: data && data.message || '登入失敗' };
          // mirror to auth_token for pages that rely on it
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', username);
          return { ok: true, token: data.token };
        }
        // fallback to JSON if DataAPI not present
        const resp = await fetch(base + AppConfig.endpoints.login, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ username, password })
        });
        if (!resp.ok) return { ok: false, message: '登入失敗，請確認帳密' };
        const data = await resp.json();
        if (!data || !data.token) return { ok: false, message: '登入失敗：缺少 token' };
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', username);
        return { ok: true, token: data.token };
      } catch (e) {
        return { ok: false, message: '登入錯誤：' + e.message };
      }
    }
    // Demo mode (no backend): accept demo users
    if (password.length >= 6) {
      const token = 'demo-token';
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', username);
      return { ok: true, token };
    }
    return { ok: false, message: '密碼長度不足' };
  }

  function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  window.Auth = { evaluatePasswordStrength, login, logout };
})();
