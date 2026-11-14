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
      form.querySelector('.done').focus();
    } catch (err) {
      status.textContent = 'Something went wrong sending that. Please try again, or email residency@cccomaha.org.';
      status.className = 'status err';
      btn.disabled = false; btn.innerHTML = label;
    }
  }));
})();
