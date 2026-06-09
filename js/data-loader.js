/**
 * data-loader.js
 * 
 * [功能說明]
 * 此檔案是前端與後端資料交換的核心層 (Data Layer)。
 * 支援 GAS 和 Wix 兩種後端模式。
 * 
 * [關聯檔案]
 * - 依賴 `js/config.js` 取得 API URL。
 * - 被 `js/admin.js` 使用。
 */
(function () {
  const AppConfig = window.AppConfig || { GAS_BASE_URL: '', endpoints: {}, datasets: {}, versionCacheKey: 'app_data_version' };
  
  // 判斷是否使用 Wix 模式
  const USE_WIX = AppConfig.isWixMode ? AppConfig.isWixMode() : false;
  const WIX_BASE = AppConfig.WIX_BASE_URL || '';
  const WIX_EP = AppConfig.wixEndpoints || {};
  
  const BASE = AppConfig.GAS_BASE_URL || '';
  const EP = AppConfig.endpoints || {};
  const DS = AppConfig.datasets || { about: 'aboutContent', providers: 'providers', site: 'siteContent', blog: 'blogContent', services: 'servicesContent' };
  const VERSION_KEY = AppConfig.versionCacheKey || 'app_data_version';
  const EVT = 'data:updated';

  function getCache() {
    try { return JSON.parse(localStorage.getItem(VERSION_KEY) || '{}'); } catch (e) { return {}; }
  }
  function setCache(obj) { localStorage.setItem(VERSION_KEY, JSON.stringify(obj || {})); }
  function mkNonce() { try { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); } catch (e) { return String(Date.now()); } }

  async function postPlain(url, payload) {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, credentials: 'omit' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  }

  // Wix 模式的 HTTP 請求
  async function wixRequest(endpoint, payload) {
    const url = WIX_BASE + endpoint;
    return await postPlain(url, payload);
  }

  function applyData(key, data) {
    if (!data) return;
    if (key === DS.about || key === 'aboutContent') {
      window.aboutContent = data;
    } else if (key === DS.providers || key === 'providers') {
      window.providersData = data;
    } else if (key === DS.site || key === 'siteContent') {
      window.siteContent = data;
    } else if (key === DS.blog || key === 'blogContent') {
      window.blogContent = data;
    } else if (key === DS.services || key === 'servicesContent') {
      window.servicesContent = data;
    }
  }

  function dispatchUpdated(keys) {
    try { document.dispatchEvent(new CustomEvent(EVT, { detail: { keys } })); } catch (e) { }
  }

  async function secureRead(key, authToken) {
    const t = authToken || token();
    if (!t) throw new Error('未登入');
    
    if (USE_WIX) {
      // Wix 模式
      const res = await wixRequest(WIX_EP.read, { key, token: t, nonce: mkNonce() });
      if (res && res.ok) {
        applyData(key, res.data);
        if (res.version != null) { const c = getCache(); c[key] = res.version; setCache(c); }
        dispatchUpdated([key]);
        return res.data;
      }
      throw new Error(res?.message || '讀取失敗');
    } else {
      // GAS 模式
      const res = await postPlain(BASE + (EP.read || ''), { key, token: t, nonce: mkNonce() });
      const payload = res && (res.data ?? res[key] ?? res);
      const version = res && (res.version ?? res.v ?? null);
      applyData(key, payload);
      if (version != null) { const c = getCache(); c[key] = version; setCache(c); }
      dispatchUpdated([key]);
      return payload;
    }
  }

  async function fetchAll() {
    // Wix 模式下從本地快取讀取
    if (USE_WIX) {
      const keys = [DS.about, DS.providers, DS.site, DS.blog, DS.services].filter(Boolean);
      for (const key of keys) {
        try {
          const cached = localStorage.getItem(`wix_data_${key}`);
          if (cached) applyData(key, JSON.parse(cached));
        } catch (e) { }
      }
      return;
    }
    
    if (!BASE || !EP.data) return;
    const keys = [DS.about, DS.providers, DS.site, DS.blog, DS.services].filter(Boolean);
    for (const key of keys) {
      try { await fetchData(key); } catch (e) { }
    }
  }

  async function fetchData(key) {
    if (USE_WIX) {
      // Wix 模式下需要先登入才能讀取（透過 secureRead）
      // 公開頁面從 localStorage 讀取
      const cached = localStorage.getItem(`wix_data_${key}`);
      if (cached) {
        applyData(key, JSON.parse(cached));
        return JSON.parse(cached);
      }
      return {};
    }
    
    const cache = getCache();
    const v = cache[key] || Date.now();
    const url = BASE + EP.data + '&key=' + encodeURIComponent(key) + '&v=' + encodeURIComponent(v);
    const data = await getJSON(url);
    if (data && data.notModified) {
      return (key === DS.providers ? (window.providersData || {}) : key === DS.site ? (window.siteContent || {}) : key === DS.blog ? (window.blogContent || {}) : key === DS.services ? (window.servicesContent || {}) : (window.aboutContent || {}));
    }
    const payload = data && (data.data ?? data[key] ?? data);
    const version = data && (data.version ?? data.v ?? null);
    applyData(key, payload);
    if (version != null) {
      const c = getCache(); c[key] = version; setCache(c);
    }
    dispatchUpdated([key]);
    return payload;
  }
  
  async function getJSON(url) {
    const resp = await fetch(url, { method: 'GET', credentials: 'omit', cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  }

  async function login(username, password) {
    if (USE_WIX) {
      // Wix 登入
      const res = await wixRequest(WIX_EP.login, { username, password });
      if (res && res.ok && res.token) {
        try { sessionStorage.setItem('admin_token', res.token); localStorage.removeItem('admin_token'); }
        catch (e) { localStorage.setItem('admin_token', res.token); }
      }
      return res;
    }
    
    if (!BASE || !EP.login) throw new Error('未設定 GAS_BASE_URL');
    const res = await postPlain(BASE + EP.login, { username, password });
    if (res && res.ok && res.token) {
      try { sessionStorage.setItem('admin_token', res.token); localStorage.removeItem('admin_token'); }
      catch (e) { localStorage.setItem('admin_token', res.token); }
    }
    return res;
  }
  
  function token() {
    try { return sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || ''; }
    catch (e) { return localStorage.getItem('admin_token') || ''; }
  }
  
  function logout() { 
    try { sessionStorage.removeItem('admin_token'); } catch (e) { } 
    localStorage.removeItem('admin_token'); 
  }

  async function update(key, dataObj, authToken) {
    const t = authToken || token();
    if (!t) throw new Error('未登入');
    
    if (USE_WIX) {
      // Wix 更新（直接儲存，無需發佈）
      const res = await wixRequest(WIX_EP.update, { key, data: dataObj, token: t, nonce: mkNonce() });
      if (res && res.ok) {
        applyData(key, dataObj);
        // 快取到 localStorage
        localStorage.setItem(`wix_data_${key}`, JSON.stringify(dataObj));
        if (res.version != null) { const c = getCache(); c[key] = res.version; setCache(c); }
        dispatchUpdated([key]);
      }
      return res;
    }
    
    const payload = { key, data: dataObj, token: t, nonce: mkNonce() };
    const res = await postPlain(BASE + EP.update, payload);
    if (res && res.ok) {
      applyData(key, dataObj);
      const c = getCache(); if (res.version != null) c[key] = res.version; setCache(c);
      dispatchUpdated([key]);
    }
    return res;
  }

  async function fetchAllSecure() {
    const keys = [DS.about, DS.providers, DS.site, DS.blog, DS.services].filter(Boolean);
    for (const key of keys) { try { await secureRead(key); } catch (e) { } }
  }

  // Wix 模式下移除 publish 功能
  async function publish(keys) {
    if (USE_WIX) {
      // Wix 不需要發佈，直接返回成功
      return { ok: true, message: 'Wix 模式無需發佈，資料立即生效' };
    }
    const t = token();
    if (!t) throw new Error('未登入');
    const payload = { token: t, nonce: mkNonce(), keys: Array.isArray(keys) ? keys : (keys ? [keys] : undefined) };
    const res = await postPlain(BASE + (EP.publish || ''), payload);
    return res;
  }

  async function savePublish(key, dataObj, keys) {
    if (USE_WIX) {
      // Wix 直接更新即可
      return await update(key, dataObj);
    }
    const t = token();
    if (!t) throw new Error('未登入');
    const payload = { token: t, nonce: mkNonce(), key, data: dataObj, keys: Array.isArray(keys) ? keys : (keys ? [keys] : undefined) };
    const res = await postPlain(BASE + (EP.savePublish || ''), payload);
    if (res && res.ok) {
      try {
        applyData(key, dataObj);
        const ver = res.update && res.update.version;
        if (ver != null) { const c = getCache(); c[key] = ver; setCache(c); }
        dispatchUpdated([key]);
      } catch (e) { }
    }
    return res;
  }
  
  // Wix 圖片上傳
  async function uploadImage(file) {
    const t = token();
    if (!t) throw new Error('未登入');
    
    const fr = await new Promise((resolve, reject) => { 
      const r = new FileReader(); 
      r.onload = () => resolve(r.result); 
      r.onerror = () => reject(new Error('讀檔失敗')); 
      r.readAsDataURL(file); 
    });
    
    if (USE_WIX) {
      const res = await wixRequest(WIX_EP.uploadImage, { token: t, dataUrl: fr, filename: file.name });
      if (!res || !res.ok) throw new Error(res?.message || '上傳失敗');
      return res;
    } else {
      const resp = await fetch(BASE + (EP.uploadImage || ''), { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain' }, 
        body: JSON.stringify({ token: t, dataUrl: fr, filename: file.name }) 
      });
      if (!resp.ok) throw new Error('上傳失敗(' + resp.status + ')');
      const data = await resp.json();
      if (!data || !data.ok) throw new Error(data?.message || '上傳失敗');
      return data;
    }
  }

  const DataAPI = { 
    fetchAll, fetchAllSecure, secureRead, fetchData, login, logout, token, update, 
    publish, savePublish, uploadImage, EVENT: EVT, datasets: DS 
  };
  window.DataAPI = DataAPI;

  // auto fetch on load if configured
  if (!USE_WIX && BASE && window.AppConfig && window.AppConfig.autoFetchPublic) {
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', fetchAll); }
    else { fetchAll(); }
  }
})();
