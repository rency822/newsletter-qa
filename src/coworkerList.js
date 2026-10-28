const CODE_RE = /^[a-z]+\d+[a-z0-9_]*$/i;

export function parseCoworkerList(text) {
  const rows = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const idx = line.indexOf(' - ');
    const left = idx === -1 ? line : line.slice(0, idx).trim();
    const right = idx === -1 ? '' : line.slice(idx + 3).trim();
    if (CODE_RE.test(left)) {
      let title = right;
      let note = null;
      const m = title.match(/\(([^)]*)\)\s*$/);
      if (m) {
        note = m[1];
        title = title.slice(0, m.index).trim();
      }
      const modelTokens = left.split('_').slice(1)
        .filter(t => !/^part\d+$/i.test(t) && !/^\d+$/.test(t))
        .map(t => t.toLowerCase())
        .filter(Boolean);
      rows.push({code: left, title, note, modelTokens});
    } else {
      rows.push({code: null, title: left, note: right || null, modelTokens: []});
    }
  }
  return rows;
}
