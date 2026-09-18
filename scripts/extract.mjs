/**
 * Pulls structured data out of the three guide documents.
 *
 * The guides are written to be machine-readable (that was the point of their
 * consistent per-week and per-row shapes), so these extractors assert loudly
 * when a shape changes rather than silently producing a half-empty site.
 */

import { readFileSync } from 'node:fs';
import { inline, mdToHtml, sections } from './lib-md.mjs';

export const DOCS = {
  pregnancy: readFileSync(new URL('../docs/pregnancy-guide.md', import.meta.url), 'utf8'),
  nico: readFileSync(new URL('../docs/nico-dad-guide.md', import.meta.url), 'utf8'),
  prayer: readFileSync(new URL('../docs/prayer-book.md', import.meta.url), 'utf8'),
  medical: readFileSync(new URL('../docs/medical-log.md', import.meta.url), 'utf8'),
};

/**
 * The due date the app runs on: 19 May 2027, as printed on the 18 Sept 2026
 * scan film ("EDD 05/19/2027") and derived from the mean sac diameter.
 *
 * Dani's own paperwork carries two dates. The report header gives EDC 21 May,
 * derived from LMP 14 Aug on a 28-day cycle; the film gives 19 May from the sac
 * measurement. They differ by two days. The app follows the scan because that
 * is where Dani is being told she is — 5w2d on 18 September, not 5w0d.
 *
 * The crown-rump-length scan supersedes both. Change this constant when it does.
 */
export const EDD = '2027-05-19';

/**
 * Check-up entries, newest first. Each is a `## <date> — <title>` section in
 * the medical log; the template block at the end of that file is skipped.
 */
export function extractCheckups() {
  const entries = [];
  const parts = DOCS.medical.split(/^## /m).slice(1);

  for (const part of parts) {
    const newline = part.indexOf('\n');
    const heading = part.slice(0, newline).trim();
    // Accepts an ISO date or a written one, including a range such as
    // "4-5 September 2026". Anything else is the template block at the end.
    const dated = /^\d{4}-\d{2}-\d{2}|^\d{1,2}(\s*[–-]\s*\d{1,2})?\s+\w+\s+\d{4}/.test(heading);
    if (!dated) continue;
    entries.push({
      heading: inline(heading),
      html: mdToHtml(part.slice(newline + 1).trim()),
    });
  }

  if (!entries.length) throw new Error('No check-up entries extracted');
  return entries;
}

/** Weeks 4-40, with the six fields each entry carries. */
export function extractWeeks() {
  const weeks = [];
  const blockRe = /^\*\*Week (\d+) — (.+?)\*\*\n((?:- \*.+\n?)+)/gm;
  let match;

  while ((match = blockRe.exec(DOCS.pregnancy))) {
    const [, num, size, body] = match;
    const fields = {};
    for (const line of body.trim().split('\n')) {
      const f = /^- \*(.+?):\*\s*(.+)$/.exec(line);
      if (f) fields[f[1].toLowerCase().replace(/\s+/g, '')] = inline(f[2]);
    }
    weeks.push({
      week: Number(num),
      size: inline(size),
      baby: fields.baby ?? '',
      you: fields.you ?? '',
      tests: fields.tests ?? '',
      nutrition: fields.nutrition ?? '',
      stretch: fields.stretch ?? '',
      filipino: fields.filipinolife ?? '',
    });
  }

  if (weeks.length !== 37) throw new Error(`Expected 37 weeks, extracted ${weeks.length}`);
  return weeks;
}

/** The per-week prayer and intention. */
export function extractWeeklyPrayers() {
  const prayers = new Map();
  const re = /^\*\*Week (\d+) — \*Intention: (.+?)\*\*\*\n((?:> .*\n?)+)/gm;
  let match;

  while ((match = re.exec(DOCS.prayer))) {
    const [, num, intention, quote] = match;
    prayers.set(Number(num), {
      intention: inline(intention.replace(/\.$/, '')),
      body: quote
        .trim()
        .split('\n')
        .map((l) => inline(l.replace(/^>\s?/, '')))
        .join('<br>'),
    });
  }

  if (prayers.size !== 37) throw new Error(`Expected 37 weekly prayers, got ${prayers.size}`);
  return prayers;
}

/** Every food row, tagged with the sub-heading it sat under. */
export function extractFoods() {
  const section = sections(DOCS.pregnancy).get('4. Food guide');
  if (!section) throw new Error('Food guide section not found');

  const foods = [];
  let category = 'General';

  for (const line of section.split('\n')) {
    const heading = /^### (.+)$/.exec(line);
    if (heading) {
      category = heading[1].replace(/ and /g, ' & ');
      continue;
    }
    const row = /^\|\s*(.+?)\s*\|\s*(safe|caution|avoid)\s*\|\s*(.+?)\s*\|$/.exec(line);
    if (row) {
      foods.push({
        name: inline(row[1]),
        plain: row[1].replace(/[*_`]/g, '').toLowerCase(),
        status: row[2],
        reason: inline(row[3]),
        category,
      });
    }
  }

  if (foods.length < 120) throw new Error(`Expected 120+ foods, extracted ${foods.length}`);
  return foods;
}

/** Caffeine presets, for the 200mg reference card. */
export function extractCaffeine() {
  const section = sections(DOCS.pregnancy).get('5. Caffeine');
  const rows = [];
  for (const line of section.split('\n')) {
    const m = /^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(\d+)\s*\|$/.exec(line);
    if (m) rows.push({ source: m[1], serving: m[2], mg: Number(m[3]) });
  }
  if (!rows.length) throw new Error('No caffeine rows extracted');
  return rows.sort((a, b) => b.mg - a.mg);
}

/** The liturgical year table, already carrying gestational ages. */
export function extractCalendar() {
  const section = sections(DOCS.prayer).get('8. The liturgical year, mapped to this pregnancy');
  const rows = [];
  for (const line of section.split('\n')) {
    const m = /^\|\s*\*{0,2}([\d-]+(?:\s*–\s*\d+)?)\*{0,2}\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/.exec(line);
    if (m && /^\d{4}-/.test(m[1])) {
      rows.push({ date: m[1], ga: m[2], feast: inline(m[3]), note: inline(m[4]) });
    }
  }
  if (!rows.length) throw new Error('No calendar rows extracted');
  return rows;
}

/**
 * Lines that are purely seed-pipeline annotation — `*`kind: daily`, `source:
 * original`*` and friends. They belong in the source documents, where they tell
 * the content pipeline what to build; on a page someone reads they are leftover
 * scaffolding. Annotations that carry real prose after the tag are left alone.
 */
const ANNOTATION_ONLY = /^\*`(kind|source|slug):[^`]*`(,\s*`(kind|source|slug):[^`]*`)*\.?\*$/;

/** Named sections rendered as prose, keyed by the id the site navigates to. */
export function renderSection(doc, heading) {
  const body = sections(DOCS[doc]).get(heading);
  if (!body) throw new Error(`Section not found in ${doc}: ${heading}`);
  const cleaned = body
    .split('\n')
    .filter((line) => !ANNOTATION_ONLY.test(line.trim()))
    .join('\n');
  return mdToHtml(cleaned);
}

export { mdToHtml, sections };
