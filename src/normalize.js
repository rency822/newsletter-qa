export function normalizeTitle(s) {
  return String(s)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’"“”]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function slugify(s) {
  return normalizeTitle(s).replace(/ /g, '-');
}

export function dice(a, b) {
  const x = normalizeTitle(a);
  const y = normalizeTitle(b);
  if (x.length < 2 || y.length < 2) return x === y ? 1 : 0;
  const counts = new Map();
  for (let i = 0; i < x.length - 1; i++) {
    const g = x.slice(i, i + 2);
    counts.set(g, (counts.get(g) || 0) + 1);
  }
  let overlap = 0;
  for (let i = 0; i < y.length - 1; i++) {
    const g = y.slice(i, i + 2);
    const c = counts.get(g);
    if (c) { overlap++; counts.set(g, c - 1); }
  }
  return (2 * overlap) / (x.length - 1 + y.length - 1);
}
