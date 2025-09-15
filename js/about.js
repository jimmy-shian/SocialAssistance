// Render About page from window.aboutContent with interactions
(function () {
  function qs(s, r=document){return r.querySelector(s)}
  function el(tag, cls){ const x=document.createElement(tag); if(cls) x.className=cls; return x; }
  function prefersReduced(){ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  const typingControllers = new WeakMap();
  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
  function charDelay(ch, base){
    const punct = '，。．、；：！？?!,.…';
    const slow = '—–-';
    let d = base * (0.7 + Math.random()*0.6); // jitter
    if (punct.includes(ch)) d += base*3 + Math.random()*120;
    if (slow.includes(ch)) d += base*2;
    if (ch === ' ') d += 15;
    return d;
  }
  async function typeText(el, text, base=28){
    if (!el) return;
    if (prefersReduced()) { el.textContent = text || ''; return; }
    el.textContent = '';
    const ctrl = { abort:false };
    typingControllers.set(el, ctrl);
    const chars = Array.from(String(text||''));
    for (let i=0;i<chars.length;i++){
      if (ctrl.abort) { el.textContent = text || ''; break; }
      el.textContent += chars[i];
      await sleep(charDelay(chars[i], base));
    }
    typingControllers.delete(el);
  }

  function shatterAndReveal(el, fullText){
    if (!el) return;
    const ctrl = typingControllers.get(el);
    if (ctrl) ctrl.abort = true;
    if (prefersReduced()) { el.textContent = fullText || ''; return; }
    const text = el.textContent || '';
    const rect = el.getBoundingClientRect();
    const layer = document.createElement('div');
    layer.style.position = 'fixed';
    layer.style.left = rect.left + 'px';
    layer.style.top = rect.top + 'px';
    layer.style.width = rect.width + 'px';
    layer.style.height = rect.height + 'px';
    layer.style.pointerEvents = 'none';
    layer.style.zIndex = 1200;
    const style = getComputedStyle(el);
    const maxPieces = Math.min(80, text.length);
    for(let i=0;i<maxPieces;i++){
      const ratio = (i+0.5)/maxPieces;
      const span = document.createElement('span');
      span.className = 'shatter-piece boom';
      span.textContent = text[i];
      span.style.position = 'absolute';
      span.style.left = Math.round(ratio*rect.width) + 'px';
      span.style.top = Math.round(rect.height/2 + (Math.random()*10-5)) + 'px';
      span.style.color = style.color;
      span.style.font = style.font;
      const dx = (Math.random()*2-1) * 160;
      const dy = (-Math.random()*1.2 - 0.1) * 180;
      const rot = (Math.random()*2-1) * 100 + 'deg';
      span.style.setProperty('--dx', dx + 'px');
      span.style.setProperty('--dy', dy + 'px');
      span.style.setProperty('--rot', rot);
      layer.appendChild(span);
    }
    document.body.appendChild(layer);
    setTimeout(()=> layer.remove(), 650);
    el.textContent = fullText || '';
  }

  function numberSpan(text){
    // Wrap first number in span for count-up
    const m = String(text).match(/(\d+)/);
    if(!m) return { html: text, to: null };
    const to = parseInt(m[1], 10);
    const html = text.replace(m[1], `<span class="count" data-to="${to}">${0}</span>`);
    return { html, to };
  }

  function countUpOnce(root){
    const els = root.querySelectorAll('.count[data-to]');
    const dur = 1200;
    els.forEach(sp => {
      if(sp.dataset.done) return;
      const to = parseInt(sp.dataset.to, 10);
      const start = performance.now();
      function tick(t){
        const p = Math.min(1, (t - start)/dur);
        const val = Math.round(to * (0.5 - Math.cos(Math.PI*p)/2));
        sp.textContent = val.toString();
        if(p<1) requestAnimationFrame(tick); else { sp.textContent = to.toString(); sp.dataset.done='1'; }
      }
      requestAnimationFrame(tick);
    })
  }

  function attachCardInteractions(container){
    container.querySelectorAll('.about-card').forEach(card => {
      card.addEventListener('mouseenter', () => card.classList.add('ring-1','ring-purple-300','dark:ring-purple-500'));
      card.addEventListener('mouseleave', () => card.classList.remove('ring-1','ring-purple-300','dark:ring-purple-500'));
      card.addEventListener('click', (e) => {
        if (e.target && e.target.closest('a')) return; // 僅連結可跳轉
        // 不做整卡跳轉，保留輕量互動
        card.classList.toggle('task-done');
      });
    });
  }

  function animateOnView(elements){
    if (!elements || !elements.length) return;
    const io = new IntersectionObserver(entries=>{
      entries.forEach(en=>{
        if(en.isIntersecting){
          en.target.style.transition = 'opacity .5s ease, transform .5s ease';
          en.target.style.opacity = '1';
          en.target.style.transform = 'none';
          io.unobserve(en.target);
        }
      })
    },{ threshold: 0.15 });
    elements.forEach(el=>{
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      io.observe(el);
    });
  }

  function render(){
    const data = window.aboutContent || {};
    const root = qs('#about-root');
    if(!root) return;
    root.innerHTML = `
      <header class="mb-12 text-center">
        <h1 class="heading-display"><span id="hero-typed"></span></h1>
        <p class="mt-3 lead-text text-gray-700 dark:text-gray-300"><span id="lead-typed"></span></p>
      </header>

      <section class="mt-12">
        <h2 class="heading-section mb-6">${data.modelTitle || '四階段引導模型'}</h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          ${(data.model||[]).map(m=>{
              const link = (m && m.href) ? `<a class=\"link-cta small\" href=\"${m.href}\" target=\"_blank\" rel=\"noopener\">${m.linkText || '前往連結'} <span class=\"arrow\">→</span></a>` : '';
              return `
            <div class=\"about-card p-6 shadow-lg rounded-lg bg-gray-50 dark:bg-gray-800 transition-transform duration-150 hover:-translate-y-0.5\">
              <h3 class=\"font-semibold mb-2\">${m.title}</h3>
                <p class=\"text-gray-700 dark:text-gray-300 text-sm\">${m.desc || ''}</p>
                ${link ? `<div class=\"mt-3\">${link}</div>` : ''}
              </div>`;
            }).join('')}
          </div>
      </section>

      ${Array.isArray(data.team) && data.team.length ? `
      <section class=\"mt-16 team-section rounded-lg\">
        <h2 class=\"heading-section mb-8 text-center\">Our Team.</h2>
        <div class=\"grid gap-8 md:grid-cols-2 lg:grid-cols-3\">
          ${data.team.map(t=>{
            const roles = (t.roles||[]).map(r=>`<span class=\"inline-block px-2 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200\">${r}</span>`).join(' ');
            const motto = t.motto ? `<blockquote class=\"motto text-gray-800 dark:text-gray-100 text-base italic\">${t.motto}</blockquote>` : '';
            const edu = (t.education||[]).map(d=>`<li>${d}</li>`).join('');
            const exp = (t.experience||[]).map(d=>`<li>${d}</li>`).join('');
            const socials = (t.socials||[]).map(s=>{
              const key = String(s.name||'').toLowerCase();
              let icon = s.icon || '';
              if (key === 'facebook'|| key === 'fb') icon = 'https://cdn.simpleicons.org/facebook/E4405F';
              else if (key === 'instagram'|| key === 'ig') icon = 'https://cdn.simpleicons.org/instagram/E4405F';
              else if (key === 'line') icon = 'https://cdn.simpleicons.org/line/E4405F';
              else if (key === 'threads') icon = 'https://cdn.jsdelivr.net/npm/simple-icons@v10/icons/threads.svg';
              else if (key === 'youtube' || key === 'yt') icon = 'https://cdn.simpleicons.org/youtube/';
              return `<a href=\"${s.href}\" target=\"_blank\" rel=\"noopener\" aria-label=\"${s.name||'link'}\"><img src=\"${icon}\" alt=\"${s.name||'link'}\" class=\"team-social-icon\"></a>`;
            }).join(' ');
            return `
            <article class=\"team-card overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900\">
              ${t.photo ? `<img class=\"w-full h-64 object-cover\" src=\"${t.photo}\" alt=\"${t.name||''}\">` : ''}
              <div class=\"p-5 space-y-3\">
                <div class=\"flex items-center gap-2 flex-wrap\">${roles}</div>
                <h3 class=\"text-xl font-semibold\">${t.name||''}</h3>
                ${motto}
                <div class=\"details\">
                  ${edu ? `<div class=\"mb-3\"><p class=\"text-sm font-semibold mb-1\">學歷</p><ul class=\"list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-200\">${edu}</ul></div>` : ''}
                  ${exp ? `<div class=\"mt-2\"><p class=\"text-sm font-semibold mb-1\">經歷</p><ul class=\"list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-200\">${exp}</ul></div>` : ''}
                  ${socials ? `<div class=\"mt-4 socials flex items-center gap-4\">${socials}</div>` : ''}
                </div>
              </div>
            </article>`;
          }).join('')}
        </div>
      </section>
      ` : ''}

      <section class="mt-16">
        <h2 class="heading-section mb-6">${data.achievementsTitle || '成就經歷'}</h2>
        <ul class="space-y-2 text-lg text-gray-700 dark:text-gray-300">
          ${(data.achievements||[]).map(a=>{
            if (typeof a === 'string'){
              const {html} = numberSpan(a);
              return `<li>${html}</li>`;
            } else if (a && a.href) {
              const {html} = numberSpan(a.text || '');
              return `<li><a class=\"link-cta outcard\" href=\"${a.href}\" target=\"_blank\" rel=\"noopener\">${html} <span class=\"arrow\">→</span></a></li>`;
            } else {
              const t = a && (a.text || a.title) || '';
              const {html} = numberSpan(t);
              return `<li>${html}</li>`;
            }
          }).join('')}
        </ul>
      </section>
    `;

    // typing effects with click-to-shatter
    const heroEl = qs('#hero-typed', root);
    const leadEl = qs('#lead-typed', root);
    typeText(heroEl, data.heroTitle || '關於我們', 26);
    // 若 lead 含 HTML（例如 <a> 或 <br>），直接 innerHTML 呈現，不做打字動畫
    const leadStr = data.lead || '';
    const hasHtml = /<\s*a\b|<\s*br\b|<\s*span\b|<\s*div\b|&lt;/.test(leadStr);
    if (hasHtml) {
      leadEl.innerHTML = leadStr;
    } else {
      setTimeout(()=> typeText(leadEl, leadStr, 14), 150);
      leadEl?.addEventListener('click', ()=> shatterAndReveal(leadEl, leadStr));
    }
    heroEl?.addEventListener('click', ()=> shatterAndReveal(heroEl, data.heroTitle || '關於我們'));

    // interactions and animations
    attachCardInteractions(root);
    const toAnimate = Array.from(root.querySelectorAll('.about-card, section:nth-of-type(3) li'));
    animateOnView(toAnimate);

    // 進場時重新計算階梯位移（考慮到每張卡片原始高度）
    function adjustModelStairs(){
      const container = root.querySelector('.model-steps'); if (!container) return;
      const steps = Array.from(container.querySelectorAll('.model-step'));
      if (!steps.length) return;
      const heights = steps.map(s=> s.getBoundingClientRect().height);
      const Hmax = Math.max(...heights);
      const n = steps.length; const step = 14; // 每階小幅度
      steps.forEach((el, i)=>{
        const desiredTop = (n - 1 - i) * step;
        const currentTop = Hmax - heights[i];
        const delta = desiredTop - currentTop; // 允許負值（往上移）
        el.style.setProperty('--offset', `${delta}px`);
      });
    }
    // 初次與視窗尺寸變更時重算
    setTimeout(adjustModelStairs, 0);
    window.addEventListener('resize', adjustModelStairs);

    // Team：點擊卡片展開/收合（忽略卡片內連結與互動元素）
    try {
      const cards = Array.from(root.querySelectorAll('.team-card'));
      cards.forEach(card => {
        card.addEventListener('click', (e)=>{
          if (e.target.closest('a,button,input,textarea,select,label')) return; // 讓互動元素照常運作
          card.classList.toggle('is-open');
          console.log('in');
        });
      });
    } catch(e){}

    // Start count when section is visible
    const achSec = root.querySelector('section:nth-of-type(3)');
    if(achSec){
      const io = new IntersectionObserver(es=>{
        es.forEach(e=>{ if(e.isIntersecting){ countUpOnce(achSec); io.disconnect(); } });
      },{threshold:0.2});
      io.observe(achSec);
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', render);
  } else { render(); }

  // Re-render when datasets are updated from GAS
  try {
    document.addEventListener((window.DataAPI && window.DataAPI.EVENT) || 'data:updated', (ev) => {
      const ds = (window.AppConfig && window.AppConfig.datasets && window.AppConfig.datasets.about) || 'aboutContent';
      const keys = (ev && ev.detail && ev.detail.keys) || [];
      if (!keys.length || keys.includes(ds)) {
        render();
      }
    });
  } catch (e) {}
})();
