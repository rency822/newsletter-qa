// Minimal MIME parsing: subject, from, and the decoded text/html body.

function splitHeadBody(raw) {
  const text = raw.replace(/\r\n/g, '\n');
  const i = text.indexOf('\n\n');
  if (i < 0) return { head: text, body: '' };
  return { head: text.slice(0, i), body: text.slice(i + 2) };
}

function parseHeaders(head) {
  const headers = {};
  const unfolded = head.replace(/\n[ \t]+/g, ' ');
  for (const line of unfolded.split('\n')) {
    const m = /^([^:\s]+):\s*(.*)$/.exec(line);
    if (m) {
      const k = m[1].toLowerCase();
      if (!(k in headers)) headers[k] = m[2];
    }
  }
  return headers;
}

function bytesToString(bytes, charset = 'utf-8') {
  try {
    return new TextDecoder(charset).decode(Uint8Array.from(bytes));
  } catch {
    return new TextDecoder('utf-8').decode(Uint8Array.from(bytes));
  }
}

function decodeQPBytes(s, softBreaks) {
  if (softBreaks) s = s.replace(/=[ \t]*\n/g, '');
  const bytes = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) {
      bytes.push(parseInt(s.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      for (const b of new TextEncoder().encode(c)) bytes.push(b);
    }
  }
  return bytes;
}

function decodeBase64Bytes(s) {
  const bin = atob(s.replace(/[^A-Za-z0-9+/=]/g, ''));
  const bytes = [];
  for (let i = 0; i < bin.length; i++) bytes.push(bin.charCodeAt(i));
  return bytes;
}

function charsetOf(contentType) {
  const m = /charset\s*=\s*"?([^";\s]+)"?/i.exec(contentType || '');
  return m ? m[1] : 'utf-8';
}

function decodeBody(body, encoding, contentType) {
  const enc = (encoding || '').trim().toLowerCase();
  const cs = charsetOf(contentType);
  if (enc === 'quoted-printable') return bytesToString(decodeQPBytes(body, true), cs);
  if (enc === 'base64') return bytesToString(decodeBase64Bytes(body), cs);
  return body;
}

function decodeEncodedWords(s) {
  const unfolded = s.replace(/(\?=)\s+(=\?)/g, '$1$2');
  return unfolded.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_, cs, e, text) => {
    const bytes = e.toLowerCase() === 'b'
      ? decodeBase64Bytes(text)
      : decodeQPBytes(text.replace(/_/g, ' '), false);
    return bytesToString(bytes, cs);
  });
}

function findHtml(raw) {
  const { head, body } = splitHeadBody(raw);
  const h = parseHeaders(head);
  const ct = h['content-type'] || 'text/plain';
  if (/^multipart\//i.test(ct)) {
    const bm = /boundary\s*=\s*"?([^";]+)"?/i.exec(ct);
    if (!bm) return null;
    const delim = '--' + bm[1];
    const parts = body.split('\n').reduce((acc, line) => {
      if (line.trimEnd() === delim) acc.push([]);
      else if (line.trimEnd() === delim + '--') acc.push(null);
      else if (acc.length && acc[acc.length - 1]) acc[acc.length - 1].push(line);
      return acc;
    }, []).filter(Boolean);
    for (const p of parts) {
      const found = findHtml(p.join('\n'));
      if (found != null) return found;
    }
    return null;
  }
  if (/^text\/html/i.test(ct)) return decodeBody(body, h['content-transfer-encoding'], ct);
  return null;
}

export function parseEml(raw) {
  const { head } = splitHeadBody(raw);
  const h = parseHeaders(head);
  return {
    subject: decodeEncodedWords(h.subject || '').trim(),
    from: decodeEncodedWords(h.from || '').trim(),
    html: findHtml(raw) || '',
  };
}
