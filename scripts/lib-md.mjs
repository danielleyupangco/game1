/**
 * A small Markdown -> HTML converter.
 *
 * Deliberately not a general-purpose parser: it handles exactly the subset the
 * three guide documents use, and emits class names this site styles. Doing the
 * conversion at build time keeps the published page self-contained, so it works
 * offline from a local file with no CDN dependency.
 */

const CODE_SENTINEL = '';

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Inline spans: code, bold, italic, links. Order matters — code is parked first. */
export function inline(text) {
  const codes = [];
  let out = escapeHtml(text).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `${CODE_SENTINEL}${codes.length - 1}${CODE_SENTINEL}`;
  });

  out = out
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(—])\*([^*]+)\*/g, '$1<em>$2</em>');

  const sentinel = new RegExp(`${CODE_SENTINEL}(\\d+)${CODE_SENTINEL}`, 'g');
  return out.replace(sentinel, (_, i) => `<code>${escapeHtml(codes[Number(i)])}</code>`);
}

const splitRow = (line) => line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

/** Block-level conversion. */
export function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  let para = [];

  const flushParagraph = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^---\s*$/.test(line)) {
      flushParagraph();
      out.push('<hr>');
      i += 1;
      continue;
    }

    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    // Blockquote — collected as a unit so multi-paragraph quotes hold together.
    if (line.startsWith('>')) {
      flushParagraph();
      const quote = [];
      while (
        i < lines.length &&
        (lines[i].startsWith('>') ||
          (quote.length && lines[i].trim() === '' && lines[i + 1] && lines[i + 1].startsWith('>')))
      ) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${mdToHtml(quote.join('\n'))}</blockquote>`);
      continue;
    }

    if (line.startsWith('|') && lines[i + 1] && /^\|[\s:|-]+\|$/.test(lines[i + 1])) {
      flushParagraph();
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      const thead = head.map((c) => `<th>${inline(c)}</th>`).join('');
      const tbody = rows
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
        .join('');
      out.push(
        `<div class="tw"><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`,
      );
      continue;
    }

    // Fenced code — the dad guide's stat-line blocks.
    if (line.startsWith('```')) {
      flushParagraph();
      i += 1;
      const code = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(`<pre class="statline">${escapeHtml(code.join('\n'))}</pre>`);
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^(\d+)\.\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      const items = [];
      while (i < lines.length) {
        const m = ordered ? /^(\d+)\.\s+(.*)$/.exec(lines[i]) : /^[-*]\s+(.*)$/.exec(lines[i]);
        if (!m) {
          // A wrapped continuation line belongs to the previous item.
          if (items.length && /^\s{2,}\S/.test(lines[i])) {
            items[items.length - 1] += ' ' + lines[i].trim();
            i += 1;
            continue;
          }
          break;
        }
        items.push(ordered ? m[2] : m[1]);
        i += 1;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      i += 1;
      continue;
    }

    para.push(line.trim());
    i += 1;
  }

  flushParagraph();
  return out.join('\n');
}

/** Splits a document into `## ` sections, keyed by heading text. */
export function sections(md) {
  const parts = md.split(/^## /m).slice(1);
  const map = new Map();
  for (const part of parts) {
    const newline = part.indexOf('\n');
    map.set(part.slice(0, newline).trim(), part.slice(newline + 1).trim());
  }
  return map;
}
