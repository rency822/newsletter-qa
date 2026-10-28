const DAY_MS = 86400000;

const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fmt = (ms) => new Date(ms).toISOString().slice(0, 10);

export function computeWindow(release) {
  const rel = parse(release);
  let gen = rel - DAY_MS;
  while (new Date(gen).getUTCDay() !== 4) gen -= DAY_MS;
  const start = gen - 13 * DAY_MS;
  const days = [];
  for (let i = 0; i < 7; i++) days.push(fmt(start + i * DAY_MS));
  return { release, generation: fmt(gen), start: days[0], end: days[6], days };
}

// Window derived directly from a generation date (YYYY-MM-DD): gen-13 .. gen-7.
export function windowFromGeneration(gen) {
  const g = parse(gen);
  const start = g - 13 * DAY_MS;
  const days = [];
  for (let i = 0; i < 7; i++) days.push(fmt(start + i * DAY_MS));
  return { release: null, generation: fmt(g), start: days[0], end: days[6], days };
}
