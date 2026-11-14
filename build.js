// Builds every page of cccresidency.org from src/template.html + content/*.json.
// Staff edit content/*.json in Pages CMS. Netlify runs `node build.js` on every deploy.
// Never hand-edit the generated .html files; edit src/ or content/ and rebuild.
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const SITE_URL = 'https://cccresidency.org';
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', f + '.json'), 'utf8'));
const c = Object.fromEntries(['site', 'seo', 'home', 'program', 'apply', 'host', 'residents'].map(s => [s, read(s)]));
const cohorts = fs.readdirSync(path.join(ROOT, 'content/cohorts')).filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(ROOT, 'content/cohorts', f), 'utf8')))
  .filter(x => x.year && Array.isArray(x.people) && x.people.length)
  .sort((a, b) => b.year - a.year);

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// keep the last two words together so nothing ends on one orphaned word
const tie = s => String(s).replace(/ ([^\s<>]{1,14}(?:<\/[a-z]+>)*)$/, '&nbsp;$1');
const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*(.+?)\*/g, '<em>$1</em>')
  .replace(/\[(.+?)\]\(((?:https?:\/\/|mailto:|tel:|\/|#)[^\s)]*)\)/g, (m, t, u) => `<a href="${u}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`);
const fmt = s => tie(inline(s));
const txt = s => tie(esc(s));
const ext = u => /^https?:/.test(u || '') ? ' target="_blank" rel="noopener"' : '';
const icon = (id, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const color = n => 'c-' + String(n || 'Blue').toLowerCase();
const CROP = { 'Top': 'center top', 'Upper third': 'center 30%', 'Center': 'center', 'Lower third': 'center 70%', 'Bottom': 'center bottom' };
const slug = s => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const src = p => '/' + String(p || '').replace(/^\//, '');
// serve WebP when it exists next to the photo
const pic = (p, alt, w, h, attrs = '', style = '') => {
  const s = src(p);
  const webp = s.replace(/\.(jpe?g|png)$/i, '.webp');
  const has = webp !== s && fs.existsSync(path.join(ROOT, webp));
  const st = style ? ` style="${style}"` : '';
  return `<picture>${has ? `<source type="image/webp" srcset="${esc(webp)}">` : ''}<img src="${esc(s)}" alt="${esc(alt)}" width="${w}" height="${h}" loading="lazy" decoding="async"${attrs}${st}></picture>`;
};
const head = (x, id, cls = '') => `
      <div class="sec-head${cls}">
        ${x.eyebrow ? `<p class="eyebrow">${txt(x.eyebrow)}</p>` : ''}
        <h2 id="${id}">${txt(x.heading)}</h2>
        ${x.text ? `<p>${fmt(x.text)}</p>` : ''}
      </div>`;
const btn = (label, link, cls = '') => label && link ? `<a class="btn ${cls}" href="${esc(link)}"${ext(link)}>${txt(label)} ${icon('arrow')}</a>` : '';
const vimeo = u => { const m = String(u || '').match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-z0-9]+))?(?:.*[?&]h=([a-z0-9]+))?/i); return m ? { id: m[1], h: m[2] || m[3] || '' } : null; };

// ---------- residents (derived) ----------
const now = new Date();
const academicYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1; // cohorts start in August
const isCurrent = y => y >= academicYear - 1 && y <= academicYear;
const current = cohorts.filter(x => isCurrent(x.year));
const past = cohorts.filter(x => !isCurrent(x.year) && x.year < academicYear);
const totalResidents = cohorts.reduce((n, x) => n + x.people.length, 0);
const firstYear = cohorts.length ? cohorts[cohorts.length - 1].year : '';
const yearOf = y => academicYear - y + 1;
const profiles = [];
const pid = (y, p) => `p-${y}-${slug(p.name)}`;
const L = c.residents.labels;
const resCard = (y, p, i) => {
  const id = pid(y, p);
  const pos = CROP[p.crop] || 'center';
  profiles.push(`<template id="${id}">
  <button class="close" type="button" aria-label="Close">${icon('x')}</button>
  ${pic(p.photo, p.name, 560, 700, '', `object-position:${pos}`)}
  <div class="pf-body">
    <h2>${txt(p.name)}</h2>
    ${p.focus ? `<span class="focus">${txt(p.focus)}</span>` : ''}
    <dl>
      ${p.hometown ? `<div><dt>${esc(L.hometown)}</dt><dd>${txt(p.hometown)}</dd></div>` : ''}
      ${p.college ? `<div><dt>${esc(L.college)}</dt><dd>${txt(p.college)}</dd></div>` : ''}
      ${p.calling ? `<div><dt>${esc(L.calling)}</dt><dd>${fmt(p.calling)}</dd></div>` : ''}
      ${p.food || p.drink ? `<div class="fun">${p.food ? `<div><dt>${esc(L.food)}</dt><dd>${txt(p.food)}</dd></div>` : ''}${p.drink ? `<div><dt>${esc(L.drink)}</dt><dd>${txt(p.drink)}</dd></div>` : ''}</div>` : ''}
    </dl>
  </div>
</template>`);
  return `<li class="res-card reveal" style="--d:${(i % 6) * 60}ms">
          <button type="button" data-profile="${id}" aria-label="More about ${esc(p.name)}">
            <span class="ph">${pic(p.photo, p.name, 560, 700, '', `object-position:${pos}`)}<span class="more">${icon('plus')}</span></span>
            <h3>${txt(p.name)}</h3>
            ${p.focus ? `<span class="focus">${txt(p.focus)}</span>` : ''}
            ${p.hometown ? `<span class="home">${txt(p.hometown)}</span>` : ''}
          </button>
        </li>`;
};
const cohortBlock = (x, H = 'h2') => `
      <div class="cohort">
        <div class="cohort-head"><${H}>${esc(x.year)} cohort</${H}>${isCurrent(x.year) ? `<span class="tag">Year ${yearOf(x.year)}</span>` : ''}</div>
        <ul class="res-grid">
${x.people.map((p, i) => resCard(x.year, p, i)).join('\n')}
        </ul>
      </div>`;
const dialog = () => profiles.length ? `<dialog id="profile" class="profile" aria-label="Resident profile"><div class="pf"></div></dialog>\n${profiles.splice(0).join('\n')}` : '';

// ---------- shared pieces ----------
const NAV = [['Program', '/program/'], ['Residents', '/residents/'], ['Host a Resident', '/host-families/']];
const nav = cur => NAV.map(([t, u]) => `<a href="${u}"${cur === u ? ' aria-current="page"' : ''}>${t}</a>`).join('') + `<a class="btn" href="/apply/"${cur === '/apply/' ? ' aria-current="page"' : ''}>Apply</a>`;
const S = c.site;
const banner = S.banner && S.banner.show && S.banner.text ? `<div class="banner">${fmt(S.banner.text)}${S.banner.linkText && S.banner.link ? ` <a href="${esc(S.banner.link)}"${ext(S.banner.link)}>${txt(S.banner.linkText)}</a>` : ''}</div>` : '';
const tel = p => 'tel:+1' + String(p).replace(/\D/g, '').replace(/^1/, '');
const contact = [
  S.email && `<li><a href="mailto:${esc(S.email)}">${esc(S.email)}</a></li>`,
  S.phone && `<li><a href="${tel(S.phone)}">${esc(S.phone)}</a></li>`,
  S.address && `<li><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(S.address)}" target="_blank" rel="noopener">${esc(S.address)}</a></li>`,
  S.instagram && `<li><a href="${esc(S.instagram)}" target="_blank" rel="noopener">Instagram</a></li>`
].filter(Boolean).join('');
const footerNav = [...NAV, ['Apply', '/apply/'], ['Ask a question', '/apply/#contact']].map(([t, u]) => `<li><a href="${u}">${t}</a></li>`).join('');
const markSvg = fs.readFileSync(path.join(ROOT, 'images/site/logo-mark.svg'), 'utf8');
const markViewBox = markSvg.match(/viewBox="([^"]+)"/)[1];
const markPath = markSvg.match(/ d="([^"]+)"/)[1];
const tpl = fs.readFileSync(path.join(ROOT, 'src/template.html'), 'utf8');
const version = Date.now().toString(36);

const pages = [];
const page = (route, key, main, extra = {}) => {
  const seo = { ...(c.seo.pages[key] || c.seo.pages.home), ...(extra.seo || {}) };
  const vals = {
    title: esc(seo.title), description: esc(seo.description), url: SITE_URL + route, siteName: esc(c.seo.siteName),
    image: SITE_URL + src(c.seo.shareImage), version, bodyClass: 'pg-' + key, banner, nav: nav(route), main,
    footerText: fmt(S.footerText), footerNav, contact, year: now.getFullYear(), markViewBox, markPath,
    dialog: dialog(), schema: extra.schema || ''
  };
  const html = tpl.replace(/{{(\w+)}}/g, (m, k) => vals[k] ?? '');
  const out = route === '/404' ? '404.html' : path.join(route.replace(/^\//, ''), 'index.html');
  fs.mkdirSync(path.join(ROOT, path.dirname(out)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, out), html);
  if (route !== '/404' && route !== '/thanks/') pages.push(route);
};

// ---------- home ----------
const H = c.home;
const heroPeople = current.flatMap(x => x.people).slice(0, 6);
const applySteps = (steps, cls = '') => `<ol class="steps${cls}">
${steps.map((s, i) => `          <li class="reveal" style="--d:${i * 80}ms"><h3>${txt(s.title)}</h3><p>${fmt(s.text)}</p>${s.buttonText && s.file ? `<a class="${/^#/.test(s.file) ? 'link' : 'dl-btn'}" href="${esc(s.file)}"${/\.(docx?|pdf)$/i.test(s.file) ? ' download' : ext(s.file)}>${txt(s.buttonText)} ${icon(/^#/.test(s.file) ? 'arrow' : 'down')}</a>` : ''}</li>`).join('\n')}
        </ol>`;
page('/', 'home', `
  <section class="hero" aria-labelledby="hero-h">
    <div class="rings" aria-hidden="true"></div>
    <div class="wrap hero-grid">
      <div>
        <p class="eyebrow">${txt(H.hero.eyebrow)}</p>
        <h1 id="hero-h">${txt(H.hero.heading)} <span class="accent">${txt(H.hero.headingAccent)}</span></h1>
        <p class="lead">${fmt(H.hero.text)}</p>
        <div class="btns">${btn(H.hero.primaryButton, H.hero.primaryLink)}${btn(H.hero.secondaryButton, H.hero.secondaryLink, 'ghost')}</div>
      </div>
      <div class="mosaic" aria-label="Current residents">
        ${heroPeople.map((p, i) => `<figure>${pic(p.photo, p.name, 560, 700, i < 3 ? ' fetchpriority="high" loading="eager"' : '', `object-position:${CROP[p.crop] || 'center'}`).replace(' loading="lazy"', i < 3 ? '' : ' loading="lazy"')}</figure>`).join('\n        ')}
        <div class="sticker" aria-hidden="true"><span><b>${totalResidents}</b>residents<br>since ${firstYear}</span></div>
      </div>
    </div>
  </section>

  <section class="facts" aria-label="The residency at a glance">
    <ul class="wrap">
${H.facts.map((f, i) => `      <li class="reveal" style="--d:${i * 70}ms"><span class="num">${esc(f.number)}${f.unit ? ` <small>${esc(f.unit)}</small>` : ''}</span><p>${txt(f.label)}</p></li>`).join('\n')}
    </ul>
  </section>

  <section class="sec" aria-labelledby="pillars-h">
    <div class="wrap">${head(H.pillars, 'pillars-h')}
      <div class="grid-3">
${H.pillars.items.map((x, i) => `        <article class="pillar ${color(x.color)} reveal" style="--d:${i * 90}ms"><span class="n">${i + 1}</span><h3>${txt(x.title)}</h3><p>${fmt(x.text)}</p></article>`).join('\n')}
      </div>
    </div>
  </section>

  <section class="sec on-cream" aria-labelledby="who-h">
    <div class="wrap who">
      <div class="photo reveal">${pic('/images/site/worship-stage.jpg', 'A worship leader singing on an outdoor stage at a CCC event', 1800, 1200)}<div class="rings" aria-hidden="true"></div></div>
      <div>
        <p class="eyebrow">${txt(H.who.eyebrow)}</p>
        <h2 id="who-h">${txt(H.who.heading)}</h2>
        <p class="lead">${fmt(H.who.text)}</p>
        <ul class="checks">${H.who.points.map(p => `<li>${icon('check')}<span>${fmt(p)}</span></li>`).join('')}</ul>
        ${H.who.note ? `<p class="note">${icon('info')}<span>${fmt(H.who.note)}</span></p>` : ''}
      </div>
    </div>
  </section>

  <section class="sec" aria-labelledby="focus-h">
    <div class="wrap">${head(H.focus, 'focus-h')}
      <ul class="chips">${c.program.areas.items.map(a => `<li class="${color(a.color)}">${txt(a.title)}</li>`).join('')}</ul>
      <p style="margin-top:32px"><a class="link" href="/program/#areas">${txt(H.focus.linkText)} ${icon('arrow')}</a></p>
    </div>
  </section>

  <section class="sec on-dark" aria-labelledby="res-h">
    <div class="wrap">${head(H.residents, 'res-h')}
${current.map(x => cohortBlock(x, 'h3')).join('\n')}
      <p style="margin-top:44px"><a class="btn orange" href="/residents/">${txt(H.residents.linkText)} ${icon('arrow')}</a></p>
    </div>
  </section>

  <section class="sec on-cream" aria-labelledby="apply-h">
    <div class="wrap">${head(H.apply, 'apply-h')}
        ${applySteps(c.apply.steps)}
      <p style="margin-top:36px">${btn(H.apply.buttonText, '/apply/#application')}</p>
    </div>
  </section>

  <section class="sec closing" aria-labelledby="close-h">
    <div class="rings" aria-hidden="true"></div>
    <div class="wrap closing-grid">
      <div>
        <h2 id="close-h">${txt(H.closing.heading)}</h2>
        <p class="lead">${fmt(H.closing.text)}</p>
        <div class="btns">${btn(H.closing.primaryButton, H.closing.primaryLink)}${btn(H.closing.secondaryButton, H.closing.secondaryLink, 'ghost')}</div>
      </div>
      <div class="reveal">${pic(H.closing.photo, H.closing.photoAlt, 1800, 1200)}</div>
    </div>
  </section>`, {
  schema: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'EducationalOccupationalProgram', name: c.seo.siteName, description: c.seo.pages.home.description, url: SITE_URL, timeToComplete: 'P2Y', provider: { '@type': 'Organization', name: 'Christ Community Church', url: 'https://cccomaha.org', address: S.address } })}</script>`
});

// ---------- program ----------
const P = c.program;
const maxHours = Math.max(...P.week.items.map(x => Number(x.max) || 0), 1);
page('/program/', 'program', `
  <section class="intro" aria-labelledby="intro-h">
    <div class="rings" aria-hidden="true"></div>
    <div class="wrap">
      <p class="eyebrow">${txt(P.intro.eyebrow)}</p>
      <h1 id="intro-h">${txt(P.intro.heading)}</h1>
      <p class="lead">${fmt(P.intro.text)}</p>
      <nav class="subnav" aria-label="On this page"><a href="#week">Your week</a><a href="#develop">What you'll develop</a><a href="#areas">Areas of focus</a><a href="#degrees">Degrees</a><a href="#money">Cost and support</a><a href="#team">Team</a></nav>
    </div>
  </section>

  <section class="sec on-dark" id="week" aria-labelledby="week-h">
    <div class="wrap">${head(P.week, 'week-h')}
      <div class="week">
${P.week.items.map(x => `        <div class="bar ${color(x.color)} reveal"><div class="lbl"><b>${esc(x.hours)}</b><span>hrs / ${txt(x.label)}</span></div><div class="track"><div class="fill" style="--w:${Math.round((Number(x.max) || maxHours) / maxHours * 100)}%">${fmt(x.text)}</div></div></div>`).join('\n')}
      </div>
      ${P.week.note ? `<p class="muted" style="margin-top:28px">${fmt(P.week.note)}</p>` : ''}
    </div>
  </section>

  <section class="sec on-cream" id="develop" aria-labelledby="dev-h">
    <div class="wrap">${head(P.development, 'dev-h')}
      <div class="grid-3">
${P.development.items.map((x, i) => `        <article class="dev ${color(x.color)} reveal" style="--d:${i * 90}ms"><h3>${txt(x.title)}</h3><ul>${x.points.map(p => `<li>${fmt(p)}</li>`).join('')}</ul></article>`).join('\n')}
      </div>
    </div>
  </section>

  <section class="sec" id="areas" aria-labelledby="areas-h">
    <div class="wrap">${head(P.areas, 'areas-h')}
      <ul class="areas">
${P.areas.items.map((x, i) => `        <li class="${color(x.color)} reveal" style="--d:${(i % 3) * 70}ms"><h3>${txt(x.title)}</h3><p>${fmt(x.text)}</p></li>`).join('\n')}
      </ul>
      ${P.areas.note ? `<p class="note" style="margin-top:24px">${icon('info')}<span>${fmt(P.areas.note)}</span></p>` : ''}
    </div>
  </section>

  <section class="sec on-cream" id="degrees" aria-labelledby="deg-h">
    <div class="wrap">${head(P.degrees, 'deg-h')}
      <div class="degrees">
${P.degrees.groups.map(g => `        <div class="deg reveal"><h3>${txt(g.label)}</h3><ul>${g.items.map(i => `<li>${fmt(i)}</li>`).join('')}</ul></div>`).join('\n')}
      </div>
      ${P.degrees.linkText && P.degrees.link ? `<p style="margin-top:28px"><a class="link" href="${esc(P.degrees.link)}"${ext(P.degrees.link)}>${txt(P.degrees.linkText)} ${icon('ext')}</a></p>` : ''}
    </div>
  </section>

  <section class="sec on-dark" id="money" aria-labelledby="money-h">
    <div class="wrap">${head(P.money, 'money-h')}
      <ul class="money">
${P.money.items.map((x, i) => `        <li class="reveal" style="--d:${i * 60}ms"><h3>${txt(x.title)}</h3><p>${fmt(x.text)}</p></li>`).join('\n')}
      </ul>
    </div>
  </section>

  <section class="sec on-cream" id="team" aria-labelledby="team-h">
    <div class="wrap">${head(P.team, 'team-h')}
      <ul class="team">
${P.team.people.map((x, i) => `        <li class="${['c-blue', 'c-magenta', 'c-orange', 'c-purple'][i % 4]}"><span class="av" aria-hidden="true">${esc(x.name.split(/\s+/).map(w => w[0]).slice(0, 2).join(''))}</span><span><b>${txt(x.name)}</b><span>${txt(x.role)}</span></span></li>`).join('\n')}
      </ul>
      <div class="btns">${btn('Apply now', '/apply/')}${btn('Ask a question', '/apply/#contact', 'ghost')}</div>
    </div>
  </section>`);

// ---------- residents ----------
const R = c.residents;
const fill = s => String(s).replace('{residents}', totalResidents).replace('{cohorts}', cohorts.length).replace('{first}', firstYear);
page('/residents/', 'residents', `
  <section class="intro" aria-labelledby="intro-h">
    <div class="rings" aria-hidden="true"></div>
    <div class="wrap">
      <p class="eyebrow">${txt(R.intro.eyebrow)}</p>
      <h1 id="intro-h">${txt(R.intro.heading)}</h1>
      <p class="lead">${fmt(fill(R.intro.text))}</p>
    </div>
  </section>

  <section class="sec" aria-labelledby="now-h">
    <div class="wrap">
      <h2 id="now-h" class="sr-only">${txt(R.current.heading)}</h2>
${current.map(x => cohortBlock(x)).join('\n')}
    </div>
  </section>

  <section class="sec on-cream" aria-labelledby="past-h">
    <div class="wrap">${head({ heading: R.past.heading, text: R.past.text }, 'past-h')}
      <ul class="past-grid">
${past.map((x, i) => `        <li class="reveal ${['c-blue', 'c-orange', 'c-magenta', 'c-purple'][i % 4]}" style="--d:${(i % 4) * 60}ms"><a href="/residents/${x.year}/"><span class="thumbs" aria-hidden="true">${x.people.slice(0, 4).map(p => pic(p.photo, '', 560, 700, '', `object-position:${CROP[p.crop] || 'center'}`)).join('')}</span><span class="y">${esc(x.year)} cohort <small>${x.people.length} residents</small></span></a></li>`).join('\n')}
      </ul>
    </div>
  </section>`);

cohorts.forEach((x, i) => {
  const newer = cohorts[i - 1], older = cohorts[i + 1];
  page(`/residents/${x.year}/`, 'residents', `
  <section class="intro" aria-labelledby="intro-h">
    <div class="rings" aria-hidden="true"></div>
    <div class="wrap">
      <p class="eyebrow"><a href="/residents/" style="color:inherit">Residents</a></p>
      <h1 id="intro-h">The ${esc(x.year)} cohort</h1>
      <p class="lead">${x.people.length} residents${isCurrent(x.year) ? `, now in year ${yearOf(x.year)}` : `, ${esc(x.year)} to ${esc(x.year + 2)}`}. Tap a photo to read their story.</p>
    </div>
  </section>
  <section class="sec" aria-label="${esc(x.year)} residents">
    <div class="wrap">
      <ul class="res-grid">
${x.people.map((p, j) => resCard(x.year, p, j)).join('\n')}
      </ul>
      <nav class="cohort-nav" aria-label="Other cohorts">
        ${newer ? `<a class="link" href="/residents/${newer.year}/">&larr; ${esc(newer.year)} cohort</a>` : '<span></span>'}
        ${older ? `<a class="link" href="/residents/${older.year}/">${esc(older.year)} cohort ${icon('arrow')}</a>` : ''}
      </nav>
    </div>
  </section>`, { seo: { title: `${x.year} Cohort | CCC Church Residency`, description: `Meet the ${x.year} CCC Church Residency cohort: ${x.people.map(p => p.name).join(', ')}.` } });
});

// ---------- host families ----------
const HO = c.host;
page('/host-families/', 'host', `
  <section class="intro" aria-labelledby="intro-h">
    <div class="rings" aria-hidden="true"></div>
    <div class="wrap intro-grid">
      <div>
        <p class="eyebrow">${txt(HO.intro.eyebrow)}</p>
        <h1 id="intro-h">${txt(HO.intro.heading)}</h1>
        <p class="lead">${fmt(HO.intro.text)}</p>
        <div class="btns">${btn(HO.intro.buttonText, HO.intro.link)}${btn('How it works', '#steps', 'ghost')}</div>
      </div>
      <div>${pic(HO.intro.photo, HO.intro.photoAlt, 1800, 1200, ' loading="eager"').replace(' loading="lazy"', '')}</div>
    </div>
  </section>

  <section class="sec" aria-labelledby="stab-h">
    <div class="wrap split">
      <div>
        <h2 id="stab-h">${txt(HO.stability.heading)}</h2>
        <p class="lead">${fmt(HO.stability.text)}</p>
      </div>
      <div class="videos" style="grid-template-columns:1fr">
${HO.video.items.slice(0, 1).map(v => videoFig(v)).join('\n')}
      </div>
    </div>
  </section>

  <section class="sec on-cream" aria-labelledby="hosts-h">
    <div class="wrap">${head(HO.hosts, 'hosts-h')}
      <ul class="asks">
${HO.hosts.items.map((x, i) => `        <li class="${['c-blue', 'c-orange', 'c-magenta', 'c-purple', 'c-aqua'][i % 5]} reveal" style="--d:${(i % 3) * 70}ms"><h3>${txt(x.title)}</h3><p>${fmt(x.text)}</p></li>`).join('\n')}
      </ul>
    </div>
  </section>

  <section class="sec" aria-label="Residents and the residency team">
    <div class="wrap split">
      <div><h2>${txt(HO.residents.heading)}</h2><ul class="plain c-orange">${HO.residents.points.map(p => `<li>${fmt(p)}</li>`).join('')}</ul></div>
      <div><h2>${txt(HO.staff.heading)}</h2><ul class="plain c-blue">${HO.staff.points.map(p => `<li>${fmt(p)}</li>`).join('')}</ul></div>
    </div>
  </section>

  <section class="sec on-cream" id="steps" aria-labelledby="steps-h">
    <div class="wrap">${head(HO.steps, 'steps-h')}
      <ol class="steps">
${HO.steps.items.map((s, i) => `        <li class="reveal" style="--d:${i * 80}ms"><h3>${txt(s.title)}</h3><p>${fmt(s.text)}</p>${s.buttonText && s.link ? `<a class="dl-btn" href="${esc(s.link)}"${/\.pdf$/i.test(s.link) ? ' download' : ext(s.link)}>${txt(s.buttonText)} ${icon(/\.pdf$/i.test(s.link) ? 'down' : 'ext')}</a>` : ''}</li>`).join('\n')}
      </ol>
      ${HO.steps.note ? `<p class="note" style="margin-top:28px">${icon('info')}<span>${fmt(HO.steps.note)}</span></p>` : ''}
    </div>
  </section>

  ${HO.video.items.length > 1 ? `<section class="sec" aria-labelledby="vid-h">
    <div class="wrap split" style="align-items:center">
      <div><h2 id="vid-h">${txt(HO.video.heading)}</h2>${HO.video.text ? `<p class="lead">${fmt(HO.video.text)}</p>` : ''}</div>
      <div class="videos" style="grid-template-columns:1fr">
${HO.video.items.slice(1).map(v => videoFig(v)).join('\n')}
      </div>
    </div>
  </section>` : ''}

  <section class="sec" id="support" style="padding-top:0" aria-labelledby="support-h">
    <div class="wrap">
      <div class="support">
        <div class="rings" aria-hidden="true"></div>
        <div>
          <p class="eyebrow">${txt(HO.support.eyebrow)}</p>
          <h2 id="support-h">${txt(HO.support.heading)}</h2>
          <p class="lead" style="margin:0">${fmt(HO.support.text)}</p>
        </div>
        <div>${btn(HO.support.buttonText, HO.support.link)}</div>
      </div>
    </div>
  </section>`);
function videoFig(v) {
  const m = vimeo(v.link);
  if (!m) return '';
  const q = `${m.h ? `h=${m.h}&` : ''}autoplay=1&title=0&byline=0&portrait=0`;
  return `        <figure class="vid"><div class="frame"><button type="button" data-src="https://player.vimeo.com/video/${m.id}?${q}" aria-label="Play video: ${esc(v.title)}">${pic(v.poster, '', 1280, 720)}<span class="play"><svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg></span></button></div><figcaption>${txt(v.title)}</figcaption></figure>`;
}

// ---------- apply ----------
const A = c.apply;
const field = (name, label, opts = {}) => {
  const id = (opts.form || 'f') + '-' + name;
  const req = opts.required ? ' required' : '';
  const star = opts.required ? ' <span class="req" aria-hidden="true">*</span>' : '';
  const hint = opts.hint ? `<span class="hint" id="${id}-h">${esc(opts.hint)}</span>` : '';
  const desc = opts.hint ? ` aria-describedby="${id}-h"` : '';
  let input;
  if (opts.options) input = `<select id="${id}" name="${name}"${req}${desc}><option value="">Choose one</option>${opts.options.map(o => `<option>${esc(o)}</option>`).join('')}</select>`;
  else if (opts.type === 'textarea') input = `<textarea id="${id}" name="${name}"${req}${desc}></textarea>`;
  else input = `<input id="${id}" name="${name}" type="${opts.type || 'text'}"${opts.auto ? ` autocomplete="${opts.auto}"` : ''}${opts.accept ? ` accept="${opts.accept}"` : ''}${opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : ''}${opts.inputmode ? ` inputmode="${opts.inputmode}"` : ''}${req}${desc}>`;
  return `<div class="fld"><label for="${id}">${esc(label)}${star}</label>${input}${hint}</div>`;
};
const form = (name, subject, success, inner, files = false) => `<form class="f" name="${name}" method="POST" action="/thanks/" data-netlify="true" netlify-honeypot="bot-field"${files ? ' enctype="multipart/form-data"' : ''}>
          <input type="hidden" name="form-name" value="${name}">
          <input type="hidden" name="subject" value="${esc(subject)}">
          <p class="hp"><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
          ${inner}
          <div class="actions"><button class="btn" type="submit">Send ${icon('arrow')}</button><p class="status" role="status" aria-live="polite"></p></div>
          <div class="done" tabindex="-1">${icon('check')}<span>${txt(success)}</span></div>
        </form>`;
const AP = A.application;
const AREAS = [...c.program.areas.items.map(a => a.title), 'Not sure yet'];
const applicationForm = form('residency-application', 'New CCC Residency application', AP.success, `
          <fieldset><legend>About you</legend>
            <div class="row">${field('first-name', 'First name', { form: 'app', required: true, auto: 'given-name' })}${field('last-name', 'Last name', { form: 'app', required: true, auto: 'family-name' })}</div>
            <div class="row">${field('email', 'Email', { form: 'app', type: 'email', required: true, auto: 'email' })}${field('phone', 'Phone', { form: 'app', type: 'tel', required: true, auto: 'tel' })}</div>
            ${field('street', 'Street address', { form: 'app', required: true, auto: 'street-address' })}
            <div class="row three">${field('city', 'City', { form: 'app', required: true, auto: 'address-level2' })}${field('state', 'State', { form: 'app', required: true, auto: 'address-level1' })}${field('zip', 'ZIP', { form: 'app', required: true, auto: 'postal-code', inputmode: 'numeric' })}</div>
            ${field('date-of-birth', 'Date of birth', { form: 'app', type: 'date', required: true, auto: 'bday' })}
          </fieldset>
          <fieldset><legend>Your church</legend>
            <div class="row">${field('church', 'Church you currently attend', { form: 'app', required: true })}${field('church-city-state', 'Church city and state', { form: 'app', required: true })}</div>
            ${field('church-website', 'Church website', { form: 'app', type: 'url', required: true, placeholder: 'https://' })}
          </fieldset>
          <fieldset><legend>Education</legend>
            <div class="row">${field('education', 'Highest level of education', { form: 'app', required: true, options: AP.education })}${field('degree', 'Degree completed or in progress', { form: 'app', placeholder: 'B.A. in Communications' })}</div>
            <div class="row">${field('graduation-date', 'Graduation date', { form: 'app', required: true, placeholder: 'May 2027', hint: 'Past or expected.' })}${field('gpa', 'Cumulative GPA', { form: 'app', required: true, inputmode: 'decimal' })}</div>
          </fieldset>
          <fieldset><legend>The residency</legend>
            ${field('area-of-interest', 'Area of focus you are most interested in', { form: 'app', required: true, options: AREAS })}
            ${field('questionnaire', 'Completed questionnaire', { form: 'app', type: 'file', required: true, accept: '.doc,.docx,.pdf', hint: 'Word or PDF. Download it in step 1 above if you have not yet.' })}
            ${field('resume', 'Resume (optional)', { form: 'app', type: 'file', accept: '.doc,.docx,.pdf' })}
            ${field('heard-about', 'How did you hear about the residency?', { form: 'app' })}
            ${field('anything-else', 'Anything else you want us to know?', { form: 'app', type: 'textarea' })}
          </fieldset>`, true).replace('>Send <svg', '>Submit application <svg');
const infoForm = form('residency-info', 'CCC Residency info request', A.info.success, `
          <div class="row">${field('first-name', 'First name', { form: 'info', required: true, auto: 'given-name' })}${field('last-name', 'Last name', { form: 'info', required: true, auto: 'family-name' })}</div>
          ${field('email', 'Email', { form: 'info', type: 'email', required: true, auto: 'email' })}
          ${field('phone', 'Phone', { form: 'info', type: 'tel', auto: 'tel' })}
          ${field('school', 'College or university (current or past)', { form: 'info', required: true })}
          ${field('graduation-year', 'Graduation year', { form: 'info', required: true, inputmode: 'numeric' })}
          ${field('area-of-interest', 'Area of focus you are most interested in', { form: 'info', required: true, options: AREAS })}`).replace('>Send <svg', '>Send me info <svg');
const contactForm = form('residency-contact', 'CCC Residency website question', A.contact.success, `
          <div class="row">${field('name', 'Name', { form: 'ct', required: true, auto: 'name' })}${field('email', 'Email', { form: 'ct', type: 'email', required: true, auto: 'email' })}</div>
          ${field('phone', 'Phone', { form: 'ct', type: 'tel', auto: 'tel' })}
          ${field('message', 'Message', { form: 'ct', type: 'textarea', required: true })}`);
page('/apply/', 'apply', `
  <section class="intro" aria-labelledby="intro-h">
    <div class="rings" aria-hidden="true"></div>
    <div class="wrap">
      <p class="eyebrow">${txt(A.intro.eyebrow)}</p>
      <h1 id="intro-h">${txt(A.intro.heading)}</h1>
      <p class="lead">${fmt(A.intro.text)}</p>
      <nav class="subnav" aria-label="On this page"><a href="#application">Application</a><a href="#info">Get more info</a><a href="#contact">Ask a question</a><a href="#faq">FAQ</a></nav>
    </div>
  </section>

  <section class="sec on-cream" style="padding-top:8px" aria-label="How to apply">
    <div class="wrap">
      ${applySteps(A.steps)}
    </div>
  </section>

  <section class="sec" id="application" aria-labelledby="app-h">
    <div class="wrap apply-layout">
      <div class="form-card">
        <h2 id="app-h">${txt(AP.heading)}</h2>
        <p>${fmt(AP.text)}</p>
        ${applicationForm}
      </div>
      <aside class="apply-aside">
        <div class="box fit"><h2>${txt(A.fit.heading)}</h2><ul>${A.fit.points.map(p => `<li>${icon('check')}<span>${fmt(p)}</span></li>`).join('')}</ul></div>
        <div class="box"><h2>Need the questionnaire?</h2><p>Fill it out first, then upload it with your application.</p><a class="dl-btn" href="${esc(A.steps[0].file)}" download>Download (.docx) ${icon('down')}</a></div>
      </aside>
    </div>
  </section>

  <section class="sec on-cream" aria-label="More information and questions">
    <div class="wrap two-forms">
      <div class="form-card" id="info">
        <h2>${txt(A.info.heading)}</h2>
        <p>${fmt(A.info.text)}</p>
        ${infoForm}
      </div>
      <div class="form-card" id="contact">
        <h2>${txt(A.contact.heading)}</h2>
        <p>${fmt(A.contact.text)}</p>
        ${contactForm}
      </div>
    </div>
  </section>

  <section class="sec" id="faq" aria-labelledby="faq-h">
    <div class="wrap narrow">
      <h2 id="faq-h">${txt(A.faq.heading)}</h2>
      <div class="faq" style="margin-top:32px">
${A.faq.items.map(x => `        <details><summary>${txt(x.q)}${icon('plus')}</summary><div><p>${fmt(x.a)}</p></div></details>`).join('\n')}
      </div>
    </div>
  </section>`, {
  schema: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: A.faq.items.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a.replace(/\[(.+?)\]\(.+?\)/g, '$1').replace(/\*/g, '') } })) })}</script>`
});

// ---------- thanks + 404 ----------
const simple = (route, h1, text) => page(route, 'home', `
  <section class="intro" style="min-height:56vh" aria-labelledby="intro-h">
    <div class="rings" aria-hidden="true"></div>
    <div class="wrap">
      <h1 id="intro-h">${h1}</h1>
      <p class="lead">${text}</p>
      <div class="btns">${btn('Back to the homepage', '/')}${btn('Meet the residents', '/residents/', 'ghost')}</div>
    </div>
  </section>`, { seo: { title: h1.replace(/<[^>]+>|&nbsp;/g, ' ') + ' | CCC Church Residency' } });
simple('/thanks/', 'Thanks! We got it.', 'Your form came through. Someone from the residency team will be in touch&nbsp;soon.');
simple('/404', 'This page moved.', 'The residency site was rebuilt, so some old links changed. Try one of these&nbsp;instead.');

// ---------- assets, sitemap ----------
fs.copyFileSync(path.join(ROOT, 'src/styles.css'), path.join(ROOT, 'styles.css'));
fs.copyFileSync(path.join(ROOT, 'src/site.js'), path.join(ROOT, 'site.js'));
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url><loc>${SITE_URL}${p}</loc></url>`).join('\n')}
</urlset>
`);
console.log(`Built ${pages.length + 2} pages: ${cohorts.length} cohorts, ${totalResidents} residents, ${current.length} current.`);
