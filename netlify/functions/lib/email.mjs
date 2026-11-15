// Shared email pieces: a branded HTML layout and a Resend sender.
// Email clients can't load the site's web fonts, so headings use Georgia
// (closest safe serif to Quincy) and body text uses Arial.

const PURPLE = '#633498', NAVY = '#00003D', BLUE = '#0083E0', TINT = '#F3F0F8', MUTED = '#4b4b68';

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nl2br = s => esc(s).replace(/\r?\n/g, '<br>');

// rows: [{ label, value, long }] grouped under optional section titles
export function layout({ preheader = '', eyebrow = '', title, intro = '', sections = [], button, footer = '' }) {
  const sec = sections.map(s => `
    ${s.title ? `<tr><td style="padding:28px 32px 6px;font:italic 400 20px Georgia,'Times New Roman',serif;color:${PURPLE}">${esc(s.title)}</td></tr>` : ''}
    ${s.rows.filter(r => r.value !== undefined && r.value !== '').map(r => r.long ? `
    <tr><td style="padding:10px 32px 4px;font:700 14px Arial,Helvetica,sans-serif;color:${NAVY}">${esc(r.label)}</td></tr>
    <tr><td style="padding:0 32px 10px"><div style="background:${TINT};border-radius:8px;padding:14px 16px;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${NAVY}">${nl2br(r.value)}</div></td></tr>` : `
    <tr><td style="padding:6px 32px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e6e3ee"><tr>
        <td style="padding:8px 0;width:42%;vertical-align:top;font:400 14px Arial,Helvetica,sans-serif;color:${MUTED}">${esc(r.label)}</td>
        <td style="padding:8px 0;vertical-align:top;font:700 15px Arial,Helvetica,sans-serif;color:${NAVY}">${nl2br(r.value)}</td>
      </tr></table>
    </td></tr>`).join('')}`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#efedf4">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efedf4"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden">
    <tr><td style="background:${PURPLE};padding:22px 32px;font:400 13px Arial,Helvetica,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#ffffff">Church <b style="letter-spacing:.06em">Residency</b></td></tr>
    <tr><td style="padding:30px 32px 0">
      ${eyebrow ? `<div style="font:italic 400 18px Georgia,'Times New Roman',serif;color:${PURPLE};margin-bottom:6px">${esc(eyebrow)}</div>` : ''}
      <div style="font:400 30px/1.15 Georgia,'Times New Roman',serif;color:${NAVY}">${esc(title)}</div>
      ${intro ? `<div style="font:400 16px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};margin-top:12px">${intro}</div>` : ''}
    </td></tr>
    ${button ? `<tr><td style="padding:24px 32px 4px"><a href="${esc(button.href)}" style="display:inline-block;background:${BLUE};color:#ffffff;text-decoration:none;font:700 16px Arial,Helvetica,sans-serif;padding:15px 24px;border-radius:10px">${esc(button.label)}</a></td></tr>` : ''}
    ${sec}
    <tr><td style="padding:30px 32px 30px;font:400 13px/1.5 Arial,Helvetica,sans-serif;color:${MUTED}">${footer || 'CCC Church Residency, a ministry of Christ Community Church<br>404 South 108th Avenue, Omaha, NE 68154 &middot; <a href="mailto:residency@cccomaha.org" style="color:' + BLUE + '">residency@cccomaha.org</a>'}</td></tr>
  </table>
</td></tr></table></body></html>`;
}

export const emailReady = () => !!(process.env.RESEND_API_KEY && process.env.RESIDENCY_FROM_EMAIL);

export async function send({ to, subject, html, text, replyTo, attachments }) {
  if (!emailReady()) return { ok: false, skipped: true };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.RESIDENCY_FROM_EMAIL, to: [].concat(to), subject, html, text, reply_to: replyTo, attachments })
  }).catch(e => ({ ok: false, statusText: String(e) }));
  if (!res.ok) console.error('Resend failed', res.status, res.statusText, res.text ? await res.text() : '');
  return { ok: !!res.ok };
}
