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
      card.addEventListener('mouseenter', () => card.classList.add('ring-1','ring-blue-300','dark:ring-blue-500'));
      card.addEventListener('mouseleave', () => card.classList.remove('ring-1','ring-blue-300','dark:ring-blue-500'));
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
              <p class=\"text-gray-700 dark:text-gray-300 text-sm\">${m.desc}</p>
              ${link ? `<div class=\"mt-3\">${link}</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </section>

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
    setTimeout(()=> typeText(leadEl, data.lead || '', 14), 150);
    heroEl?.addEventListener('click', ()=> shatterAndReveal(heroEl, data.heroTitle || '關於我們'));
    leadEl?.addEventListener('click', ()=> shatterAndReveal(leadEl, data.lead || ''));

    // interactions and animations
    attachCardInteractions(root);
    const toAnimate = Array.from(root.querySelectorAll('.about-card, section:nth-of-type(2) li'));
    animateOnView(toAnimate);

    // Start count when section is visible
    const achSec = root.querySelector('section:nth-of-type(2)');
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
})();
