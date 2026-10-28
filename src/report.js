// Report helpers: summary counts, copy-text, CSV.

export function summarize(rows) {
  const out = {ok: 0, missing: 0, review: 0};
  for (const r of rows) {
    if (r.status === 'matched' || r.status === 'fuzzy') out.ok++;
    else if (r.status === 'missing') out.missing++;
    else out.review++;
  }
  return out;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// 'YYYY-MM-DD' -> 'Mon D' without Date (no timezone shifts); '' if unparseable.
function fmtDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? '');
  if (!m) return '';
  const mon = MONTHS[Number(m[2]) - 1];
  return mon ? `${mon} ${Number(m[3])}` : '';
}

const titleOf = r => r.scheduleTitle ?? r.newsletterTitle ?? '';
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const low = s => String(s ?? '').toLowerCase();

export function toCopyText(rows) {
  const problems = rows.filter(r => r.status !== 'matched' && r.status !== 'fuzzy');
  // Missing first, then other problems; each group by studio then title.
  problems.sort((a, b) =>
    (a.status === 'missing' ? 0 : 1) - (b.status === 'missing' ? 0 : 1) ||
    cmp(low(a.studio), low(b.studio)) ||
    cmp(low(titleOf(a)), low(titleOf(b))));
  return problems.map(r => {
    const icon = r.status === 'missing' ? '❌' : '⚠️';
    const d = fmtDate(r.date);
    return `${icon} ${r.studio ?? ''} – ${titleOf(r)}${d ? ` (${d})` : ''}`;
  }).join('\n');
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows) {
  const lines = [['status','studio','newsletter_title','schedule_title','date','code','note','fhg'].join(',')];
  for (const r of rows) {
    lines.push([r.status, r.studio, r.newsletterTitle, r.scheduleTitle, r.date, r.code, r.note, r.fhg].map(csvCell).join(','));
  }
  return lines.join('\n');
}
