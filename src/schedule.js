import {normalizeTitle} from './normalize.js';

export function isTestTitle(t) {
  return /^test\d*$/i.test(t) || /^test_/i.test(t) || /\stest\s/i.test(t);
}

export function parseSchedule(htmls) {
  const entries = [];
  const coveredDays = new Set();
  const seen = new Set();
  for (const html of htmls) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    for (const h of doc.querySelectorAll('.day-heading[data-day]')) {
      coveredDays.add(h.getAttribute('data-day'));
    }
    for (const btn of doc.querySelectorAll('button.calendar-event')) {
      const siteKey = (btn.querySelector('.event-domain')?.textContent ?? '').trim();
      const title = (btn.querySelector('.event-title')?.textContent ?? '').trim();
      if (!siteKey || !title || isTestTitle(title)) continue;
      const i = siteKey.lastIndexOf(' - ');
      const label = (i >= 0 ? siteKey.slice(0, i) : siteKey).trim();
      const adminHost = (i >= 0 ? siteKey.slice(i + 3) : '').trim();
      const status = [...btn.classList].map(c => /^status-(\w+)$/.exec(c)).find(Boolean)?.[1] ?? '';
      const date = btn.getAttribute('data-day');
      const key = `${siteKey}|${normalizeTitle(title)}|${date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        siteKey, label, adminHost, title, status, date,
        id: btn.getAttribute('data-event'),
        hasVideo: !!btn.querySelector('.media-flag.video'),
        hasPhoto: !!btn.querySelector('.media-flag.photo'),
      });
    }
  }
  if (!entries.length) throw new Error("This doesn't look like a schedule page — it has no calendar entries.");
  return {entries, coveredDays};
}
