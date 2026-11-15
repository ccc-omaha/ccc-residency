// Saves an in-progress residency application so an applicant can finish later
// from any device. Drafts live in Netlify Blobs under an unguessable key.
// If RESEND_API_KEY and RESUME_FROM_EMAIL are set in Netlify, the resume link
// is also emailed to the applicant automatically.
import { getStore } from '@netlify/blobs';
import { randomBytes } from 'node:crypto';

const MAX_BYTES = 200_000;
const KEEP_DAYS = 90;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const validId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{32}$/.test(id);

export default async (req) => {
  const store = getStore('residency-drafts');
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const id = url.searchParams.get('id');
    if (!validId(id)) return json({ error: 'bad id' }, 400);
    const d = await store.get(id, { type: 'json' });
    if (!d || Date.now() - d.t > KEEP_DAYS * 864e5) return json({ error: 'not found' }, 404);
    return json({ v: d.v, step: d.step });
  }

  if (req.method === 'POST') {
    const raw = await req.text();
    if (raw.length > MAX_BYTES) return json({ error: 'too large' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400); }
    const id = validId(body.id) ? body.id : randomBytes(24).toString('base64url');
    const v = body.v && typeof body.v === 'object' ? body.v : {};
    await store.setJSON(id, { t: Date.now(), step: Number(body.step) || 0, v });
    const link = `${url.origin}/apply/?resume=${id}#application`;

    let emailed = false;
    const to = String(v.email || '').trim();
    if (body.send && process.env.RESEND_API_KEY && process.env.RESUME_FROM_EMAIL && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      const first = String(v['first-name'] || '').trim();
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESUME_FROM_EMAIL,
          to: [to],
          reply_to: 'residency@cccomaha.org',
          subject: 'Your CCC Church Residency application',
          text: `${first ? `Hi ${first},\n\n` : ''}Your application is saved. Use this link to pick up where you left off:\n\n${link}\n\nThe link works on any device for ${KEEP_DAYS} days. Anyone with the link can see your answers, so keep it to yourself.\n\nCCC Church Residency\nresidency@cccomaha.org`
        })
      }).catch(() => null);
      emailed = !!(r && r.ok);
    }
    return json({ id, link, emailed });
  }

  return json({ error: 'method not allowed' }, 405);
};

export const config = { path: '/api/draft' };
