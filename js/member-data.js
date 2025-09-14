// Member data access layer (localStorage demo; optional GAS backend)
(function () {
  const AppConfig = window.AppConfig || { GAS_BASE_URL: '', endpoints: { profileRead: '/profileRead', profileUpdate: '/profileUpdate' } };

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

  async function loadProfile(username) {
    username = username || (localStorage.getItem('auth_user') || 'guest');
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
            // 若遠端是空白，但本地有資料，則自動上傳一次做遷移
            try {
              const localRaw = localStorage.getItem(key(username));
              if (!hasMeaningfulContent(remote) && localRaw){
                const localObj = JSON.parse(localRaw);
                if (hasMeaningfulContent(localObj)) {
                  await saveProfile(username, localObj); // 嘗試同步到 GAS
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
