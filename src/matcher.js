import {normalizeTitle, slugify, dice} from './normalize.js';
import {studioForSite, studioForHeader} from './mapping.js';

export const FUZZY_MIN = 0.85;

// pairs: [{a, b, score}] ; returns pairs kept, each a and b used at most once
export function assign(pairs, min) {
  const usedA = new Set(), usedB = new Set(), kept = [];
  for (const p of [...pairs].sort((x, y) => y.score - x.score)) {
    if (p.score < min || usedA.has(p.a) || usedB.has(p.b)) continue;
    usedA.add(p.a); usedB.add(p.b); kept.push(p);
  }
  return kept;
}

const row = (o) => ({
  status: null, studio: null, newsletterTitle: null, scheduleTitle: null,
  date: null, fhg: null, code: null, note: null, score: null, ...o,
});

export function checkSchedule({newsletter, entries, coveredDays, mapping, program, window}) {
  const uncoveredDays = window.days.filter((d) => !coveredDays.has(d));
  const inWindow = (d) => d >= window.start && d <= window.end;
  const withStudio = entries
    .map((e) => ({e, studio: studioForSite(mapping, program, e)}))
    .filter((x) => x.studio);
  const expected = new Set(
    withStudio
      .filter(({e}) => e.status === 'published' && e.hasVideo && inWindow(e.date) && !uncoveredDays.includes(e.date))
      .map(({e}) => e),
  );
  const rows = [];
  const usedEntries = new Set();

  for (const section of newsletter.sections) {
    const studio = studioForHeader(mapping, program, section.header);
    if (!studio) {
      for (const sc of section.scenes) {
        rows.push(row({status: 'unknown-studio', studio: section.header, newsletterTitle: sc.title, fhg: sc.fhg ?? null,
          note: 'Studio header is not in the mapping'}));
      }
      continue;
    }
    const cands = withStudio.filter((x) => x.studio === studio).map((x) => x.e);
    const pairs = [];
    for (const sc of section.scenes) {
      for (const c of cands) {
        const base = sc.slug && sc.slug === slugify(c.title) ? 1 : dice(sc.title, c.title);
        pairs.push({a: sc, b: c, score: base + (expected.has(c) ? 0.001 : 0)});
      }
    }
    const kept = assign(pairs, FUZZY_MIN);
    const byScene = new Map(kept.map((p) => [p.a, p]));
    for (const sc of section.scenes) {
      const p = byScene.get(sc);
      const base = {studio, newsletterTitle: sc.title, fhg: sc.fhg ?? null};
      if (!p) {
        rows.push(row({...base, status: 'not-found', note: 'No schedule entry for this studio matches the title'}));
        continue;
      }
      const c = p.b;
      usedEntries.add(c);
      const slugHit = !!sc.slug && sc.slug === slugify(c.title);
      const common = {...base, scheduleTitle: c.title, date: c.date, score: Math.min(1, Math.round(p.score * 1000) / 1000)};
      if (c.status !== 'published') {
        rows.push(row({...common, status: 'not-published', note: `Schedule status is "${c.status}"`}));
      } else if (!inWindow(c.date)) {
        rows.push(row({...common, status: 'outside-window', note: `Published ${c.date}, outside ${window.start} to ${window.end}`}));
      } else if (!c.hasVideo) {
        rows.push(row({...common, status: 'not-published', note: 'Published entry has no video'}));
      } else {
        const exact = slugHit || normalizeTitle(sc.title) === normalizeTitle(c.title);
        rows.push(row({...common, status: exact ? 'matched' : 'fuzzy', note: exact ? null : 'Title differs from schedule'}));
      }
    }
  }

  for (const e of expected) {
    if (usedEntries.has(e)) continue;
    rows.push(row({status: 'missing', studio: studioForSite(mapping, program, e), scheduleTitle: e.title, date: e.date,
      note: 'Published in the window but not in the newsletter'}));
  }
  return {rows, uncoveredDays};
}

const modelKey = (m) => m.toLowerCase().replace(/[^a-z0-9]/g, '');

export function checkIndieBucks({newsletter, list}) {
  const scenes = [];
  for (const section of newsletter.sections) for (const sc of section.scenes) scenes.push({sc, header: section.header});
  const pairs = [];
  for (const line of list) {
    for (const s of scenes) {
      const t = dice(line.title, s.sc.title);
      const keys = (s.sc.models || []).map(modelKey);
      const hits = line.modelTokens.filter((tok) => keys.some((k) => k.includes(tok))).length;
      const eligible = t >= FUZZY_MIN || (hits > 0 && hits === line.modelTokens.length);
      if (eligible) pairs.push({a: line, b: s, score: t + 0.15 * hits, t});
    }
  }
  const kept = assign(pairs, 0);
  const byScene = new Map(kept.map((p) => [p.b, p]));
  const usedLines = new Set(kept.map((p) => p.a));
  const rows = [];
  for (const s of scenes) {
    const p = byScene.get(s);
    const base = {studio: s.header, newsletterTitle: s.sc.title, fhg: s.sc.fhg ?? null};
    if (!p) {
      rows.push(row({...base, status: 'not-found', note: 'No coworker list line matches this scene'}));
      continue;
    }
    const line = p.a;
    const common = {...base, scheduleTitle: line.title, code: line.code, note: line.note, score: Math.round(p.score * 1000) / 1000};
    if (p.t >= FUZZY_MIN) {
      const exact = normalizeTitle(line.title) === normalizeTitle(s.sc.title);
      rows.push(row({...common, status: exact ? 'matched' : 'fuzzy'}));
    } else {
      rows.push(row({...common, status: 'title-mismatch'}));
    }
  }
  for (const line of list) {
    if (usedLines.has(line)) continue;
    rows.push(row({status: 'missing', studio: null, scheduleTitle: line.title, code: line.code, note: line.note}));
  }
  return {rows};
}
