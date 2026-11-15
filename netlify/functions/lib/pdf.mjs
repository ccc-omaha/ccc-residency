// Builds a clean, printable PDF of a residency application.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import schema from './application-schema.mjs';

const PURPLE = rgb(99 / 255, 52 / 255, 152 / 255), NAVY = rgb(0, 0, 61 / 255), MUTED = rgb(.3, .3, .42), TINT = rgb(.953, .941, .973), RULE = rgb(.88, .87, .92);
// Standard PDF fonts only cover basic Latin, so swap anything else for a safe stand-in.
const MAP = { '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...', ' ': ' ', '•': '-' };
const clean = s => String(s ?? '').replace(/\r/g, '').replace(/[‘’“”–—… •]/g, c => MAP[c])
  .normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\x09\x0A\x20-\x7E]/g, '?');

// "2004-03-12" reads better as "March 12, 2004"
export const nice = (name, v) => {
  const s = String(v ?? '');
  if (s === 'on') return 'Yes';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : s;
};

export async function applicationPdf(data, submittedAt = new Date()) {
  const doc = await PDFDocument.create();
  const reg = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold), serif = await doc.embedFont(StandardFonts.TimesRoman), serifI = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const W = 612, H = 792, M = 54, CW = W - M * 2;
  const name = clean(`${data['first-name'] || ''} ${data['last-name'] || ''}`.trim() || 'Applicant');
  doc.setTitle(`Residency application - ${name}`); doc.setAuthor('CCC Church Residency');
  let page, y;

  const wrap = (text, font, size, width) => {
    const out = [];
    for (const para of clean(text).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        const t = line ? line + ' ' + word : word;
        if (font.widthOfTextAtSize(t, size) <= width) line = t;
        else { if (line) out.push(line); line = word; while (font.widthOfTextAtSize(line, size) > width) { let i = line.length; while (i > 1 && font.widthOfTextAtSize(line.slice(0, i), size) > width) i--; out.push(line.slice(0, i)); line = line.slice(i); } }
      }
      out.push(line);
    }
    return out;
  };
  const newPage = () => {
    page = doc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 34, width: W, height: 34, color: PURPLE });
    page.drawText('CHURCH RESIDENCY APPLICATION', { x: M, y: H - 22, size: 9, font: bold, color: rgb(1, 1, 1) });
    const n = name.toUpperCase(); page.drawText(n, { x: W - M - bold.widthOfTextAtSize(n, 9), y: H - 22, size: 9, font: bold, color: rgb(1, 1, 1) });
    y = H - 64;
  };
  const need = h => { if (y - h < M + 20) newPage(); };

  // cover block
  newPage();
  page.drawText(name, { x: M, y: y - 26, size: 30, font: serif, color: NAVY }); y -= 44;
  const sub = [data.email, data.phone].filter(Boolean).map(clean).join('   |   ');
  if (sub) { page.drawText(sub, { x: M, y, size: 11, font: reg, color: MUTED }); y -= 16; }
  const when = `Submitted ${submittedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' })}`;
  page.drawText(when, { x: M, y, size: 11, font: reg, color: MUTED }); y -= 14;
  const first = data['area-first-choice'];
  if (first) { page.drawText(clean(`First choice: ${first}`), { x: M, y, size: 11, font: bold, color: PURPLE }); y -= 10; }
  y -= 14;

  for (const step of schema) {
    const rows = step.fields.filter(f => data[f.name] !== undefined && String(data[f.name]).trim() !== '');
    if (!rows.length) continue;
    need(60);
    page.drawText(clean(step.title), { x: M, y: y - 16, size: 18, font: serifI, color: PURPLE }); y -= 26;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1.2, color: PURPLE }); y -= 14;
    for (const f of rows) {
      const val = nice(f.name, data[f.name]);
      if (f.long) {
        const q = wrap(f.label, bold, 10.5, CW), a = wrap(val, reg, 10.5, CW - 20);
        need(q.length * 14 + Math.min(a.length, 4) * 14 + 24);
        q.forEach(l => { page.drawText(l, { x: M, y, size: 10.5, font: bold, color: NAVY }); y -= 14; });
        y -= 4;
        let i = 0;
        while (i < a.length) {
          const room = Math.max(1, Math.floor((y - M - 20) / 14) - 1);
          const chunk = a.slice(i, i + room);
          const h = chunk.length * 14 + 12;
          page.drawRectangle({ x: M, y: y - h + 10, width: CW, height: h, color: TINT });
          chunk.forEach(l => { page.drawText(l, { x: M + 10, y: y - 2, size: 10.5, font: reg, color: NAVY }); y -= 14; });
          y -= 10; i += chunk.length;
          if (i < a.length) newPage();
        }
        y -= 6;
      } else {
        const lab = wrap(f.label, reg, 10, 190), v = wrap(val, bold, 10.5, CW - 205);
        const h = Math.max(lab.length, v.length) * 13 + 8;
        need(h);
        lab.forEach((l, k) => page.drawText(l, { x: M, y: y - k * 13, size: 10, font: reg, color: MUTED }));
        v.forEach((l, k) => page.drawText(l, { x: M + 205, y: y - k * 13, size: 10.5, font: bold, color: NAVY }));
        y -= h; page.drawLine({ start: { x: M, y: y + 4 }, end: { x: W - M, y: y + 4 }, thickness: .6, color: RULE }); y -= 6;
      }
    }
    y -= 12;
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => { const t = `Page ${i + 1} of ${pages.length}`; p.drawText(t, { x: W - M - reg.widthOfTextAtSize(t, 9), y: 30, size: 9, font: reg, color: MUTED }); p.drawText('cccresidency.org', { x: M, y: 30, size: 9, font: reg, color: MUTED }); });
  return { bytes: await doc.save(), filename: `Residency-Application-${name.replace(/[^A-Za-z0-9]+/g, '-')}.pdf` };
}
