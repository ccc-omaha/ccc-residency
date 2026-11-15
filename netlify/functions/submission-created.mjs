// Runs on every verified Netlify Forms submission (Netlify calls this by name).
// 1. Keeps a backup copy of every submission in Netlify Blobs.
// 2. Emails Shanna a readable version; applications include a printable PDF.
// 3. Sends the submission to Excel (Power Automate) when EXCEL_WEBHOOK_* is set.
import { getStore, connectLambda } from '@netlify/blobs';
import { layout, send, emailReady } from './lib/email.mjs';
import { applicationPdf, nice } from './lib/pdf.mjs';
import schema from './lib/application-schema.mjs';

const NOTIFY = () => (process.env.RESIDENCY_NOTIFY_TO || 'shannab@cccomaha.org').split(',').map(s => s.trim()).filter(Boolean);
const SKIP = new Set(['form-name', 'subject', 'bot-field', 'ip', 'user_agent', 'referrer']);
const pretty = k => k.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());

export const handler = async (event) => {
  const { payload } = JSON.parse(event.body || '{}');
  if (!payload) return { statusCode: 400 };
  const form = payload.form_name, data = payload.data || {}, at = new Date(payload.created_at || Date.now());
  const results = {};

  // 1. backup
  try {
    connectLambda(event);
    await getStore('residency-submissions').setJSON(`${form}/${at.toISOString()}-${payload.id}`, { form, at, data });
    results.backup = true;
  } catch (e) { console.error('backup failed', e); }

  // 2. email
  const name = `${data['first-name'] || data.name || ''} ${data['last-name'] || ''}`.trim() || 'Someone';
  try {
    if (form === 'residency-application') {
      // short summary in the email body; every written answer is in the attached PDF
      const sections = schema.slice(0, 3).map(s => ({ title: s.title, rows: s.fields.filter(f => !f.long).map(f => ({ label: f.label, value: nice(f.name, data[f.name]) })) }));
      const pdf = await applicationPdf(data, at);
      results.email = await send({
        to: NOTIFY(), replyTo: data.email,
        subject: `New residency application: ${name}`,
        html: layout({ preheader: `${name} applied to the residency.`, eyebrow: 'New application', title: name, intro: `${name} submitted an application. <strong>Their written answers are in the attached PDF</strong>, ready to read or print for reviewers.${data['area-first-choice'] ? ` First choice: <strong>${data['area-first-choice']}</strong>.` : ''}`, sections }),
        text: `${name} submitted a residency application. A PDF is attached.`,
        attachments: [{ filename: pdf.filename, content: Buffer.from(pdf.bytes).toString('base64') }]
      });
    } else {
      const label = form === 'residency-info' ? 'Info request' : form === 'residency-contact' ? 'Question from the website' : form;
      const rows = Object.entries(data).filter(([k]) => !SKIP.has(k)).map(([k, v]) => ({ label: pretty(k), value: v, long: k === 'message' }));
      results.email = await send({
        to: NOTIFY(), replyTo: data.email,
        subject: `${label}: ${name}`,
        html: layout({ preheader: `${label} from ${name}`, eyebrow: label, title: name, intro: 'Reply to this email to respond directly.', sections: [{ rows }] }),
        text: rows.map(r => `${r.label}: ${r.value}`).join('\n')
      });
    }
  } catch (e) { console.error('email failed', e); }

  // 3. Excel via Power Automate (one flow URL per form)
  const hook = { 'residency-application': process.env.EXCEL_WEBHOOK_APPLICATION, 'residency-info': process.env.EXCEL_WEBHOOK_INFO, 'residency-contact': process.env.EXCEL_WEBHOOK_CONTACT }[form];
  if (hook) {
    try {
      const flat = { submitted: at.toISOString() };
      for (const [k, v] of Object.entries(data)) if (!SKIP.has(k)) flat[k] = v === 'on' ? 'Yes' : v;
      const r = await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(flat) });
      results.excel = r.ok;
    } catch (e) { console.error('excel failed', e); }
  }

  console.log('submission handled', form, payload.id, JSON.stringify(results), 'emailReady', emailReady());
  return { statusCode: 200 };
};
