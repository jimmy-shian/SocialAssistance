// Member data access layer (localStorage demo; optional GAS backend)
(function () {
  const AppConfig = window.AppConfig || { GAS_BASE_URL: '', endpoints: { profile: '/profile' } };

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

  async function loadProfile(username) {
    username = username || (localStorage.getItem('auth_user') || 'guest');
    const base = AppConfig.GAS_BASE_URL || '';
    if (base) {
      try {
        const token = localStorage.getItem('auth_token') || '';
        const resp = await fetch(base + AppConfig.endpoints.profile + `?username=${encodeURIComponent(username)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) return await resp.json();
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
        const resp = await fetch(base + AppConfig.endpoints.profile, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ username, profile })
        });
        if (resp.ok) return { ok: true };
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
