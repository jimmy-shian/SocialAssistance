// Admin UI for editing datasets via GAS
(function(){
  function qs(s, r=document){ return r.querySelector(s); }
  function text(el, msg){ if (el) el.textContent = msg||''; }
  function show(el, on){ if(!el) return; el.classList.toggle('hidden', !on); }

  const AppConfig = window.AppConfig || { datasets: { about:'aboutContent', providers:'providers', site:'siteContent' }, versionCacheKey:'app_data_version' };
  const DS = AppConfig.datasets || { about:'aboutContent', providers:'providers', site:'siteContent' };
  const VERSION_KEY = AppConfig.versionCacheKey || 'app_data_version';

  function keyFromSelect(){
    const v = (qs('#ds-select')?.value) || 'about';
    if (v === 'about') return DS.about;
    if (v === 'providers') return DS.providers;
    if (v === 'site') return DS.site;
    return v; // fallback
  }

  function getLocalVersion(key){
    try { const obj = JSON.parse(localStorage.getItem(VERSION_KEY)||'{}'); return obj[key] ?? '-'; } catch(e){ return '-'; }
  }
  function updateVersionLabel(){
    const key = keyFromSelect();
    const ver = getLocalVersion(key);
    text(qs('#ds-version'), `版本：${ver}`);
  }

  function pretty(jsonStr){
    try { return JSON.stringify(JSON.parse(jsonStr), null, 2); } catch(e){ return jsonStr; }
  }
  function setEditor(obj){ qs('#ds-editor').value = JSON.stringify(obj || {}, null, 2); }

  async function init(){
    const hasBase = !!(AppConfig && AppConfig.GAS_BASE_URL);
    show(qs('#gas-url-warning'), !hasBase);

    // Overlay: warning must dismiss on click/Enter/Escape
    const overlay = qs('#admin-warning-overlay');
    const overlayBtn = qs('#admin-warning-dismiss');
    function dismissOverlay(){
      if (!overlay) return;
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden','true');
    }
    // if (overlay) {
    //   overlay.setAttribute('aria-hidden','false');
    //   overlay.addEventListener('click', dismissOverlay);
    //   document.addEventListener('keydown', (e)=>{
    //     if (overlay.classList.contains('hidden')) return;
    //     if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
    //       dismissOverlay();
    //     }
    //   });
    // }
    if (overlayBtn) overlayBtn.addEventListener('click', (e)=>{ e.stopPropagation(); dismissOverlay(); });

    const token = (window.DataAPI && window.DataAPI.token && window.DataAPI.token()) || '';
    const logged = !!token;
    show(qs('#admin-login'), !logged);
    show(qs('#admin-panel'), logged);

    updateVersionLabel();

    qs('#adm-login')?.addEventListener('click', async ()=>{
      const u = qs('#adm-usr')?.value?.trim();
      const p = qs('#adm-pwd')?.value || '';
      const status = qs('#adm-status');
      text(status, '登入中…');
      try {
        const res = await window.DataAPI.login(u, p);
        if (!res || !res.ok) { text(status, res && res.message || '登入失敗'); return; }
        text(status, '登入成功');
        show(qs('#admin-login'), false);
        show(qs('#admin-panel'), true);
      } catch(e){ text(status, '錯誤：' + e.message); }
    });

    qs('#btn-logout')?.addEventListener('click', ()=>{ window.DataAPI.logout(); window.location.reload(); });

    qs('#ds-select')?.addEventListener('change', ()=>{ updateVersionLabel(); });

    qs('#btn-load-remote')?.addEventListener('click', async ()=>{
      const key = keyFromSelect();
      try {
        const data = await window.DataAPI.fetchData(key);
        setEditor(data);
        updateVersionLabel();
      } catch(e){ alert('載入失敗：' + e.message); }
    });

    qs('#btn-load-current')?.addEventListener('click', ()=>{
      const key = keyFromSelect();
      let data = {};
      if (key === DS.about) data = window.aboutContent || {};
      else if (key === DS.providers) data = window.providersData || {};
      else if (key === DS.site) data = window.siteContent || {};
      setEditor(data);
    });

    qs('#btn-pretty')?.addEventListener('click', ()=>{
      const ed = qs('#ds-editor'); if (!ed) return;
      ed.value = pretty(ed.value || '');
    });

    qs('#btn-save')?.addEventListener('click', async ()=>{
      const key = keyFromSelect();
      const ed = qs('#ds-editor'); if (!ed) return;
      let obj;
      try { obj = JSON.parse(ed.value || '{}'); }
      catch(e){ alert('JSON 格式錯誤：' + e.message); return; }
      try {
        const res = await window.DataAPI.update(key, obj);
        if (res && res.ok) {
          alert('已儲存（版本 ' + res.version + '）');
          updateVersionLabel();
        } else {
          alert('儲存失敗：' + (res && res.message || '未知錯誤'));
        }
      } catch(e){ alert('儲存錯誤：' + e.message); }
    });

    // Update version label when DataAPI bump
    try {
      document.addEventListener((window.DataAPI && window.DataAPI.EVENT) || 'data:updated', updateVersionLabel);
    } catch(e){}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
