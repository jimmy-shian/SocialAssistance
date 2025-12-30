(function () {
  const data = window.siteContent;
  if (!data) return;

  // Hero Slides
  if (data.hero && Array.isArray(data.hero.slides)) {
    const wrapper = document.querySelector('.hero-slide-wrapper');
    if (wrapper) {
      // Preserve the wrapper structure but update slides
      // Actually we need to restart the slider logic if we change DOM?
      // The hero slider script runs on DOMContentLoaded.
      // If this script runs AFTER, it might break the slider initialization if we replace elements.
      // We should run this BEFORE the slider script or re-init slider.
      // Or just replace 'src' of existing images if count matches?
      // Re-building is better for dynamic count.
      wrapper.innerHTML = data.hero.slides.map((s, i) => `
        <div class="hero-slide-asym ${i === 0 ? 'active' : ''}">
          <img src="${s.img}" alt="${s.alt || ''}">
        </div>
      `).join('');

      // Re-init slider if needed?
      // The existing slider script attaches to .hero-slide-asym? 
      // index.html script uses querySelectorAll('.hero-slide') ... wait!
      // In index.html line 346: querySelectorAll('.hero-slide') 
      // BUT HTML uses header 'hero-slide-asym'.
      // The auto-slide script in index.html MIGHT BE BROKEN given the class name change?
      // Let's check index.html line 58: class="hero-slide-asym".
      // Script line 346: querySelectorAll('.hero-slide'). 
      // IT IS BROKEN! The previous refactor broke the slider script?
      // I should fix the slider script selector to '.hero-slide-asym' too!
    }
  }

  // Hero Content
  if (data.hero) {
    const c = document.querySelector('.hero-content-asym');
    if (c) {
      const h = data.hero;
      let btns = (h.buttons || []).map(b =>
        `<a href="${b.link}" class="${(b.style === 'primary' || !b.style) ? 'px-8 py-3 bg-[var(--primary)] text-white rounded-full font-bold hover:bg-[var(--primary-dark)] transition-all transform hover:-translate-y-1 shadow-lg' : 'px-8 py-3 border-2 border-[var(--primary)] text-[var(--primary)] rounded-full font-bold hover:bg-[var(--primary-light)] transition-all'}">${b.text}</a>`
      ).join(' ');

      c.innerHTML = `
        <span class="block text-[var(--primary)] font-bold mb-2 tracking-widest text-sm">${h.label || 'SOUND CORE STUDIO'}</span>
        <h1 class="text-4xl md:text-5xl font-black mb-4 leading-tight">${h.title || ''}</h1>
        <p class="text-lg text-gray-700 mb-6 italic">${h.subtitle || ''}</p>
        ${h.info ? `<div class="mb-6 text-base text-gray-800 dark:text-gray-200 font-semibold leading-relaxed">${h.info}</div>` : ''}
        <div class="flex gap-4">${btns}</div>
      `;
    }
  }

  // Philosophy
  if (data.philosophy) {
    const p = document.querySelector('.philosophy-section');
    if (p) {
      const pData = data.philosophy;
      const imgBox = p.querySelector('.philosophy-image-box');
      if (imgBox) imgBox.innerHTML = `<img src="${pData.img}" alt="philosophy">`;
      const txt = p.querySelector('.philosophy-content');
      if (txt) txt.innerHTML = `
        <span class="section-label">${pData.label || 'ABOUT'}</span>
        <h2>${pData.title || ''}</h2>
        <blockquote>${pData.content || ''}</blockquote>
      `;
    }
  }

  // Services (Overlapping Gallery on Desktop, Scroll on Mobile)
  if (data.services) {
    const box = document.querySelector('.services-carousel');
    if (box) {
      // Generate Items HTML
      const items = data.services.map((s, i) => `
        <a href="${s.link || '#'}" class="service-card-carousel card-dynamic-bg">
          <img src="${s.img}" alt="${s.title}" class="service-card-img">
          <div class="service-bubble">
            <div class="service-icon-float"><i class="${s.icon || 'fas fa-star'}"></i></div>
            <h3>${s.title}</h3>
            <p>${s.desc}</p>
          </div>
        </a>
       `).join('');

      box.innerHTML = items;

      // Desktop: Enable horizontal masonry mode with autoplay & navigation
      if (window.innerWidth >= 768) {
        box.classList.add('masonry-mode');

        // Autoplay Loop
        const cards = box.querySelectorAll('.service-card-carousel');
        if (cards.length > 0) {
          let focusIndex = 0;
          cards[0].classList.add('focus');
          setInterval(() => {
            cards[focusIndex].classList.remove('focus');
            focusIndex = (focusIndex + 1) % cards.length;
            cards[focusIndex].classList.add('focus');
          }, 3000);
        }

        // Add Navigation Buttons
        const wrapper = box.parentElement;
        if (wrapper && !wrapper.querySelector('.sc-nav-btn')) {
          const btnPrev = document.createElement('button');
          btnPrev.className = 'sc-nav-btn prev';
          btnPrev.innerHTML = '<i class="fas fa-chevron-left"></i>';

          const btnNext = document.createElement('button');
          btnNext.className = 'sc-nav-btn next';
          btnNext.innerHTML = '<i class="fas fa-chevron-right"></i>';

          wrapper.appendChild(btnPrev);
          wrapper.appendChild(btnNext);

          btnPrev.addEventListener('click', () => {
            box.scrollBy({ left: -300, behavior: 'smooth' });
          });
          btnNext.addEventListener('click', () => {
            box.scrollBy({ left: 300, behavior: 'smooth' });
          });
        }
      }
    }
  }

  // Resources Section
  if (data.resources) {
    const section = document.querySelector('.resources-section');
    if (section) {
      const titleEl = section.querySelector('.section-title');
      if (titleEl && data.resources.title) {
        titleEl.textContent = data.resources.title;
      }
      const tagsContainer = section.querySelector('.resources-tags');
      if (tagsContainer && data.resources.tags) {
        tagsContainer.innerHTML = data.resources.tags.map(t =>
          `<a href="${t.link || './member.html'}" class="resource-tag">${t.text}</a>`
        ).join('');
      }
    }
  }

  // Blog Posts on Index
  if (data.blogPosts && Array.isArray(data.blogPosts)) {
    const grid = document.getElementById('blog-posts');
    if (grid) {
      grid.innerHTML = data.blogPosts.slice(0, 3).map(post => `
        <a href="${post.link || './blog.html'}" class="blog-card card-dynamic-bg">
          <div class="blog-card-image">
            <img src="${post.image}" alt="${post.title}">
          </div>
          <div class="blog-card-content">
            <p class="blog-card-date">${post.date}</p>
            <h4>${post.title}</h4>
          </div>
        </a>
      `).join('');
    }
  }

  // SDGs Section
  if (data.sdgs && Array.isArray(data.sdgs)) {
    const sdgsGrid = document.querySelector('.sdgs-grid');
    if (sdgsGrid) {
      // SVG icons for each SDG (would be better to have these as separate files or data)
      const svgs = {
        4: `<svg viewBox="0 0 1000 458"><g fill="currentColor" fill-rule="evenodd"><path d="M443.4 134.2L264 30.6v335l179.4 54V134.3m19.6.7v285l180.6-54.4v-335L463 135M784.4 22.2C784.4 10.4 775 1 763.2 1S742 10.3 742 22v23h42.4V22.2m-37 337.5H742l21.2 74.2 21.2-74.5H779h5.4v-298H742v298h5.3"></path><path d="M682.2 45L663 29.8v345L463.6 439h-20.3L245 383.8v-354L225.8 45v352.2l216.7 60h22l200-63.5 17.7-5.2V45"></path></g></svg>`,
        10: `<svg viewBox="0 0 1000 547"><g fill="currentcolor" fill-rule="evenodd"><path d="M595 304H403l-2 2v58l2 2h192l2-2v-58l-2-2m0-123H403c-1 0-2 1-2 3v57c0 2 1 3 2 3h192c1 0 2-1 2-3v-57c0-2-1-3-2-3m-3-87L500 2h-2l-92 92c-1 1 0 3 1 3h184c2 0 2-2 1-3m87 273l92-92v-2l-92-92c-1-1-3-1-3 1v184c0 1 2 2 3 1m-273 86l92 92h2l92-92c1-1 1-2-1-2H407c-1 0-2 1-1 2m-86-272l-93 92v2l93 92c1 1 2 0 2-1V182c0-2-1-2-2-1"></path></g></svg>`,
        11: `<svg viewBox="0 0 1000 508"><g fill="currentColor" fill-rule="evenodd"><path d="M165 367.3h150.5c2 0 3.6-1.7 3.6-3.7 0-1-.2-1.8-.8-2.4l-.2-.3-75-97-.6-.7c-.7-.7-1.6-1.2-2.7-1.2-1 0-1.8.5-2.4 1l-.5.6-.7.8-73 95.8-1 1.3c-.4.6-.7 1.3-.7 2 0 2 1.7 3.8 3.7 3.8M315 381H164.3c-2 0-3.7 1.6-3.7 3.6v118c0 2 1.6 3.7 3.7 3.7h48.5V432c0-2 1.6-3.6 3.7-3.6h45c2 0 3.7 1.6 3.7 3.7v74.3H315c2 0 3.7-1.7 3.7-3.7v-118c0-2-1.7-3.6-3.7-3.6M822.4 398.4c0 2-1.6 3.5-3.6 3.5h-44.6c-2 0-3.7-1.7-3.7-3.6v-27c0-2 1.7-3.7 3.7-3.7h44.6c2 0 3.6 1.6 3.6 3.6v27zm0 50c0 2-1.6 3.6-3.6 3.6h-44.6c-2 0-3.7-1.6-3.7-3.6v-27c0-2 1.7-3.6 3.7-3.6h44.6c2 0 3.6 1.6 3.6 3.5v27zm-68-50c0 2-1.7 3.5-3.8 3.5H706c-2 0-3.6-1.7-3.6-3.6v-27c0-2 1.7-3.7 3.7-3.7h44.6c2 0 3.7 1.6 3.7 3.6v27zm0 50c0 2-1.7 3.6-3.8 3.6H706c-2 0-3.6-1.6-3.6-3.6v-27c0-2 1.7-3.6 3.7-3.6h44.6c2 0 3.7 1.6 3.7 3.5v27zm81.5-98.3H686.6c-2 0-3.6 1.6-3.6 3.6v150.7c0 2 1.7 3.5 3.7 3.5H836c2 0 3.6-1.6 3.6-3.5V353.6c0-2-1.7-3.5-3.7-3.5zM468 107.5c0 1-1 2-2 2h-33.5c-1 0-2-1-2-2V70.2c0-1 1-2 2-2H466c1 0 2 1 2 2v37.3zm0 85.5c0 1-1 2-2 2h-33.5c-1 0-2-1-2-2v-37.2c0-1 1-2 2-2H466c1 0 2 1 2 2V193zm0 85.6c0 1-1 2-2 2h-33.5c-1 0-2-1-2-2v-37.3c0-1 1-2 2-2H466c1 0 2 1 2 2v37.3zm0 85.5c0 1.2-1 2-2 2h-33.5c-1 0-2-.8-2-2v-37c0-1.2 1-2 2-2H466c1 0 2 .8 2 2v37zm0 85.7c0 1-1 2-2 2h-33.5c-1 0-2-1-2-2v-37.3c0-1 1-2 2-2H466c1 0 2 1 2 2v37.3zm-65.7-342.2c0 1-1 2-2 2H367c-1 0-2-1-2-2V70.2c0-1 1-2 2-2h33.4c1 0 2 1 2 2v37.3zm0 85.5c0 1-1 2-2 2H367c-1 0-2-1-2-2v-37.2c0-1 1-2 2-2h33.4c1 0 2 1 2 2V193zm0 85.6c0 1-1 2-2 2H367c-1 0-2-1-2-2v-37.3c0-1 1-2 2-2h33.4c1 0 2 1 2 2v37.3zm0 85.5c0 1.2-1 2-2 2H367c-1 0-2-.8-2-2v-37c0-1.2 1-2 2-2h33.4c1 0 2 .8 2 2v37zm0 85.7c0 1-1 2-2 2H367c-1 0-2-1-2-2v-37.3c0-1 1-2 2-2h33.4c1 0 2 1 2 2v37.3zM489 .4H343.3c-2 0-3.6 1.6-3.6 3.6v499c0 2 1.6 3.5 3.6 3.5h146c2 0 3.5-1.6 3.5-3.6V4c0-2-1.6-3.6-3.6-3.6zM839.4 335c0 1.6-1.3 3-3 3H686.2c-1.6 0-3-1.4-3-3v-30c0-1.8 1.4-3 3-3h150.2c1.7 0 3 1.2 3 3v30M649 247c0 2-1.7 3.7-3.7 3.7h-43.5c-2 0-3.6-1.6-3.6-3.6v-27c0-2 1.6-3.7 3.6-3.7h43.5c2 0 3.6 1.6 3.6 3.6v27zm0 50.4c0 2-1.7 3.6-3.7 3.6h-43.5c-2 0-3.6-1.6-3.6-3.6v-27.2c0-2 1.6-3.6 3.6-3.6h43.5c2 0 3.6 1.6 3.6 3.6v27.2zm0 50.4c0 2-1.7 3.5-3.7 3.5h-43.5c-2 0-3.6-1.6-3.6-3.5v-27.3c0-2 1.6-3.6 3.6-3.6h43.5c2 0 3.6 1.5 3.6 3.5v27.3zm0 50.3c0 2-1.7 3.6-3.7 3.6h-43.5c-2 0-3.6-1.6-3.6-3.5V371c0-2 1.6-3.5 3.6-3.5h43.5c2 0 3.6 1.5 3.6 3.5V398zm0 50.4c0 2-1.7 3.6-3.7 3.6h-43.5c-2 0-3.6-1.6-3.6-3.6v-27.2c0-2 1.6-3.6 3.6-3.6h43.5c2 0 3.6 1.6 3.6 3.6v27.2zm-66.5-211v60c0 2-1.6 3.6-3.6 3.6h-43.6c-2 0-3.6-1.6-3.6-3.5V290c0-.6 0-1 .3-1.4l.3-.4c0-.2.2-.4.3-.5 0-.2.3-.4.4-.6 5.6-7.8 30.7-38.8 41.2-51.7l1-1.3c1-1 2-1.5 3.3-1.5 2 0 3.6 1.5 4 3.4v1.5zm0 110.4c0 2-1.7 3.5-3.7 3.5h-43.5c-2 0-3.6-1.6-3.6-3.5v-27.3c0-2 1.6-3.6 3.6-3.6h43.5c2 0 3.6 1.5 3.6 3.5v27.3zm0 50.3c0 2-1.7 3.6-3.7 3.6h-43.5c-2 0-3.6-1.6-3.6-3.5V371c0-2 1.6-3.5 3.6-3.5h43.5c2 0 3.6 1.5 3.6 3.5V398zm0 50.4c0 2-1.7 3.6-3.7 3.6h-43.5c-2 0-3.6-1.6-3.6-3.6v-27.2c0-2 1.6-3.6 3.6-3.6h43.5c2 0 3.6 1.6 3.6 3.6v27.2zm22.6-255l1-1.2c10-12.6 26.5-33 34.5-42.8l1-1.3c.8-.8 2-1.4 3.3-1.4 2 0 3.6 1.4 4 3.3v46c0 2.2-1.8 4-4 4h-.2-36-.2-.2c-2.2 0-4-1.8-4-4 0-1 .4-1.8 1-2.5zm60.5-98.7c-.5-1.7-2-2.8-3.7-2.8-.8 0-1.5.2-2 .6h-.4l-1.2 1.7-143.5 182-.6 1c-.7.6-1 1.6-1.2 2.7v223.7c0 2 1.6 3.5 3.6 3.5h146c1.8 0 3.4-1.6 3.4-3.5V96c0-.4 0-1-.3-1.3z"></path></g></svg>`,
        17: `<svg viewBox="0 0 1000 486"><g fill="currentColor" fill-rule="evenodd"><path d="M588.7 225.7c25.7-23.8 41.8-57.8 41.8-95.5 0-5.6-.4-11-1-16.6 52 5.6 92.8 49.8 92.8 103.4 0 30.5-13.2 57.8-34.2 77-19.5-37-56.2-63-99.3-68.3M677.2 355c0 57.3-46.7 104-104 104-18.7 0-36.2-5-51.4-13.7 22.2-23.3 35.8-54.8 35.8-89.5 0-8.5-.8-16.8-2.4-25 18.7 10.5 40.2 16.4 63 16.4 20.4 0 39.7-4.7 57-13 1.2 6.7 2 13.7 2 20.8m-354 .8c0-7.4 1-14.6 2.4-21.5 17.2 8.3 36.4 13 56.6 13 23 0 44.3-6 63-16.3-1.5 7.8-2.3 15.8-2.3 24 0 35 14 67 36.7 90.6-15.4 9-33.2 14.2-52.3 14.2-57.4 0-104-46.6-104-104M278 217c0-53.6 40.8-97.8 93-103.4-.8 5.5-1.2 11-1.2 16.6 0 38 16.4 72.4 42.6 96.3-43.3 5-80 31-100 67.6-21-19-34.4-46.4-34.4-77m222-190.8c42.7 0 79.3 25.8 95.4 62.6-42.3 7.4-77.6 35.4-95.4 73.2-17.6-37.8-53-65.8-95.3-73.2C421 52 457.5 26.2 500 26.2M525 262.8c14.4-7.5 30.8-12 48-12 41 0 76.4 24 93.4 58.3-14.4 7.7-30.8 12-48 12-41 0-76.4-23.8-93.4-58.2m-50 .7c-17 34-52 57.5-92.8 57.5-17.2 0-33.4-4.3-47.7-11.7 17-34 52.2-57.5 93-57.5 17 0 33.3 4.3 47.6 11.7m-77.4-149.3c50 7.5 88.7 50.7 88.7 102.8 0 5.5-.6 10.8-1.4 16-50.2-7.5-88.8-50.6-88.8-102.8 0-5.4.6-10.7 1.4-16m103 315.3c-19.3-19-31.5-45.3-31.5-74.5 0-28.8 12-55 30.8-73.7 19.4 19 31.6 45.3 31.6 74.5 0 28.8-11.7 54.8-30.7 73.7m103.6-299.3c0 52.2-38.6 95.3-88.7 102.8-.8-5.2-1.4-10.5-1.4-16 0-52 38.6-95.3 88.7-102.7.7 5.2 1.3 10.5 1.3 16M748.5 217c0-70.2-56-127.6-125.5-130-18-50.7-66-87-122.8-87-56.6 0-104.8 36.3-122.8 87C307.8 89.3 252 146.7 252 217c0 41.7 19.7 78.8 50.3 102.7-3.4 11.5-5.2 23.6-5.2 36 0 72 58.5 130.3 130.4 130.3 27.2 0 52.5-8.4 73.5-22.8 20.6 14 45.4 22 72 22 72 0 130.4-58.4 130.4-130.2 0-12.3-1.8-24.2-5-35.5 30.5-23.8 50-61 50-102.5"></path></g></svg>`
      };

      sdgsGrid.innerHTML = data.sdgs.map(sdg => `
        <a href="${sdg.link}" target="_blank" rel="noopener" class="sdgs-item text-[${sdg.color}]">
          <div class="mb-3 text-center font-black text-xl">SDG ${sdg.id}</div>
          ${svgs[sdg.id] || ''}
          <h4>${sdg.title}</h4>
          <p>${sdg.desc}</p>
        </a>
      `).join('');
    }
  }

  // Map Section Title
  if (data.map && data.map.title) {
    const mapSection = document.querySelector('section.mt-5.text-center');
    if (mapSection) {
      const mapTitle = mapSection.querySelector('.section-title');
      if (mapTitle) {
        mapTitle.textContent = data.map.title;
      }
    }
  }
})();
