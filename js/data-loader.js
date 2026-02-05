/**
 * data-loader.js
 * 
 * [功能說明]
 * 此檔案是前端與後端資料交換的核心層 (Data Layer)。
 * 1. 負責從 GAS API (`fetchData`) 取得最新資料。
 * 2. 若 API 失敗，負責定義 fallback 行為。
 * 3. 定義 `applyData` 將資料掛載到全域變數 (window.siteContent, window.blogContent 等)。
 * 4. 提供 `DataAPI` 物件供 `admin.js` 操作 (login, update, publish)。
 * 
 * [關聯檔案]
 * - 依賴 `js/config.js` 取得 API URL。
 * - 被 `js/admin.js` 使用。
 * 
 * [擴充指南]
 * - 若新增資料集，需在此檔案的 `DS` 定義對應鍵值，並在 `applyData` 與 `fetchAll` 加入處理邏輯。
 */
// Data Loader for GAS integration
(function () {
  const AppConfig = window.AppConfig || { GAS_BASE_URL: '', endpoints: {}, datasets: {}, versionCacheKey: 'app_data_version' };
  const BASE = AppConfig.GAS_BASE_URL || '';
  const EP = AppConfig.endpoints || {};
  const DS = AppConfig.datasets || { about: 'aboutContent', providers: 'providers', site: 'siteContent', blog: 'blogContent' };
  const VERSION_KEY = AppConfig.versionCacheKey || 'app_data_version';
  const EVT = 'data:updated';

  function getCache() {
    try { return JSON.parse(localStorage.getItem(VERSION_KEY) || '{}'); } catch (e) { return {}; }
  }
  function setCache(obj) { localStorage.setItem(VERSION_KEY, JSON.stringify(obj || {})); }
  function mkNonce() { try { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); } catch (e) { return String(Date.now()); } }

  async function getJSON(url) {
    const resp = await fetch(url, { method: 'GET', credentials: 'omit', cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  }

  async function postPlain(url, payload) {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, credentials: 'omit' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  }

  function applyData(key, data) {
    if (!data) return;
    if (key === DS.about || key === 'aboutContent') {
      window.aboutContent = data;
    } else if (key === DS.providers || key === 'providers') {
      // expected object keyed by provider id
      window.providersData = data;
    } else if (key === DS.site || key === 'siteContent') {
      window.siteContent = data;
    } else if (key === DS.blog || key === 'blogContent') {
      window.blogContent = data;
    }
  }

  function dispatchUpdated(keys) {
    try { document.dispatchEvent(new CustomEvent(EVT, { detail: { keys } })); } catch (e) { }
  }

  async function fetchVersions() {
    if (!BASE || !EP.version) return {};
    try {
      const data = await getJSON(BASE + EP.version);
      const versions = data && (data.versions || data);
      if (versions && typeof versions === 'object') {
        const cache = getCache();
        setCache({ ...cache, ...versions });
        return versions;
      }
    } catch (e) { /* ignore */ }
    return {};
  }

  async function fetchData(key) {
    const cache = getCache();
    const v = cache[key] || Date.now();
    const url = BASE + EP.data + '&key=' + encodeURIComponent(key) + '&v=' + encodeURIComponent(v);
    const data = await getJSON(url);
    // server may return { ok, key, version, notModified } or { ok, key, version, data }
    if (data && data.notModified) {
      // keep cache version and do nothing
      return (key === DS.providers ? (window.providersData || {}) : key === DS.site ? (window.siteContent || {}) : key === DS.blog ? (window.blogContent || {}) : (window.aboutContent || {}));
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

  // Secure read for admin: POST with token
  async function secureRead(key, authToken) {
    const t = authToken || token();
    if (!t) throw new Error('未登入');
    const res = await postPlain(BASE + (EP.read || ''), { key, token: t, nonce: mkNonce() });
    const payload = res && (res.data ?? res[key] ?? res);
    const version = res && (res.version ?? res.v ?? null);
    applyData(key, payload);
    if (version != null) { const c = getCache(); c[key] = version; setCache(c); }
    dispatchUpdated([key]);
    return payload;
  }

  async function fetchAll() {
    if (!BASE || !EP.data) return;
    const versions = await fetchVersions();
    const keys = [DS.about, DS.providers, DS.site, DS.blog];
    for (const key of keys) {
      try { await fetchData(key); } catch (e) { /* fallback to local if fails */ }
    }
  }

  async function login(username, password) {
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
  function logout() { try { sessionStorage.removeItem('admin_token'); } catch (e) { } localStorage.removeItem('admin_token'); }

  async function update(key, dataObj, authToken) {
    const t = authToken || token();
    if (!t) throw new Error('未登入');
    const payload = { key, data: dataObj, token: t, nonce: mkNonce() };
    const res = await postPlain(BASE + EP.update, payload);
    if (res && res.ok) {
      // apply and bump cache
      applyData(key, dataObj);
      const c = getCache(); if (res.version != null) c[key] = res.version; setCache(c);
      dispatchUpdated([key]);
    }
    return res;
  }

  async function fetchAllSecure() {
    const keys = [DS.about, DS.providers, DS.site, DS.blog];
    for (const key of keys) { try { await secureRead(key); } catch (e) { } }
  }

  async function publish(keys) {
    const t = token();
    if (!t) throw new Error('未登入');
    const payload = { token: t, nonce: mkNonce(), keys: Array.isArray(keys) ? keys : (keys ? [keys] : undefined) };
    const res = await postPlain(BASE + (EP.publish || ''), payload);
    return res;
  }

  // Combined save + publish in one round-trip
  async function savePublish(key, dataObj, keys) {
    const t = token();
    if (!t) throw new Error('未登入');
    const payload = { token: t, nonce: mkNonce(), key, data: dataObj, keys: Array.isArray(keys) ? keys : (keys ? [keys] : undefined) };
    const res = await postPlain(BASE + (EP.savePublish || ''), payload);
    if (res && res.ok) {
      // apply and bump cache using update.version if available
      try {
        applyData(key, dataObj);
        const ver = res.update && res.update.version;
        if (ver != null) { const c = getCache(); c[key] = ver; setCache(c); }
        dispatchUpdated([key]);
      } catch (e) { }
    }
    return res;
  }

  const DataAPI = { fetchAll, fetchAllSecure, secureRead, fetchData, fetchVersions, login, logout, token, update, publish, savePublish, EVENT: EVT, datasets: DS };
  window.DataAPI = DataAPI;

  // auto fetch on load if configured
  if (BASE && window.AppConfig && window.AppConfig.autoFetchPublic) {
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', fetchAll); }
    else { fetchAll(); }
  }
})();
