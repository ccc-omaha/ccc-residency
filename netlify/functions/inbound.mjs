// Mail sent to any @cccresidency.org address (residency@, a typo, anything)
// arrives at Resend, which calls this webhook. We fetch the message and pass
// it on to the residency inbox (Shanna by default), keeping the original
// sender as the reply-to so a reply goes straight back to them.
//
// Needs RESEND_WEBHOOK_SECRET (from the webhook's page in Resend) so only
// Resend can trigger it.
import PostalMime from 'postal-mime';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { send } from './lib/email.mjs';

const TO = () => process.env.RESIDENCY_NOTIFY_TO || 'shannab@cccomaha.org';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Resend signs webhooks the Svix way: HMAC-SHA256 of "id.timestamp.body"
function verified(req, body) {
  const secret = process.env.RESEND_WEBHOOK_SECRET || '';
  const id = req.headers.get('svix-id'), ts = req.headers.get('svix-timestamp'), sigs = req.headers.get('svix-signature');
  if (!secret || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest();
  return sigs.split(' ').some(s => {
    const got = Buffer.from(s.split(',')[1] || '', 'base64');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

const api = path => fetch(`https://api.resend.com${path}`, { headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}` } });
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const body = await req.text();
  if (!verified(req, body)) return json({ error: 'bad signature' }, 401);
  const event = JSON.parse(body);
  if (event.type !== 'email.received') return json({ ignored: event.type });

  const id = event.data?.email_id;
  const meta = await api(`/emails/receiving/${id}`);
  if (!meta.ok) { console.error('inbound: fetch failed', meta.status, await meta.text()); return json({ error: 'fetch failed' }, 502); }
  const email = await meta.json();
  const rawUrl = email.raw?.download_url;
  const raw = rawUrl ? await (await fetch(rawUrl)).arrayBuffer() : null;
  const msg = raw ? await PostalMime.parse(raw, { attachmentEncoding: 'base64' }) : {};

  const fromAddr = msg.from?.address || String(email.from || '').replace(/.*<|>.*/g, '');
  const fromName = msg.from?.name || '';
  // never forward our own mail back to ourselves
  if (/@cccresidency\.org$/i.test(fromAddr)) return json({ skipped: 'own address' });

  const sentTo = [].concat(email.to || []).join(', ') || 'residency@cccresidency.org';
  const who = fromName ? `${fromName} <${fromAddr}>` : fromAddr;
  const note = `Sent to ${sentTo} by ${who}. Hit reply to answer them directly.`;
  const html = `<div style="font:14px/1.5 Arial,Helvetica,sans-serif;color:#555;border-left:3px solid #633498;padding:6px 12px;margin:0 0 18px">${esc(note)}</div>${msg.html || `<pre style="white-space:pre-wrap;font:15px/1.5 Arial,Helvetica,sans-serif">${esc(msg.text)}</pre>`}`;
  const attachments = (msg.attachments || []).map(a => ({ filename: a.filename || 'attachment', content: a.content }));

  const r = await send({
    to: TO(),
    replyTo: fromAddr,
    subject: msg.subject || email.subject || '(no subject)',
    html,
    text: `${note}\n\n${msg.text || ''}`,
    attachments: attachments.length ? attachments : undefined
  });
  console.log('inbound forwarded', id, fromAddr, r);
  return json({ forwarded: r.ok }, r.ok ? 200 : 502);
};

export const config = { path: '/api/inbound' };
