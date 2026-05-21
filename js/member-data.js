/**
 * member-data.js
 * 會員資料存取層
 * 支援 GAS 和 Wix 兩種後端模式
 */
(function () {
  const AppConfig = window.AppConfig || { GAS_BASE_URL: '', endpoints: { profileRead: '/profileRead', profileUpdate: '/profileUpdate' } };
  
  // 判斷是否使用 Wix 模式
  const USE_WIX = AppConfig.isWixMode ? AppConfig.isWixMode() : false;
  const WIX_BASE = AppConfig.WIX_BASE_URL || '';
  const WIX_EP = AppConfig.wixEndpoints || {};

  function key(username) { return `profile:${username}`; }

  function defaultProfile(username) {
    return {
      username,
      basic: { name: '', email: '', phone: '', birthday: '', address: '' },
      selfEvaluation: { interests: '', strengths: '', goals: '' },
      activities: [],
      learningRecords: []
    };
  }

  function hasMeaningfulContent(p){
    if (!p) return false;
    try {
      const b = p.basic || {};
      const s = p.selfEvaluation || {};
      const basicFilled = ['name','email','phone','birthday','address'].some(k=> (b[k]||'').toString().trim());
      const selfFilled = ['interests','strengths','goals'].some(k=> (s[k]||'').toString().trim());
      const listFilled = (p.activities&&p.activities.length) || (p.learningRecords&&p.learningRecords.length);
      return !!(basicFilled || selfFilled || listFilled);
    } catch(e){ return false; }
  }

  // Wix 模式的 HTTP 請求
  async function wixRequest(endpoint, payload) {
    const url = WIX_BASE + endpoint;
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, credentials: 'omit' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  }

  async function loadProfile(username) {
    username = username || (localStorage.getItem('auth_user') || 'guest');
    
    if (USE_WIX) {
      try {
        const token = localStorage.getItem('auth_token') || '';
        const res = await wixRequest(WIX_EP.profileRead, { token });
        if (res && res.ok && res.data) {
          // 快取到 localStorage
          localStorage.setItem(key(username), JSON.stringify(res.data));
          return res.data;
        }
      } catch (e) {
        console.warn('Wix profile fetch failed, falling back to local', e);
      }
      // Fallback to local
      const raw = localStorage.getItem(key(username));
      return raw ? JSON.parse(raw) : defaultProfile(username);
    }
    
    // GAS 模式
    const base = AppConfig.GAS_BASE_URL || '';
    if (base) {
      try {
        const token = localStorage.getItem('auth_token') || '';
        const ep = (AppConfig.endpoints && AppConfig.endpoints.profileRead) || '/profileRead';
        const resp = await fetch(base + ep, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ token, username }) });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.ok) {
            const remote = data.profile || data;
            try {
              const localRaw = localStorage.getItem(key(username));
              if (!hasMeaningfulContent(remote) && localRaw){
                const localObj = JSON.parse(localRaw);
                if (hasMeaningfulContent(localObj)) {
                  await saveProfile(username, localObj);
                  return localObj;
                }
              }
            } catch(e){}
            return remote;
          }
        }
      } catch (e) {
        console.warn('GAS profile fetch failed, falling back to local', e);
      }
    }
    // Fallback local
    const raw = localStorage.getItem(key(username));
    return raw ? JSON.parse(raw) : defaultProfile(username);
  }

  async function saveProfile(username, profile) {
    username = username || (localStorage.getItem('auth_user') || 'guest');
    
    if (USE_WIX) {
      try {
        const token = localStorage.getItem('auth_token') || '';
        const res = await wixRequest(WIX_EP.profileUpdate, { token, data: profile });
        if (res && res.ok) {
          // 同步到 localStorage
          localStorage.setItem(key(username), JSON.stringify(profile));
          return { ok: true };
        }
        return res;
      } catch (e) {
        console.warn('Wix profile save failed, saving local instead', e);
      }
      localStorage.setItem(key(username), JSON.stringify(profile));
      return { ok: true };
    }
    
    // GAS 模式
    const base = AppConfig.GAS_BASE_URL || '';
    if (base) {
      try {
        const token = localStorage.getItem('auth_token') || '';
        const ep = (AppConfig.endpoints && AppConfig.endpoints.profileUpdate) || '/profileUpdate';
        const resp = await fetch(base + ep, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ token, username, profile }) });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.ok) return { ok:true };
        }
      } catch (e) {
        console.warn('GAS profile save failed, saving local instead', e);
      }
    }
    localStorage.setItem(key(username), JSON.stringify(profile));
    return { ok: true };
  }

  function currentUser() { return localStorage.getItem('auth_user') || ''; }
  function isLoggedIn() { return !!localStorage.getItem('auth_token'); }

  window.MemberData = { loadProfile, saveProfile, currentUser, isLoggedIn };
})();