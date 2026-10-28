const CODE_RE = /^[a-z]+\d+[a-z0-9_]*$/i;

// A line with no " - " can still start with a code ("tkc0232_redblack_matt Red Black's Revenge").
// Only codes containing "_" qualify here, so a title like "B2 Bomber Night" is not split.
const CODE_SPACE_RE = /^([a-z]+\d+[a-z0-9]*_[a-z0-9_]*)\s+(.+)$/i;

export function parseCoworkerList(text) {
  const rows = [];
  const seen = new Set();
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || seen.has(line)) continue; // a list pasted twice must not double the expected scenes
    seen.add(line);
    const idx = line.indexOf(' - ');
    const spaced = idx === -1 ? line.match(CODE_SPACE_RE) : null;
    const left = spaced ? spaced[1] : idx === -1 ? line : line.slice(0, idx).trim();
    const right = spaced ? spaced[2].trim() : idx === -1 ? '' : line.slice(idx + 3).trim();
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
