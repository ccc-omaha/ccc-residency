// Turns a submission into a row for the Excel files in SharePoint
// (Staff HUB > Ministry Documents > Residency > Residency Website).
// The row is emailed to a mailbox that a Power Automate flow watches; the flow
// adds it to the right table. Keys must match the Excel column headers exactly.
import schema from './application-schema.mjs';

const FIXED = { 'first-name': 'First name', 'last-name': 'Last name', email: 'Email', phone: 'Phone', street: 'Street address', city: 'City', state: 'State', zip: 'ZIP', 'date-of-birth': 'Date of birth', church: 'Church', 'church-city-state': 'Church city and state', 'church-website': 'Church website', education: 'Education', degree: 'Degree', 'graduation-date': 'Graduation date', gpa: 'GPA', 'area-first-choice': 'First choice', 'area-second-choice': 'Second choice', 'area-third-choice': 'Third choice', 'area-other': 'Other calling', 'worship-video-link': 'Worship video link', 'referred-by': 'Referred by', 'previous-church-work': 'Previous church work', 'reference-1-name': 'Reference 1 name', 'reference-1-email': 'Reference 1 email', 'reference-2-name': 'Reference 2 name', 'reference-2-email': 'Reference 2 email', 'statement-of-faith': 'Statement of faith', 'application-agreement': 'Application agreement', signature: 'Signature', 'signed-date': 'Date signed' };
// written questions, in the order they appear on the form
const QUESTIONS = ['Why the residency', 'Hoped takeaways', 'Conversion', 'Calling to ministry', 'College experiences', 'College lessons', "Why a master's degree", 'Leadership defined', 'Leadership experience', 'Strengths and weaknesses', 'Inspiring leaders', 'Authority of the Bible', 'Triune God', 'Salvation', 'Jesus Christ', 'Christian life and Holy Spirit', 'Human destiny', 'Local church', 'Men and women in leadership'];
const INFO = { 'first-name': 'First name', 'last-name': 'Last name', email: 'Email', phone: 'Phone', school: 'School', 'graduation-year': 'Graduation year', 'area-of-interest': 'Area of interest' };
const CONTACT = { name: 'Name', email: 'Email', phone: 'Phone', message: 'Message' };
const FOLDER = '/Residency/Residency Website/';
// Excel treats a leading = + - @ as a formula; a leading apostrophe keeps it as text
const safe = v => { const s = String(v ?? '') === 'on' ? 'Yes' : String(v ?? ''); return /^[=+\-@]/.test(s) ? "'" + s : s; };

export function excelRow(form, data, at) {
  const row = { Submitted: at.toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'short', timeStyle: 'short' }) };
  if (form === 'residency-application') {
    let q = 0;
    for (const f of schema.flatMap(s => s.fields)) {
      const col = FIXED[f.name] || (f.long ? QUESTIONS[q++] : null);
      if (col) row[col] = safe(data[f.name]);
    }
    return { file: FOLDER + 'Residency Applications.xlsx', table: 'Applications', row };
  }
  const map = form === 'residency-info' ? INFO : form === 'residency-contact' ? CONTACT : null;
  if (!map) return null;
  for (const [k, col] of Object.entries(map)) row[col] = safe(data[k]);
  return form === 'residency-info' ? { file: FOLDER + 'Residency Info Requests.xlsx', table: 'InfoRequests', row } : { file: FOLDER + 'Residency Questions.xlsx', table: 'Questions', row };
}
