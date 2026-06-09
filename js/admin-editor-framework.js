/**
 * admin-editor-framework.js
 * 
 * A lightweight framework for managing dynamic list-based editors in the admin panel.
 * Handles:
 * - Appending items
 * - Event delegation for Up/Down/Duplicate/Delete buttons
 * - Renumbering
 * - Input/Change event listener forwarding to trigger live updates
 */
(function() {
  function captureListAnimation(container) {
    const list = container;
    const before = Array.from(list.children).map(el => {
      const rect = el.getBoundingClientRect();
      return { el, top: rect.top, left: rect.left };
    });
    return function play() {
      requestAnimationFrame(() => {
        before.forEach(b => {
          if (!b.el.isConnected) return;
          const rect = b.el.getBoundingClientRect();
          const dy = b.top - rect.top;
          const dx = b.left - rect.left;
          if (dy !== 0 || dx !== 0) {
            b.el.style.transform = `translate(${dx}px, ${dy}px)`;
            b.el.style.transition = 'none';
            void b.el.offsetHeight; // reflow
            b.el.style.transform = '';
            b.el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
          }
        });
      });
    };
  }

  function flash(el) {
    if (!el) return;
    el.classList.add('transition-all', 'duration-300');
    el.style.boxShadow = '0 0 0 3px var(--primary-soft)';
    setTimeout(() => {
      el.style.boxShadow = '';
    }, 400);
  }

  class DynamicListEditor {
    constructor(config) {
      this.container = document.querySelector(config.containerSelector);
      this.addButton = document.querySelector(config.addButtonSelector);
      this.itemSelector = config.itemSelector || '[data-index]';
      this.template = config.template;
      this.defaultData = config.defaultData || (() => ({}));
      this.onInitItem = config.onInitItem || (() => {});
      this.onUpdate = config.onUpdate || (() => {});
      this.onRenumber = config.onRenumber || (() => {});
      this.insertMode = config.insertMode || 'append';
      
      this.init();
    }

    init() {
      if (!this.container) return;

      // Bind Add Button
      if (this.addButton) {
        this.addButton.addEventListener('click', (e) => {
          e.preventDefault();
          this.addItem();
        });
      }

      // Action Button Clicks (Up / Down / Duplicate / Delete) via Delegation
      this.container.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        const item = e.target.closest(this.itemSelector);
        if (!item || !this.container.contains(item)) return;

        const idx = Array.from(this.container.children).indexOf(item);
        const play = captureListAnimation(this.container);

        // Delete
        if (btn.classList.contains('action-del') || btn.classList.contains('ab-team-del') || btn.classList.contains('ab-model-del') || btn.classList.contains('ab-ach-del') || btn.classList.contains('sc-slide-del') || btn.classList.contains('sc-svc-del') || btn.classList.contains('pv-del') || btn.classList.contains('pv-tl-del') || btn.classList.contains('bl-del')) {
          item.remove();
          play();
          this.renumber();
          this.onUpdate();
          return;
        }

        // Move Up
        if (btn.classList.contains('action-up') || btn.classList.contains('ab-team-up') || btn.classList.contains('ab-model-up') || btn.classList.contains('ab-ach-up') || btn.classList.contains('sc-slide-up') || btn.classList.contains('sc-svc-up') || btn.classList.contains('pv-move-up') || btn.classList.contains('pv-tl-up') || btn.classList.contains('bl-move-up')) {
          if (idx > 0) {
            this.container.insertBefore(item, this.container.children[idx - 1]);
            play();
            this.renumber();
            flash(item);
            this.onUpdate();
          }
          return;
        }

        // Move Down
        if (btn.classList.contains('action-down') || btn.classList.contains('ab-team-down') || btn.classList.contains('ab-model-down') || btn.classList.contains('ab-ach-down') || btn.classList.contains('sc-slide-down') || btn.classList.contains('sc-svc-down') || btn.classList.contains('pv-move-down') || btn.classList.contains('pv-tl-down') || btn.classList.contains('bl-move-down')) {
          if (idx < this.container.children.length - 1) {
            this.container.insertBefore(this.container.children[idx + 1], item);
            play();
            this.renumber();
            flash(item);
            this.onUpdate();
          }
          return;
        }

        // Duplicate
        if (btn.classList.contains('action-dup') || btn.classList.contains('ab-team-dup') || btn.classList.contains('ab-model-dup') || btn.classList.contains('ab-ach-dup') || btn.classList.contains('sc-slide-dup') || btn.classList.contains('sc-svc-dup') || btn.classList.contains('pv-dup') || btn.classList.contains('pv-tl-dup')) {
          // Clone node and copy values
          const clone = item.cloneNode(true);
          
          // Re-sync input values since cloneNode doesn't copy current dynamic values of inputs
          const origInputs = item.querySelectorAll('input, textarea, select');
          const cloneInputs = clone.querySelectorAll('input, textarea, select');
          origInputs.forEach((inp, i) => {
            if (inp.type === 'checkbox' || inp.type === 'radio') {
              cloneInputs[i].checked = inp.checked;
            } else {
              cloneInputs[i].value = inp.value;
            }
          });

          this.container.insertBefore(clone, this.container.children[idx + 1]);
          play();
          this.renumber();
          
          // Re-bind listeners for uploads or custom logic inside cloned item
          this.bindItemListeners(clone, idx + 1);
          
          flash(clone);
          this.onUpdate();
          return;
        }
      });

      // Input Event Delegation
      this.container.addEventListener('input', (e) => {
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) {
          this.onUpdate();
        }
      });
      this.container.addEventListener('change', (e) => {
        this.onUpdate();
      });
    }

    addItem(data, silent = false) {
      const idx = this.container.children.length;
      const rowData = data || this.defaultData();
      const html = this.template(rowData, idx);
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html.trim();
      const itemEl = tempDiv.firstChild;
      
      if (this.insertMode === 'prepend') {
        this.container.insertBefore(itemEl, this.container.firstChild);
      } else {
        this.container.appendChild(itemEl);
      }
      this.renumber();
      this.bindItemListeners(itemEl, idx);
      if (!silent) {
        flash(itemEl);
        this.onUpdate();
      }
    }

    load(dataArray) {
      if (!this.container) return;
      this.container.innerHTML = '';
      const arr = Array.isArray(dataArray) ? dataArray : [];
      arr.forEach((data, idx) => {
        const rowData = data || this.defaultData();
        const html = this.template(rowData, idx);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html.trim();
        const itemEl = tempDiv.firstChild;
        this.container.appendChild(itemEl);
        this.bindItemListeners(itemEl, idx);
      });
      this.renumber();
    }

    collect(mapFn) {
      if (!this.container) return [];
      const items = Array.from(this.container.children);
      if (typeof mapFn === 'function') {
        return items.map((el, idx) => mapFn(el, idx));
      }
      return items;
    }

    bindItemListeners(itemEl, idx) {
      this.onInitItem(itemEl, idx);
    }

    renumber() {
      Array.from(this.container.children).forEach((el, i) => {
        el.dataset.index = String(i);
        const idxLabel = el.querySelector('.item-idx, .case-idx, .team-idx, .slide-idx, .svc-idx');
        if (idxLabel) idxLabel.textContent = String(i + 1);
      });
      this.onRenumber(this.container);
    }
  }

  window.initDynamicListEditor = function(config) {
    return new DynamicListEditor(config);
  };
})();
