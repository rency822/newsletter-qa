const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];
const DATE_RE = new RegExp(`(${MONTHS.join('|')}) (\\d{1,2}), (\\d{4})`);

export function detectProgram(subject) {
  const s = (subject || '').trim().replace(/^(?:(?:fwd?|fw)\s*:\s*)+/i, '').trim();
  if (/^radicalcash\b/i.test(s)) return 'radicalcash';
  if (/^kennyspennies\b/i.test(s)) return 'kennyspennies';
  if (/^indiebucks/i.test(s)) return 'indiebucks';
  return null;
}

function isTitleCell(td) {
  if (!td) return false;
  if ((td.getAttribute('colspan') || '').trim() !== '2') return false;
  const style = (td.getAttribute('style') || '').replace(/\s+/g, '').toLowerCase();
  return style.includes('padding:10px') && style.includes('font-weight:bold');
}

function tokenize(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tokens = [];
  const walk = (node, td) => {
    // Adjacent text nodes (e.g. split around entities in linkedom) form one token.
    let buf = '';
    const flush = () => {
      const text = buf.replace(/\s+/g, ' ').trim();
      buf = '';
      if (text) tokens.push({ text, isTitle: isTitleCell(td) });
    };
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) {
        buf += child.nodeValue;
        continue;
      }
      flush();
      if (child.nodeType === 1) {
        const tag = (child.tagName || '').toLowerCase();
        if (tag === 'script' || tag === 'style') continue;
        walk(child, tag === 'td' ? child : td);
      }
    }
    flush();
  };
  walk(doc, null);
  return tokens;
}

export function parseNewsletter(html) {
  const tokens = tokenize(html);
  let releaseDate = null;
  for (const t of tokens) {
    const m = DATE_RE.exec(t.text);
    if (m) {
      const mm = String(MONTHS.indexOf(m[1]) + 1).padStart(2, '0');
      releaseDate = `${m[3]}-${mm}-${m[2].padStart(2, '0')}`;
      break;
    }
  }

  const sections = [];
  let section = null;
  let scene = null;
  for (let i = 0; i < tokens.length; i++) {
    const { text, isTitle } = tokens[i];
    if (text === 'Latest Tools') {
      section = { header: i > 0 ? tokens[i - 1].text : '', scenes: [] };
      sections.push(section);
      scene = null;
    } else if (isTitle) {
      if (!section) { section = { header: '', scenes: [] }; sections.push(section); }
      scene = { title: text, slug: null, fhg: null, models: [], clips: [] };
      section.scenes.push(scene);
    } else if (scene) {
      if (text === 'Models:' && tokens[i + 1]) {
        scene.models = tokens[i + 1].text.split(/,\s*/).filter(Boolean);
        i++;
      } else if (text === 'Video FHG:' && tokens[i + 1]) {
        scene.fhg = tokens[i + 1].text;
        const path = scene.fhg.split(/[?#]/)[0].replace(/\/+$/, '');
        scene.slug = path.split('/').pop() || null;
        i++;
      } else if (/^\d+ Minutes$/.test(text)) {
        scene.clips.push(text);
      }
    }
  }
  return { releaseDate, sections };
}
