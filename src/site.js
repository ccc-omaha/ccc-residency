// CCC Church Residency: small progressive enhancements. Everything works without it.
(() => {
  // reveal on scroll
  const els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
  } else els.forEach(el => el.classList.add('in'));

  // close the mobile menu after picking a link
  document.querySelectorAll('.menu a').forEach(a => a.addEventListener('click', () => a.closest('details').removeAttribute('open')));

  // resident profiles
  const dlg = document.getElementById('profile');
  if (dlg) {
    const body = dlg.querySelector('.pf');
    document.querySelectorAll('[data-profile]').forEach(btn => btn.addEventListener('click', () => {
      const tpl = document.getElementById(btn.dataset.profile);
      if (!tpl) return;
      body.replaceChildren(tpl.content.cloneNode(true));
      dlg.showModal();
      dlg.querySelector('.close').focus();
    }));
    dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('.close')) dlg.close(); });
  }

  // click-to-play Vimeo
  document.querySelectorAll('.vid button[data-src]').forEach(b => b.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = b.dataset.src; f.allow = 'autoplay; fullscreen; picture-in-picture'; f.allowFullscreen = true; f.title = b.getAttribute('aria-label');
    b.replaceWith(f);
  }));

  // Stepped application with on-device autosave
  document.querySelectorAll('form.stepped').forEach(form => {
    const steps = [...form.querySelectorAll('.step')];
    const prev = form.querySelector('[data-prev]'), next = form.querySelector('[data-next]'), submit = form.querySelector('button[type=submit]');
    const bar = form.querySelector('.progress-bar span'), stepLbl = form.querySelector('.progress-step'), titleLbl = form.querySelector('.progress-title');
    const KEY = form.dataset.save, savedAt = form.querySelector('.saved-at');
    const skip = new Set(['form-name', 'subject', 'bot-field']);
    let cur = 0;
    form.classList.add('js-steps');
    form.noValidate = true;

    const store = {
      get() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); return d && Date.now() - d.t < 1000 * 60 * 60 * 24 * 90 ? d : null; } catch (e) { return null; } },
      set(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } },
      clear() { try { localStorage.removeItem(KEY); } catch (e) {} }
    };
    const collect = () => {
      const v = {};
      form.querySelectorAll('input[name], select[name], textarea[name]').forEach(el => {
        if (skip.has(el.name)) return;
        v[el.name] = el.type === 'checkbox' ? el.checked : el.value;
      });
      return v;
    };
    let timer;
    const save = () => { clearTimeout(timer); timer = setTimeout(() => {
      if (store.set({ t: Date.now(), step: cur, v: collect() }) && savedAt) savedAt.textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '.';
    }, 400); };

    // show "Other" and "Worship Arts" follow-ups only when picked
    const choices = [...form.querySelectorAll('select[name^="area-"]')];
    const conditional = () => {
      const picked = choices.map(s => s.value);
      form.querySelectorAll('[data-show-if]').forEach(box => {
        const on = picked.includes(box.dataset.showIf);
        box.hidden = !on;
        box.querySelectorAll('input,select,textarea').forEach(el => el.disabled = !on);
      });
    };

    const show = i => {
      cur = Math.max(0, Math.min(i, steps.length - 1));
      steps.forEach((s, j) => s.hidden = j !== cur);
      prev.hidden = cur === 0;
      next.hidden = cur === steps.length - 1;
      submit.hidden = cur !== steps.length - 1;
      stepLbl.textContent = `Step ${cur + 1} of ${steps.length}`;
      titleLbl.textContent = steps[cur].dataset.title;
      bar.style.width = ((cur + 1) / steps.length * 100) + '%';
    };
    const valid = () => {
      for (const el of steps[cur].querySelectorAll('input,select,textarea')) {
        if (!el.disabled && !el.checkValidity()) { el.reportValidity(); el.focus(); return false; }
      }
      return true;
    };
    const go = i => { show(i); save(); form.scrollIntoView({ behavior: 'smooth', block: 'start' }); const f = steps[cur].querySelector('input:not([type=hidden]),select,textarea'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 350); };
    next.addEventListener('click', () => { if (valid()) go(cur + 1); });
    prev.addEventListener('click', () => go(cur - 1));

    // restore
    const saved = store.get();
    if (saved) {
      Object.entries(saved.v || {}).forEach(([k, val]) => {
        form.querySelectorAll(`[name="${CSS.escape(k)}"]`).forEach(el => { if (el.type === 'checkbox') el.checked = !!val; else el.value = val; });
      });
      const note = form.querySelector('.resume-note');
      if (Object.values(saved.v || {}).some(v => v)) note.hidden = false;
      cur = saved.step || 0;
    }
    const today = form.querySelector('input[name="signed-date"]');
    if (today && !today.value) { const d = new Date(); today.value = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
    conditional();
    show(cur);
    form.addEventListener('input', save);
    form.addEventListener('change', e => { if (e.target.name && e.target.name.startsWith('area-')) conditional(); save(); });
    // two taps to start over, so nobody wipes their answers by accident
    const reset = form.querySelector('[data-reset]');
    reset.addEventListener('click', () => {
      if (reset.dataset.armed) { store.clear(); location.reload(); return; }
      reset.dataset.armed = '1'; reset.textContent = 'Tap again to erase your answers';
      setTimeout(() => { delete reset.dataset.armed; reset.textContent = 'Start over'; }, 4000);
    });
    form.addEventListener('submit', e => { if (!valid()) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    form.addEventListener('residency:sent', () => store.clear());
  });

  // Netlify forms without leaving the page
  document.querySelectorAll('form.f').forEach(form => form.addEventListener('submit', async e => {
    e.preventDefault();
    const status = form.querySelector('.status');
    const btn = form.querySelector('button[type=submit]');
    const files = form.querySelectorAll('input[type=file]');
    let total = 0; files.forEach(i => [...i.files].forEach(f => total += f.size));
    if (total > 8 * 1024 * 1024) { status.textContent = 'Those files add up to more than 8 MB. Please save smaller versions and try again.'; status.className = 'status err'; return; }
    btn.disabled = true; const label = btn.innerHTML; btn.textContent = 'Sending…';
    status.textContent = ''; status.className = 'status';
    try {
      const data = new FormData(form);
      const opts = files.length ? { method: 'POST', body: data }
        : { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() };
      const res = await fetch('/', opts);
      if (!res.ok) throw new Error(res.status);
      form.classList.add('sent');
      form.dispatchEvent(new Event('residency:sent'));
      form.querySelector('.done').focus();
    } catch (err) {
      status.textContent = 'Something went wrong sending that. Please try again, or email residency@cccomaha.org.';
      status.className = 'status err';
      btn.disabled = false; btn.innerHTML = label;
    }
  }));
})();
