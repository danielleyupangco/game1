/**
 * Builds the single-file guide site from the three documents in /docs.
 *
 * Output is one self-contained HTML file: no build step at read time, no CDN
 * dependency beyond the webfont, so it opens from a local file as happily as
 * from a URL. Re-run after editing any guide.
 */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import {
  EDD,
  extractCheckups,
  extractVitals,
  extractCaffeine,
  extractCalendar,
  extractBudget,
  extractBuyList,
  DELIVERY,
  extractFoods,
  extractWeeklyPrayers,
  extractWeeks,
  renderSection,
} from './extract.mjs';

const weeks = extractWeeks();
const prayers = extractWeeklyPrayers();
const foods = extractFoods();
const caffeine = extractCaffeine();
const calendar = extractCalendar();
const checkups = extractCheckups();
const vitals = extractVitals();

/**
 * Scan images are inlined as data URIs rather than referenced as files, so the
 * page stays a single artefact that opens offline from disk. Both were
 * downscaled first; together they are under a megabyte.
 */
const image = (name) =>
  'data:image/jpeg;base64,' +
  readFileSync(new URL(`../docs/assets/${name}`, import.meta.url)).toString('base64');

const SCAN_SAC = image('scan-2026-09-18-sac.jpg');
const SCAN_FILMS = image('scan-2026-09-18-films.jpg');

/** Attach each feast to the week it falls in, so the week view can show it. */
const feastsByWeek = new Map();
for (const entry of calendar) {
  const w = Number(/^(\d+)w/.exec(entry.ga)?.[1] ?? -1);
  if (w < 4) continue;
  if (!feastsByWeek.has(w)) feastsByWeek.set(w, []);
  feastsByWeek.get(w).push(entry);
}

const trimesterOf = (w) => (w >= 28 ? 3 : w >= 14 ? 2 : 1);

const weekData = weeks.map((w) => ({
  ...w,
  trimester: trimesterOf(w.week),
  prayer: prayers.get(w.week) ?? null,
  feasts: feastsByWeek.get(w.week) ?? [],
}));

const prose = {
  dating: renderSection('pregnancy', '1. Dating and the key dates'),
  tests: renderSection('pregnancy', '2. Tests and appointments by stage'),
  nutrients: renderSection('pregnancy', '6. Nutrients that matter'),
  move: renderSection('pregnancy', '7. Movement and stretching'),
  travel: renderSection('pregnancy', '8. Travel'),
  money: renderSection('pregnancy', '9. Costs and benefits (PHP)'),
  shops: renderSection('pregnancy', '10. Shopping — Makati and BGC'),
  milestones: renderSection('pregnancy', '11. Filipino milestones and traditions'),
  redFlags: renderSection('pregnancy', '12. Red flags'),
  sources: renderSection('pregnancy', 'How to read the source notes'),

  nicoTrimesters: renderSection('nico', '1. The three trimesters, as stat lines'),
  nicoStages: renderSection('nico', '2. What to do, by stage'),
  nicoPlaybook: renderSection('nico', '3. Birth-partner playbook'),
  nicoHospital: renderSection('nico', '4. At Makati Medical Center'),
  nicoLeave: renderSection('nico', '5. Paternity leave — how to actually get it'),
  nicoAfter: renderSection('nico', '6. After the birth — what to watch for'),
  nicoSkills: renderSection('nico', '7. The practical skills'),
  nicoWellbeing: renderSection('nico', "8. Nico's own wellbeing"),
  nicoDontSay: renderSection('nico', '9. The "don\'t say this" deck'),
  nicoLolas: renderSection('nico', '10. Lolas, titas, and pamahiin'),
  nicoBag: renderSection('nico', "11. Nico's timeline and go-bag"),

  prayerDaily: renderSection('prayer', '1. The daily rhythm'),
  prayerMoments: renderSection('prayer', '2. Prayers for the moments'),
  prayerTraditional: renderSection('prayer', '4. The traditional prayers, in full'),
  prayerNovena: renderSection('prayer', '5. A novena to St Gerard Majella'),
  prayerRosary: renderSection('prayer', '6. The Joyful Mysteries, prayed as a pregnant woman'),
  prayerDevotions: renderSection('prayer', '7. The Philippine devotions'),
  prayerNico: renderSection('prayer', '9. Prayers for Nico'),
  prayerAfter: renderSection('prayer', '10. After the birth'),
  prayerGrief: renderSection('prayer', '11. If the news is not good'),

  actions: renderSection('medical', 'Action steps'),
  vitals: renderSection('medical', 'Vitals'),
  glossary: renderSection('medical', 'Plain English'),
  birthday: renderSection('pregnancy', '13. Birth day — dates and signs'),
  birthplan: renderSection('pregnancy', '14. Birth plan — caesarean or vaginal'),
  sleep: renderSection('pregnancy', '15. Sleep'),
  runup: renderSection('pregnancy', '16. The run-up — help, the care team, and what happens when'),
};

const budget = extractBudget();
const buy = extractBuyList();

const data = JSON.stringify({ edd: EDD, weeks: weekData, foods, caffeine, calendar, vitals, budget, delivery: DELIVERY, buy })
  .replace(/</g, '\\u003c');

const LOGO = `<svg viewBox="0 0 48 48" aria-hidden="true" class="mark">
<circle cx="11" cy="13" r="6" fill="var(--blush)"/><circle cx="37" cy="13" r="6" fill="var(--blush)"/>
<circle cx="24" cy="26" r="15" fill="var(--blush)"/>
<g stroke="var(--blush-deep)" stroke-width="1.5" stroke-linecap="round">
${Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
  const f = (n) => n.toFixed(2);
  return `<line x1="${f(24 + Math.cos(a) * 4.5)}" y1="${f(26 + Math.sin(a) * 4.5)}" x2="${f(24 + Math.cos(a) * 8.5)}" y2="${f(26 + Math.sin(a) * 8.5)}"/>`;
}).join('')}
</g><circle cx="24" cy="26" r="4" fill="var(--butter)" stroke="var(--blush-deep)" stroke-width="1.5"/></svg>`;

const TABS = [
  ['weeks', 'Weeks'],
  ['food', 'Food'],
  ['move', 'Move'],
  ['sleep', 'Sleep'],
  ['travel', 'Travel'],
  ['money', 'Money'],
  ['runup', 'Run-up'],
  ['buy', 'Buy'],
  ['prayers', 'Prayers'],
  ['nico', 'Nico'],
  ['checkups', 'Check-ups'],
  ['birth', 'Birth'],
  ['calendar', 'Calendar'],
];

const panel = (id, title, body, extra = '') =>
  `<section class="view" id="view-${id}" hidden><h2 class="view-title">${title}</h2>${extra}${body}</section>`;

const html = `<title>The Cub Handbook</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Nunito:wght@400;600;700&display=swap">
<style>
:root{
  --cream:#FBF7F0; --blush:#F4D9D9; --sage:#CDE0D0; --powder:#CFE0EC; --butter:#F6EBC8;
  --blush-deep:#8C4F4F; --sage-deep:#3F6B49; --powder-deep:#3C6383; --butter-deep:#7A6222;
  --bg:var(--cream); --surface:#FFFFFF; --surface-2:#F5EFE5;
  --fg:#4A4A4A; --fg-mute:#6D6A66; --line:#E6DDD0;
  --safe-bg:#E4EFE6; --safe-fg:#35603F;
  --caution-bg:#F7EDD2; --caution-fg:#6E571C;
  --avoid-bg:#F3DEDC; --avoid-fg:#8E3A32;
  --shadow:0 1px 2px rgba(74,74,74,.04), 0 10px 28px -16px rgba(74,74,74,.18);
  --display:"Fraunces",ui-serif,Georgia,serif;
  --body:"Nunito",ui-sans-serif,system-ui,sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  color-scheme:light;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#201D1B; --surface:#2A2624; --surface-2:#332E2B;
  --fg:#EDE7DF; --fg-mute:#B3AAA0; --line:#413A36;
  --blush:#5B4344; --sage:#3E5245; --powder:#3A4B57; --butter:#4E452C;
  --blush-deep:#F0CFCF; --sage-deep:#BCDCC3; --powder-deep:#9CC2DC; --butter-deep:#E2CE93;
  --safe-bg:#2C3F31; --safe-fg:#AFD4B8;
  --caution-bg:#413720; --caution-fg:#E4CE96;
  --avoid-bg:#432C2A; --avoid-fg:#EFB3AA;
  --shadow:0 1px 2px rgba(0,0,0,.3), 0 10px 28px -16px rgba(0,0,0,.6);
  color-scheme:dark;
}}
:root[data-theme="dark"]{
  --bg:#201D1B; --surface:#2A2624; --surface-2:#332E2B;
  --fg:#EDE7DF; --fg-mute:#B3AAA0; --line:#413A36;
  --blush:#5B4344; --sage:#3E5245; --powder:#3A4B57; --butter:#4E452C;
  --blush-deep:#F0CFCF; --sage-deep:#BCDCC3; --powder-deep:#9CC2DC; --butter-deep:#E2CE93;
  --safe-bg:#2C3F31; --safe-fg:#AFD4B8;
  --caution-bg:#413720; --caution-fg:#E4CE96;
  --avoid-bg:#432C2A; --avoid-fg:#EFB3AA;
  --shadow:0 1px 2px rgba(0,0,0,.3), 0 10px 28px -16px rgba(0,0,0,.6);
  color-scheme:dark;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--body);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:var(--display);font-weight:600;line-height:1.2;text-wrap:balance;margin:0}
a{color:var(--powder-deep)}
hr{border:0;border-top:1px solid var(--line);margin:2rem 0}
code{font-family:var(--mono);font-size:.85em;background:var(--surface-2);padding:.1em .35em;border-radius:4px}
:focus-visible{outline:2px solid var(--powder-deep);outline-offset:2px;border-radius:4px}

header.top{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.top-in{max-width:1080px;margin:0 auto;padding-block:.6rem;padding-inline:16px;display:flex;align-items:center;gap:.65rem}
.mark{width:34px;height:34px;flex:none}
.wordmark{font-family:var(--display);font-weight:600;font-size:1.05rem;letter-spacing:-.01em}
.top-sub{color:var(--fg-mute);font-size:.72rem;display:block;font-family:var(--body);letter-spacing:.06em;text-transform:uppercase}
.top-actions{margin-left:auto;display:flex;gap:.4rem}
.iconbtn{min-width:40px;height:40px;border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:12px;cursor:pointer;font-size:1rem;display:grid;place-items:center;padding:0 .6rem;font-family:var(--body)}
.iconbtn.alarm{background:var(--blush);color:var(--blush-deep);border-color:transparent;font-weight:700;font-size:.8rem;gap:.35rem}

nav.tabs{position:sticky;top:calc(env(safe-area-inset-top,0px) + 52px);z-index:19;background:var(--bg);border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none}
nav.tabs::-webkit-scrollbar{display:none}
.tabs-in{max-width:1080px;margin:0 auto;padding-inline:16px;display:flex;gap:.15rem}
.tab{flex:none;border:0;background:none;color:var(--fg-mute);font-family:var(--body);font-weight:700;font-size:.85rem;padding:.7rem .7rem;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap}
.tab[aria-selected="true"]{color:var(--blush-deep);border-bottom-color:var(--blush-deep)}

main{max-width:1080px;margin:0 auto;padding-inline:16px;padding-block:1.5rem 4rem}
.view-title{font-size:1.75rem;margin-bottom:.25rem}
.lede{color:var(--fg-mute);margin:0 0 1.5rem;max-width:62ch}

.hero{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:1.25rem;box-shadow:var(--shadow);display:flex;flex-wrap:wrap;gap:1rem;align-items:center;margin-bottom:1.5rem}
.hero-now{font-family:var(--display);font-size:2.1rem;line-height:1;letter-spacing:-.02em}
.hero-meta{color:var(--fg-mute);font-size:.9rem}
.hero-right{margin-left:auto;text-align:right}
.hero-count{font-family:var(--display);font-size:1.5rem;font-variant-numeric:tabular-nums}

.tri{margin-bottom:1.25rem}
.tri-h{font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--fg-mute);margin-bottom:.45rem}
.rail{display:flex;flex-wrap:wrap;gap:.3rem}
.wk{width:44px;height:44px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--fg);font-family:var(--body);font-weight:700;font-size:.9rem;cursor:pointer;font-variant-numeric:tabular-nums;position:relative}
.wk[data-tri="1"]:hover{background:var(--blush)}
.wk[data-tri="2"]:hover{background:var(--sage)}
.wk[data-tri="3"]:hover{background:var(--powder)}
.wk[aria-pressed="true"]{background:var(--blush-deep);color:var(--bg);border-color:transparent}
.wk.is-now::after{content:"";position:absolute;inset-inline:10px;bottom:5px;height:2px;border-radius:2px;background:var(--butter-deep)}
.wk[aria-pressed="true"].is-now::after{background:var(--bg)}
.wk.has-feast{box-shadow:inset 0 3px 0 -1px var(--powder-deep)}

.wkcard{background:var(--surface);border:1px solid var(--line);border-radius:20px;box-shadow:var(--shadow);overflow:hidden}
.wkcard-h{padding:1.1rem 1.25rem;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:.5rem;align-items:baseline}
.wkcard-h h3{font-size:1.5rem}
.size{color:var(--fg-mute);font-size:.9rem}
.chip{font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:.25rem .55rem;border-radius:999px;background:var(--surface-2);color:var(--fg-mute)}
.chip.t1{background:var(--blush);color:var(--blush-deep)}
.chip.t2{background:var(--sage);color:var(--sage-deep)}
.chip.t3{background:var(--powder);color:var(--powder-deep)}
.fields{display:grid;gap:0}
.field{display:grid;grid-template-columns:104px 1fr;gap:1rem;padding:.85rem 1.25rem;border-bottom:1px solid var(--line)}
.field:last-child{border-bottom:0}
.field dt{font-size:.68rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--fg-mute);padding-top:.2rem}
.field dd{margin:0}
@media (max-width:560px){.field{grid-template-columns:1fr;gap:.2rem}}

.aside{margin-top:1rem;border-radius:20px;padding:1.1rem 1.25rem;border:1px solid var(--line)}
.aside.prayer{background:var(--surface);border-left:3px solid var(--powder-deep)}
.aside-h{font-size:.68rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--powder-deep);margin-bottom:.4rem}
.intention{font-family:var(--display);font-size:1.05rem;margin-bottom:.5rem}
.prayer-body{font-family:var(--display);font-size:1rem;line-height:1.75;color:var(--fg)}
.feast{display:flex;gap:.6rem;align-items:baseline;font-size:.9rem;padding:.3rem 0}
.feast b{font-family:var(--display)}
.feast .d{color:var(--fg-mute);font-variant-numeric:tabular-nums;font-size:.8rem;flex:none}

.tools{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem;align-items:center}
input[type=search]{flex:1 1 220px;min-width:0;height:44px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--fg);padding:0 .9rem;font-family:var(--body);font-size:1rem}
.filt{height:36px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--fg-mute);font-family:var(--body);font-weight:700;font-size:.78rem;padding:0 .8rem;cursor:pointer}
.filt[aria-pressed="true"]{background:var(--fg);color:var(--bg);border-color:transparent}
.filt[data-s="safe"][aria-pressed="true"]{background:var(--safe-fg);color:var(--safe-bg)}
.filt[data-s="caution"][aria-pressed="true"]{background:var(--caution-fg);color:var(--caution-bg)}
.filt[data-s="avoid"][aria-pressed="true"]{background:var(--avoid-fg);color:var(--avoid-bg)}
.count{color:var(--fg-mute);font-size:.82rem;margin-left:auto}

.foods{display:grid;gap:.4rem}
.food{display:grid;grid-template-columns:1fr auto;gap:.2rem .8rem;background:var(--surface);border:1px solid var(--line);border-left-width:3px;border-radius:12px;padding:.7rem .9rem}
.food[data-s="safe"]{border-left-color:var(--safe-fg)}
.food[data-s="caution"]{border-left-color:var(--caution-fg)}
.food[data-s="avoid"]{border-left-color:var(--avoid-fg)}
.food b{font-weight:700}
.food .why{grid-column:1/-1;color:var(--fg-mute);font-size:.88rem}
.pill{font-size:.66rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:.2rem .5rem;border-radius:999px;height:fit-content}
.pill.safe{background:var(--safe-bg);color:var(--safe-fg)}
.pill.caution{background:var(--caution-bg);color:var(--caution-fg)}
.pill.avoid{background:var(--avoid-bg);color:var(--avoid-fg)}
.cat{font-size:.66rem;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-mute);margin:.9rem 0 .1rem;font-weight:700}
.empty{color:var(--fg-mute);padding:2rem 0;text-align:center}

.caf{display:grid;grid-template-columns:1fr auto;gap:.15rem .8rem;align-items:center;padding:.5rem .9rem;border-bottom:1px solid var(--line)}
.caf:last-child{border-bottom:0}
.caf .s{color:var(--fg-mute);font-size:.82rem;grid-column:1}
.caf .mg{font-family:var(--mono);font-variant-numeric:tabular-nums;font-weight:700;grid-row:1/3}
.bar{grid-column:1/-1;height:4px;border-radius:2px;background:var(--surface-2);overflow:hidden}
.bar i{display:block;height:100%;background:var(--butter-deep)}
.bar.over i{background:var(--avoid-fg)}

.prose{max-width:68ch}
.prose h3{font-size:1.25rem;margin:2rem 0 .5rem}
.prose h4{font-size:1rem;margin:1.4rem 0 .35rem}
.prose p{margin:.7rem 0}
.prose ul,.prose ol{margin:.7rem 0;padding-left:1.2rem}
.prose li{margin:.3rem 0}
.prose blockquote{margin:1rem 0;padding:.85rem 1.1rem;background:var(--surface);border-left:3px solid var(--blush-deep);border-radius:0 14px 14px 0}
.prose blockquote p{margin:.35rem 0}
.prose em{color:var(--fg-mute)}
.tw{overflow-x:auto;margin:1rem 0;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:.9rem;min-width:420px}
th,td{text-align:left;padding:.55rem .75rem;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:.68rem;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-mute);white-space:nowrap}
tr:last-child td{border-bottom:0}
.statline{font-family:var(--mono);font-size:.78rem;line-height:1.7;background:var(--surface-2);padding:.9rem 1rem;border-radius:14px;overflow-x:auto;border:1px solid var(--line)}

.nico .prose blockquote{border-left-color:var(--sage-deep)}
.nico .view-title{color:var(--sage-deep)}
.prayers .prose blockquote{border-left-color:var(--powder-deep);font-family:var(--display);font-size:1.02rem;line-height:1.75}
.flags .prose blockquote{border-left-color:var(--blush-deep)}
.flags .prose ul li::marker{color:var(--blush-deep)}

details.grief{margin-top:2rem;border:1px dashed var(--line);border-radius:14px;padding:.9rem 1.1rem;background:var(--surface)}
details.grief summary{cursor:pointer;font-weight:700;color:var(--fg-mute);font-size:.92rem}
details.grief[open] summary{margin-bottom:.5rem}

.sub{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:1.25rem}
.subtab{border:1px solid var(--line);background:var(--surface);color:var(--fg-mute);border-radius:999px;padding:.35rem .75rem;font-family:var(--body);font-weight:700;font-size:.78rem;cursor:pointer}
.subtab[aria-selected="true"]{background:var(--surface-2);color:var(--fg);border-color:var(--fg-mute)}

.actions{background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--butter-deep);border-radius:20px;padding:1.1rem 1.25rem;margin-bottom:1.5rem;box-shadow:var(--shadow)}
.actions-h{display:flex;flex-wrap:wrap;gap:.5rem .7rem;align-items:center;margin-bottom:.35rem}
.actions-h h2{font-size:1.2rem}
.deadline{font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--butter-deep);background:var(--butter);padding:.25rem .55rem;border-radius:999px}
.deadline.past{color:var(--avoid-fg);background:var(--avoid-bg)}
.actions-body h3{font-size:.72rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--fg-mute);margin:1.1rem 0 .3rem;font-family:var(--body)}
.actions-body > p:first-child{font-size:.88rem;color:var(--fg-mute);margin-top:.2rem}
.actions-body ul{margin:.3rem 0;padding-left:1.2rem}
.actions-body li.task{margin:.45rem 0}
.actions-body hr{display:none}
.installtip{margin-top:1.5rem;padding:.75rem 1rem;border:1px dashed var(--line);border-radius:14px;font-size:.85rem;color:var(--fg-mute);text-align:center}
.buys{display:grid;gap:.6rem}
.buy{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:.75rem .9rem;box-shadow:var(--shadow);display:grid;grid-template-columns:auto 1fr;gap:.2rem .75rem;align-items:start}
.buy.done{opacity:.5}
.buy.done .bn{text-decoration:line-through}
.buy input[type=checkbox]{grid-row:1/3;width:22px;height:22px;margin-top:.15rem;accent-color:var(--blush-deep);cursor:pointer;flex:none}
.buy .bh{display:flex;flex-wrap:wrap;gap:.4rem;align-items:baseline}
.buy .bn{font-weight:700;font-size:.98rem}
.buy .bbrand{font-size:.8rem;color:var(--fg-mute)}
.buy .bmeta{grid-column:2;display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;margin-top:.35rem}
.tag{font-size:.66rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:.16rem .45rem;border-radius:999px;border:1px solid transparent;white-space:nowrap}
.tag.p-High{background:var(--blush);color:var(--blush-deep)}
.tag.p-Medium{background:var(--butter);color:var(--butter-deep)}
.tag.p-Low{background:var(--surface-2);color:var(--fg-mute);border-color:var(--line)}
.tag.cat{background:var(--surface-2);color:var(--fg-mute);border-color:var(--line)}
.tag.v-must{background:var(--sage);color:var(--sage-deep)}
.tag.v-skip{background:var(--avoid-bg);color:var(--avoid-fg)}
.tag.src-Added{background:var(--powder);color:var(--powder-deep)}
.tag.cost{background:transparent;border-color:var(--line);color:var(--fg-mute);font-variant-numeric:tabular-nums}
.buy .bnote{grid-column:2;font-size:.82rem;color:var(--fg-mute);margin-top:.4rem;line-height:1.5}
.buy .blinks{grid-column:2;display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem}
.buy .blinks a{font-size:.78rem;font-weight:700;color:var(--powder-deep);text-decoration:none;border-bottom:1px solid currentColor;padding-bottom:1px}
.buy .blinks a.orig{color:var(--fg-mute)}
.buysum{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:.8rem .9rem;margin-bottom:.9rem;font-size:.85rem;color:var(--fg-mute);box-shadow:var(--shadow)}
.buysum b{color:var(--fg)}
.tot{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:1rem 1.15rem;margin-bottom:1.5rem;box-shadow:var(--shadow)}
.tot h3{font-size:1.2rem;margin-bottom:.15rem}
.tot .sub{font-size:.8rem;color:var(--fg-mute);margin-bottom:.9rem}
.totrow{display:grid;grid-template-columns:1fr auto;gap:.15rem .7rem;align-items:baseline;padding:.5rem 0;border-bottom:1px solid var(--line)}
.totrow:last-child{border-bottom:0}
.totrow.grand{border-top:2px solid var(--blush-deep);border-bottom:0;margin-top:.3rem;padding-top:.7rem}
.totrow .lbl{font-weight:700;font-size:.92rem}
.totrow.grand .lbl{font-size:1rem}
.totrow .amt{font-variant-numeric:tabular-nums;font-weight:700;white-space:nowrap}
.totrow.grand .amt{font-size:1.1rem;color:var(--blush-deep)}
.totrow .note{grid-column:1/-1;font-size:.76rem;color:var(--fg-mute)}
.totrow.opt .lbl,.totrow.opt .amt{font-weight:400;color:var(--fg-mute)}
.tot .seg{display:flex;gap:.4rem;margin-bottom:.9rem;flex-wrap:wrap}
.tot .seg button{min-height:40px;padding:0 .85rem;border-radius:999px;border:1px solid var(--line);background:var(--bg);color:var(--fg);font-family:var(--body);font-size:.82rem;font-weight:700;cursor:pointer}
.tot .seg button[aria-pressed="true"]{background:var(--blush);border-color:var(--blush-deep);color:var(--blush-deep)}
.tot .cav{font-size:.76rem;color:var(--fg-mute);border-top:1px solid var(--line);padding-top:.7rem;margin:1rem 0 0}
.yform{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.6rem;margin-bottom:1rem}
.yform label{display:flex;flex-direction:column;gap:.2rem;font-size:.7rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-mute)}
.yform input{min-height:44px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--fg);padding:0 .7rem;font-family:var(--body);font-size:1rem}
.slog{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:1rem 1.15rem;margin-bottom:1.5rem;box-shadow:var(--shadow)}
.slog-h{display:flex;flex-wrap:wrap;gap:.5rem;align-items:baseline;margin-bottom:.7rem}
.slog-h h3{font-size:1.2rem}
.slog-h span{font-size:.8rem;color:var(--fg-mute)}
.slog-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.6rem;margin-bottom:1rem}
.slog-form label{display:flex;flex-direction:column;gap:.2rem;font-size:.7rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-mute)}
.slog-form input{min-height:44px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--fg);padding:0 .7rem;font-family:var(--body);font-size:1rem}
.slogbtn{min-height:44px;align-self:end;border:0;border-radius:12px;background:var(--blush-deep);color:#fff;font-family:var(--body);font-weight:700;font-size:.85rem;cursor:pointer}
.sbars{display:flex;align-items:flex-end;gap:3px;height:92px;padding:.4rem 0 0;border-bottom:1px solid var(--line);margin-bottom:.3rem}
.sbar{flex:1;min-width:6px;border-radius:4px 4px 0 0;background:var(--powder);position:relative}
.sbar[data-band="low"]{background:var(--caution-bg)}
.sbar[data-band="poor"]{background:var(--avoid-bg)}
.sbar.last{background:var(--powder-deep)}
.sbar span{position:absolute;top:-1.05rem;left:50%;transform:translateX(-50%);font-size:.62rem;font-weight:700;color:var(--fg-mute);font-variant-numeric:tabular-nums}
.saxis{display:flex;justify-content:space-between;font-size:.62rem;color:var(--fg-mute);margin-bottom:.9rem}
.srow{display:grid;grid-template-columns:auto 1fr auto;gap:.2rem .7rem;align-items:baseline;padding:.45rem 0;border-bottom:1px solid var(--line)}
.srow:last-of-type{border-bottom:0}
.srow .sd{font-variant-numeric:tabular-nums;font-size:.85rem;font-weight:700}
.srow .sw{font-size:.7rem;color:var(--powder-deep);font-weight:700}
.srow .ss{font-variant-numeric:tabular-nums;font-weight:700}
.srow .sfoot{grid-column:1/-1;display:flex;gap:.7rem;align-items:baseline;justify-content:space-between;font-size:.78rem;color:var(--fg-mute)}
.sdel{border:0;background:none;color:var(--fg-mute);cursor:pointer;font-size:.72rem;padding:.2rem 0;text-decoration:underline;flex:none}
.slog-empty{color:var(--fg-mute);font-size:.9rem;padding:.6rem 0 1rem}
.slog-note{font-size:.76rem;color:var(--fg-mute);border-top:1px solid var(--line);padding-top:.7rem;margin:1rem 0 0}
.vitals{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:1rem 1.15rem;margin-bottom:1.5rem;box-shadow:var(--shadow)}
.vitals-h{display:flex;flex-wrap:wrap;gap:.5rem;align-items:baseline;margin-bottom:.6rem}
.vitals-h .subtab{margin-left:auto}
.vitals-h h3{font-size:1.2rem}
.vitals-h span{font-size:.8rem;color:var(--fg-mute)}
.vgroup{font-size:.66rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--fg-mute);margin:.9rem 0 .35rem}
.vrow{display:grid;grid-template-columns:1fr auto;gap:.1rem .7rem;align-items:baseline;padding:.45rem 0;border-bottom:1px solid var(--line)}
.vrow:last-child{border-bottom:0}
.vrow .vn{font-weight:700;font-size:.92rem}
.vrow .vv{font-variant-numeric:tabular-nums;text-align:right;font-size:.92rem}
.vrow .vp{grid-column:1/-1;font-size:.86rem;margin-top:.05rem}
.vrow .vr{grid-column:1/-1;font-size:.74rem;color:var(--fg-mute);margin-top:.1rem}
.vpill{display:inline-flex;align-items:center;gap:.3rem;font-size:.62rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:.15rem .45rem;border-radius:999px;margin-left:.4rem;vertical-align:.08em}
.vpill.good{background:var(--safe-bg);color:var(--safe-fg)}
.vpill.watch{background:var(--caution-bg);color:var(--caution-fg)}
.vpill.urgent{background:var(--avoid-bg);color:var(--avoid-fg)}
.vpill.pending{background:var(--surface-2);color:var(--fg-mute)}
.firstlook{margin:0 0 1.5rem;background:var(--surface);border:1px solid var(--line);border-radius:20px;overflow:hidden;box-shadow:var(--shadow)}
.firstlook img{display:block;width:100%;height:auto}
.firstlook figcaption{padding:.9rem 1.1rem;font-size:.9rem;color:var(--fg-mute);border-top:1px solid var(--line)}
.firstlook figcaption b{color:var(--fg);font-family:var(--display);font-weight:600}
details.films{margin-top:1.5rem;border:1px solid var(--line);border-radius:16px;padding:.8rem 1rem;background:var(--surface)}
details.films summary{cursor:pointer;font-weight:700;font-size:.9rem;color:var(--fg-mute)}
details.films img{display:block;width:100%;height:auto;margin-top:.8rem;border-radius:10px}
.prose li.task{list-style:none;margin-left:-1.25rem;display:flex;gap:.55rem;align-items:flex-start}
.prose li.task input{margin-top:.45rem;flex:none;accent-color:var(--blush-deep)}
.stage{margin-top:1rem;border-top:1px solid var(--line);padding-top:.9rem}
.stage h3{font-size:1rem;margin-bottom:.2rem}
.stage p{margin:.2rem 0 .6rem;font-size:.9rem;color:var(--fg-mute)}
.bd-summary{display:flex;flex-wrap:wrap;gap:.75rem;background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:1rem 1.15rem;box-shadow:var(--shadow);margin-bottom:1rem}
.bd-summary div{flex:1 1 130px}
.bd-summary dt{font-size:.66rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--fg-mute)}
.bd-summary dd{margin:.1rem 0 0;font-family:var(--display);font-size:1.15rem}
.bd-detail{background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--blush-deep);border-radius:20px;padding:1rem 1.15rem;margin-bottom:1rem;box-shadow:var(--shadow)}
.bd-detail h3{font-size:1.3rem;margin-bottom:.15rem}
.bd-detail .ga{color:var(--fg-mute);font-size:.9rem;margin-bottom:.6rem}
.bd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:.55rem}
.bd-grid div{background:var(--surface-2);border-radius:12px;padding:.5rem .7rem}
.bd-grid dt{font-size:.62rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--fg-mute)}
.bd-grid dd{margin:.1rem 0 0;font-weight:700}
.band{display:inline-block;font-size:.66rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:.2rem .5rem;border-radius:999px}
.band.pre{background:var(--surface-2);color:var(--fg-mute)}
.band.early{background:var(--caution-bg);color:var(--caution-fg)}
.band.full{background:var(--safe-bg);color:var(--safe-fg)}
.band.late{background:var(--powder);color:var(--powder-deep)}
.band.post{background:var(--avoid-bg);color:var(--avoid-fg)}
.bd-legend{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.9rem}
.bd-month{margin-bottom:1.25rem}
.bd-month h3{font-size:.8rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--fg-mute);margin-bottom:.4rem;font-family:var(--body)}
.bd-dow,.bd-days{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.bd-dow span{text-align:center;font-size:.62rem;font-weight:700;color:var(--fg-mute);padding-bottom:.2rem}
.bd-day{aspect-ratio:1;border:1px solid var(--line);border-radius:10px;background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;cursor:pointer;font-family:var(--body);color:var(--fg);padding:0;min-width:0}
.bd-day:disabled{cursor:default;opacity:.45}
.bd-day .n{font-size:.82rem;font-weight:700;font-variant-numeric:tabular-nums}
.bd-day .g{font-size:.54rem;color:var(--fg-mute);font-variant-numeric:tabular-nums}
.bd-day[data-band="early"]{background:var(--caution-bg);border-color:transparent}
.bd-day[data-band="full"]{background:var(--safe-bg);border-color:transparent}
.bd-day[data-band="late"]{background:var(--powder);border-color:transparent}
.bd-day[data-band="post"]{background:var(--avoid-bg);border-color:transparent}
.bd-day.edd{outline:2px solid var(--blush-deep);outline-offset:-2px}
.bd-day[aria-pressed="true"]{box-shadow:0 0 0 3px var(--blush-deep) inset}
.bd-blank{aspect-ratio:1}
.cal{display:grid;gap:.4rem}
.calrow{display:grid;grid-template-columns:96px 62px 1fr;gap:.8rem;align-items:baseline;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:.6rem .85rem}
.calrow .d{font-variant-numeric:tabular-nums;font-size:.82rem;color:var(--fg-mute)}
.calrow .g{font-family:var(--mono);font-size:.78rem;color:var(--powder-deep);font-weight:700}
.calrow .n{grid-column:1/-1;color:var(--fg-mute);font-size:.86rem}
@media (max-width:560px){.calrow{grid-template-columns:96px 1fr}}

footer{border-top:1px solid var(--line);margin-top:3rem;padding-top:1.25rem;color:var(--fg-mute);font-size:.84rem;max-width:68ch}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
</style>

<header class="top">
  <div class="top-in">
    ${LOGO}
    <div><span class="wordmark">The Cub Handbook</span><span class="top-sub">Dani &amp; Nico &middot; Makati</span></div>
    <div class="top-actions">
      <button class="iconbtn" id="theme" type="button" aria-label="Switch theme">&#9681;</button>
      <button class="iconbtn alarm" id="toflags" type="button">When to call</button>
    </div>
  </div>
</header>

<nav class="tabs"><div class="tabs-in" role="tablist">
${TABS.map(([id, label], n) => `<button class="tab" role="tab" id="tab-${id}" data-view="${id}" aria-selected="${n === 0}">${label}</button>`).join('')}
</div></nav>

<main>
<section class="view" id="view-weeks">
  <div class="hero">
    <div>
      <div class="hero-now" id="now-week">&nbsp;</div>
      <div class="hero-meta" id="now-meta">&nbsp;</div>
    </div>
    <div class="hero-right">
      <div class="hero-count" id="now-count">&nbsp;</div>
      <div class="hero-meta">until ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(EDD + 'T00:00:00Z'))}</div>
    </div>
  </div>
  <section class="actions" aria-labelledby="actions-h">
    <div class="actions-h">
      <h2 id="actions-h">What needs doing</h2>
      <span class="deadline" id="scan-deadline"></span>
    </div>
    <div class="prose actions-body">${prose.actions}</div>
    <div id="stage-prompt"></div>
  </section>

  <div id="rails"></div>
  <div id="weekcard"></div>
  <p class="installtip">On iPhone: <b>Share &rarr; Add to Home Screen</b> puts this one tap away, and the week updates itself each morning.</p>
</section>

${panel('food', 'Food', `<div id="foodlist" class="foods"></div>
  <div class="prose" id="nutrients">
    <h3 style="font-family:var(--display);font-size:1.25rem;margin:2.5rem 0 .3rem">Nutrients that matter</h3>
    <p class="lede">The eight that do the work, where to find them locally, and how to tell where your iron actually stands.</p>
    ${prose.nutrients}
  </div>`,
  `<p class="lede">131 items. Most of them are fine &mdash; the list leads with reassurance and saves <b>avoid</b> for genuine risk.</p>
   <div class="tools">
     <input type="search" id="foodq" placeholder="Search kinilaw, tuyo, cheese&hellip;" aria-label="Search foods">
     <button class="filt" data-s="safe" aria-pressed="false" type="button">Safe</button>
     <button class="filt" data-s="caution" aria-pressed="false" type="button">Caution</button>
     <button class="filt" data-s="avoid" aria-pressed="false" type="button">Avoid</button>
     <span class="count" id="foodcount"></span>
   </div>`)}

${panel('move', 'Move', `<div class="prose">${prose.move}</div>`)}
${panel('sleep', 'Sleep', `
  <section class="slog">
    <div class="slog-h"><h3>Sleep log</h3><span id="slog-summary"></span></div>
    <form id="slog-form" class="slog-form">
      <label>Night of <input type="date" id="s-date" required></label>
      <label>Sleep score <input type="number" id="s-score" min="0" max="100" inputmode="numeric" placeholder="0&ndash;100"></label>
      <label>Hours slept <input type="number" id="s-hours" min="0" max="16" step="0.1" inputmode="decimal" placeholder="7.2"></label>
      <label>Resting HR <input type="number" id="s-hr" min="30" max="140" inputmode="numeric" placeholder="bpm"></label>
      <label>Note <input type="text" id="s-note" maxlength="60" placeholder="up at 3am, nausea&hellip;"></label>
      <button class="slogbtn" type="submit">Save night</button>
    </form>
    <div id="slog-chart"></div>
    <div id="slog-list"></div>
    <p class="slog-note">Saved on this device only, in this browser. Not synced, not shared, and not visible to anyone you send the link to.</p>
  </section>
  <div class="prose">${prose.sleep}</div>`,
  `<p class="lede">What helps depends on the stage, and right now the most useful thing is what you <em>don&rsquo;t</em> have to worry about yet.</p>`)}

${panel('travel', 'Travel', `<div class="prose">${prose.travel}</div>`)}
${panel('money', 'Money', `
  <div id="totals"></div>
  <div class="prose">${prose.money}${prose.shops}</div>`,
  `<p class="lede">Bands, not quotes &mdash; but the totals below add them up, so the size of the thing is visible without doing the arithmetic.</p>`)}

${panel('buy', 'Buy', `<div id="buylist" class="buys"></div>`,
  `<p class="lede">109 items from CJ&rsquo;s registry, plus 8 of our own. <b>Priority is what she
   thought beforehand; the verdict is what she learned after</b> &mdash; so a few things are tagged
   <b>high</b> and <b>she&rsquo;d skip</b> at once, which is the most useful thing on the page.
   Tap to tick off; ticks are saved on this device only.</p>
   <div class="tools">
     <input type="search" id="buyq" placeholder="Search bottles, swaddle, binder&hellip;" aria-label="Search the buy list">
     <button class="filt" data-p="High" aria-pressed="false" type="button">High</button>
     <button class="filt" data-p="Medium" aria-pressed="false" type="button">Medium</button>
     <button class="filt" data-p="Low" aria-pressed="false" type="button">Low</button>
     <button class="filt" data-v="must" aria-pressed="false" type="button">Her MUSTs</button>
     <button class="filt" data-v="skip" aria-pressed="false" type="button">She&rsquo;d skip</button>
     <button class="filt" data-s="Added" aria-pressed="false" type="button">Not CJ&rsquo;s</button>
     <button class="filt" data-todo="1" aria-pressed="false" type="button">Not yet bought</button>
     <span class="count" id="buycount"></span>
   </div>`)}

${panel('runup', 'Run-up', `
  <div id="yaya"></div>
  <div class="prose">${prose.runup}</div>`,
  `<p class="lede">None of this is due yet. It is here so the order is known before the deadlines arrive.</p>`)}

${panel('prayers', 'Prayers', `
  <div class="sub" role="tablist">
    <button class="subtab" role="tab" data-sub="p-daily" aria-selected="true">Daily</button>
    <button class="subtab" role="tab" data-sub="p-moments" aria-selected="false">Moments</button>
    <button class="subtab" role="tab" data-sub="p-trad" aria-selected="false">Traditional</button>
    <button class="subtab" role="tab" data-sub="p-novena" aria-selected="false">Novena</button>
    <button class="subtab" role="tab" data-sub="p-rosary" aria-selected="false">Rosary</button>
    <button class="subtab" role="tab" data-sub="p-devo" aria-selected="false">Philippine</button>
    <button class="subtab" role="tab" data-sub="p-after" aria-selected="false">After</button>
  </div>
  <div class="prose subview" id="p-daily">${prose.prayerDaily}</div>
  <div class="prose subview" id="p-moments" hidden>${prose.prayerMoments}</div>
  <div class="prose subview" id="p-trad" hidden>${prose.prayerTraditional}</div>
  <div class="prose subview" id="p-novena" hidden>${prose.prayerNovena}</div>
  <div class="prose subview" id="p-rosary" hidden>${prose.prayerRosary}</div>
  <div class="prose subview" id="p-devo" hidden>${prose.prayerDevotions}${prose.prayerNico}</div>
  <div class="prose subview" id="p-after" hidden>${prose.prayerAfter}
    <details class="grief"><summary>If the news is not good</summary><div class="prose">${prose.prayerGrief}</div></details>
  </div>`)}

${panel('nico', 'For Nico', `
  <div class="sub" role="tablist">
    <button class="subtab" role="tab" data-sub="n-tri" aria-selected="true">Stat lines</button>
    <button class="subtab" role="tab" data-sub="n-stages" aria-selected="false">By stage</button>
    <button class="subtab" role="tab" data-sub="n-play" aria-selected="false">Birth playbook</button>
    <button class="subtab" role="tab" data-sub="n-leave" aria-selected="false">Leave &amp; hospital</button>
    <button class="subtab" role="tab" data-sub="n-after" aria-selected="false">After the birth</button>
    <button class="subtab" role="tab" data-sub="n-skills" aria-selected="false">Skills</button>
    <button class="subtab" role="tab" data-sub="n-life" aria-selected="false">His own</button>
    <button class="subtab" role="tab" data-sub="n-bag" aria-selected="false">Go-bag</button>
  </div>
  <div class="prose subview" id="n-tri">${prose.nicoTrimesters}</div>
  <div class="prose subview" id="n-stages" hidden>${prose.nicoStages}</div>
  <div class="prose subview" id="n-play" hidden>${prose.nicoPlaybook}</div>
  <div class="prose subview" id="n-leave" hidden>${prose.nicoHospital}${prose.nicoLeave}</div>
  <div class="prose subview" id="n-after" hidden>${prose.nicoAfter}</div>
  <div class="prose subview" id="n-skills" hidden>${prose.nicoSkills}</div>
  <div class="prose subview" id="n-life" hidden>${prose.nicoWellbeing}${prose.nicoDontSay}${prose.nicoLolas}</div>
  <div class="prose subview" id="n-bag" hidden>${prose.nicoBag}</div>`)}

${panel('checkups', 'Check-ups', `
  <section class="vitals" aria-labelledby="vitals-h">
    <div class="vitals-h"><h3 id="vitals-h">Vitals</h3><span id="vitals-count"></span>
      <button class="subtab" type="button" data-view="glossary">What do these words mean?</button></div>
    <div id="vitals-list"></div>
  </section>
  <figure class="firstlook">
    <img src="${SCAN_SAC}" alt="First ultrasound, 18 September 2026: the gestational sac, with the yolk sac visible inside it." loading="eager">
    <figcaption>
      <b>18 September 2026 &middot; 5 weeks 0 days.</b>
      The first picture of the cub &mdash; the gestational sac, 6.1mm across, with
      the yolk sac visible inside it. Makati Medical Center.
    </figcaption>
  </figure>
  <div class="prose">${prose.vitals}</div>
  <div class="prose">${checkups.map((c) => `<h3>${c.heading}</h3>${c.html}`).join('')}</div>
  <details class="films"><summary>All six scan films</summary>
    <img src="${SCAN_FILMS}" alt="The full contact sheet of six ultrasound films from the 18 September 2026 scan." loading="lazy">
  </details>`,
  `<p class="lede">Every appointment and result, newest first. A measurement only means something next to the one before it &mdash; which is the whole reason for keeping this.</p>`)}

${panel('birth', 'Birth', `
  <div class="sub" role="tablist">
    <button class="subtab" role="tab" data-sub="b-plan" aria-selected="true">The plan</button>
    <button class="subtab" role="tab" data-sub="b-date" aria-selected="false">The date &amp; signs</button>
  </div>
  <div class="prose subview" id="b-plan">${prose.birthplan}</div>
  <div class="subview" id="b-date" hidden>
  <div id="bd-summary" class="bd-summary"></div>
  <div id="bd-detail"></div>
  <div class="bd-legend" id="bd-legend"></div>
  <div id="bd-cal"></div>
  <div class="prose">${prose.birthday}</div>
  </div>`,
  `<p class="lede">How the birth happens, and when. Neither needs deciding yet &mdash; the plan settles around 36 weeks.</p>`)}

${panel('calendar', 'Calendar', `<div class="cal" id="callist"></div><div class="prose">${prose.milestones}</div>`,
  `<p class="lede">The liturgical year against gestational age. Moveable feasts were computed, not recalled &mdash; Easter 2027 is 28 March, which lands at 32w2d.</p>`)}

${panel('glossary', 'Plain English', `<div class="prose">${prose.glossary}</div>`,
  `<p class="lede">Every abbreviation and bit of jargon in this handbook, in ordinary words. Nothing here is meant to be looked up elsewhere.</p>`)}

${panel('flags', 'When to call', `<div class="prose">${prose.redFlags}</div>`)}
${panel('about', 'Dating &amp; sources', `<div class="prose">${prose.dating}${prose.tests}${prose.sources}</div>`)}

<footer>
  <p>Built from the three source documents in <code>/docs</code>. General information, not medical advice &mdash; Dra. Villafria&rsquo;s guidance comes first, and in an emergency go to the Makati Med ER.</p>
  <p><button class="subtab" data-view="glossary" type="button">Plain English</button>
     <button class="subtab" data-view="about" type="button">Dating &amp; sources</button></p>
</footer>
</main>

<script>
const DATA = ${data};
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const MS = 86400000;
const TRI_NAME = {1:"First trimester \\u00b7 weeks 4\\u201313", 2:"Second trimester \\u00b7 weeks 14\\u201327", 3:"Third trimester \\u00b7 weeks 28\\u201340"};

/* ---- theme ------------------------------------------------------------- */
try {
  const saved = localStorage.getItem('cub-theme');
  if (saved) document.documentElement.dataset.theme = saved;
} catch (e) { /* private window; system theme still applies */ }

$('#theme').addEventListener('click', () => {
  const root = document.documentElement;
  const dark = root.dataset.theme
    ? root.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('cub-theme', root.dataset.theme); } catch (e) {}
});

/* ---- dating ------------------------------------------------------------ */
const civil = (s) => new Date(s + 'T00:00:00Z').getTime();
function gestation(onDate) {
  const daysToGo = Math.round((civil(DATA.edd) - onDate) / MS);
  const total = Math.max(280 - daysToGo, 0);
  return { weeks: Math.floor(total / 7), days: total % 7, daysToGo };
}
const todayIso = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const todayManila = () =>
  civil(new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Manila', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date()));

const now = gestation(todayManila());
$('#now-week').textContent = now.weeks < 4 ? 'Not long now' : 'Week ' + now.weeks + ', Day ' + now.days;
$('#now-meta').textContent = now.daysToGo < 0
  ? Math.abs(now.daysToGo) + ' days past the due date'
  : 'Trimester ' + (now.weeks >= 28 ? 3 : now.weeks >= 14 ? 2 : 1);
$('#now-count').textContent = now.daysToGo >= 0 ? now.daysToGo + ' days' : '\\u2014';

/* ---- scan deadline ----------------------------------------------------- */
/* The repeat-scan window from the 18 Sept report. Counted live so the card
   nags accurately instead of going stale the day after it is built. */
const SCAN_WINDOW_CLOSES = '2026-10-05';
(() => {
  const left = Math.round((civil(SCAN_WINDOW_CLOSES) - todayManila()) / MS);
  const el = $('#scan-deadline');
  if (left > 1) el.textContent = 'Scan window closes in ' + left + ' days';
  else if (left === 1) el.textContent = 'Scan window closes tomorrow';
  else if (left === 0) el.textContent = 'Scan window closes today';
  else { el.textContent = 'Scan window closed'; el.classList.add('past'); }
})();

/* ---- week rails -------------------------------------------------------- */
const rails = $('#rails');
[1,2,3].forEach(t => {
  const wrap = document.createElement('div');
  wrap.className = 'tri';
  wrap.innerHTML = '<div class="tri-h">' + TRI_NAME[t] + '</div><div class="rail"></div>';
  const rail = $('.rail', wrap);
  DATA.weeks.filter(w => w.trimester === t).forEach(w => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'wk' + (w.week === now.weeks ? ' is-now' : '') + (w.feasts.length ? ' has-feast' : '');
    b.dataset.tri = t;
    b.dataset.week = w.week;
    b.setAttribute('aria-pressed', 'false');
    b.textContent = w.week;
    b.title = 'Week ' + w.week;
    b.addEventListener('click', () => showWeek(w.week));
    rail.appendChild(b);
  });
  rails.appendChild(wrap);
});

function showWeek(n) {
  const w = DATA.weeks.find(x => x.week === n);
  if (!w) return;
  $$('.wk').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.week) === n)));

  const field = (label, val) => val ? '<div class="field"><dt>' + label + '</dt><dd>' + val + '</dd></div>' : '';
  const feasts = w.feasts.length
    ? '<div class="aside"><div class="aside-h" style="color:var(--fg-mute)">Falls in this week</div>' +
      w.feasts.map(f => '<div class="feast"><span class="d">' + f.date + '</span><span><b>' + f.feast + '</b> &mdash; ' + f.note + '</span></div>').join('') +
      '</div>'
    : '';
  const prayer = w.prayer
    ? '<div class="aside prayer"><div class="aside-h">Prayer for week ' + w.week + '</div>' +
      '<div class="intention">' + w.prayer.intention + '</div>' +
      '<div class="prayer-body">' + w.prayer.body + '</div></div>'
    : '';

  $('#weekcard').innerHTML =
    '<div class="wkcard"><div class="wkcard-h">' +
      '<h3>Week ' + w.week + '</h3>' +
      '<span class="chip t' + w.trimester + '">Trimester ' + w.trimester + '</span>' +
      '<span class="size">roughly the size of ' + w.size + '</span>' +
    '</div><dl class="fields">' +
      field('Baby', w.baby) + field('You', w.you) + field('Tests', w.tests) +
      field('Nutrition', w.nutrition) + field('Stretch', w.stretch) + field('Filipino life', w.filipino) +
    '</dl></div>' + prayer + feasts;
}
showWeek(Math.min(Math.max(now.weeks, 4), 40));

/* ---- food checker ------------------------------------------------------ */
const active = new Set();
function renderFoods() {
  const q = $('#foodq').value.trim().toLowerCase();
  const hits = DATA.foods.filter(f =>
    (!active.size || active.has(f.status)) &&
    (!q || f.plain.includes(q) || f.reason.toLowerCase().includes(q))
  );
  $('#foodcount').textContent = hits.length + ' of ' + DATA.foods.length;

  if (!hits.length) {
    $('#foodlist').innerHTML = '<p class="empty">Nothing matches that. Try a shorter word &mdash; or ask Dra. Villafria.</p>';
    return;
  }
  let html = '', cat = '';
  for (const f of hits) {
    if (f.category !== cat) { cat = f.category; html += '<div class="cat">' + cat + '</div>'; }
    html += '<div class="food" data-s="' + f.status + '"><b>' + f.name + '</b>' +
            '<span class="pill ' + f.status + '">' + f.status + '</span>' +
            '<span class="why">' + f.reason + '</span></div>';
  }
  $('#foodlist').innerHTML = html;
}
$('#foodq').addEventListener('input', renderFoods);
$$('#view-food .filt').forEach(b => b.addEventListener('click', () => {
  const s = b.dataset.s;
  if (active.has(s)) active.delete(s); else active.add(s);
  b.setAttribute('aria-pressed', String(active.has(s)));
  renderFoods();
}));
renderFoods();

/* ---- caffeine card ----------------------------------------------------- */
const caf = DATA.caffeine.map(c =>
  '<div class="caf"><b>' + c.source + '</b><span class="mg">' + c.mg + 'mg</span>' +
  '<span class="s">' + c.serving + '</span>' +
  '<span class="bar' + (c.mg > 200 ? ' over' : '') + '"><i style="width:' + Math.min(100, (c.mg / 200) * 100) + '%"></i></span></div>'
).join('');
$('#nutrients').insertAdjacentHTML('beforebegin',
  '<h3 style="font-family:var(--display);font-size:1.25rem;margin:2.5rem 0 .3rem">Caffeine</h3>' +
  '<p class="lede">The daily limit is 200mg. Each bar is measured against it &mdash; two cups of barako put her over before lunch.</p>' +
  '<div class="tw" style="padding:.3rem .6rem">' + caf + '</div>');

/* ---- buy list ------------------------------------------------------------ */
/*
 * CJ's registry, made workable: her priority and her after-the-fact verdict are
 * both carried as tags, and rows we added ourselves are tagged as ours rather
 * than folded in silently.
 *
 * Every row gets a freshly built store search. Her own 2022 links are kept
 * beside it where they exist, but a four-year-old Shopee URL is as likely to be
 * dead as alive, so the search is the one that leads.
 */
const BUY_KEY = 'cub-buy-v1';

const loadBought = () => {
  try {
    const raw = localStorage.getItem(BUY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (e) {
    return new Set();
  }
};
let bought = loadBought();
const saveBought = () => {
  try { localStorage.setItem(BUY_KEY, JSON.stringify([...bought])); } catch (e) {}
};

const buyFilters = { q: '', prio: new Set(), verdict: new Set(), src: new Set(), todo: false };

/*
 * The brand column is CJ's own shorthand, and half of it is prose rather than a
 * brand — "Newborn Set in Shopee includes all", "1 for wet items, 1 for dry".
 * Useful to read, useless in a search box, so the keyword takes the first named
 * brand only and falls back to the item name when there isn't one.
 */
const NOT_A_BRAND = /^(lazada|shopee|amazon|ikea|foldable|newborn set|1 for|recommended)/i;

function searchKeyword(b) {
  let brand = (b.brand || '')
    .split(/\\s*[,;]\\s*|\\s+or\\s+|\\s+and\\s+/)[0]
    .replace(/^\\d+\\s*\\.\\s*/, '')
    .replace(/\\([^)]*\\)/g, '')
    .replace(/[@#].*$/, '')
    .trim();
  if (!brand || brand.split(/\\s+/).length > 3 || NOT_A_BRAND.test(brand)) brand = '';
  // A brand that already contains the item name does not want it twice.
  const item = brand && brand.toLowerCase().includes(b.item.toLowerCase().split(/[\\s(/]/)[0])
    ? '' : b.item;
  return (brand + ' ' + item).trim().replace(/\\s+/g, ' ');
}

const searchUrl = (b) => 'https://shopee.ph/search?keyword=' + encodeURIComponent(searchKeyword(b));

function renderBuy() {
  const q = buyFilters.q.trim().toLowerCase();
  const hits = DATA.buy.filter((b) =>
    (!q || b.plain.includes(q)) &&
    (!buyFilters.prio.size || buyFilters.prio.has(b.prio)) &&
    (!buyFilters.verdict.size || buyFilters.verdict.has(b.verdict)) &&
    (!buyFilters.src.size || buyFilters.src.has(b.src)) &&
    (!buyFilters.todo || !bought.has(b.item)));

  const high = DATA.buy.filter((b) => b.prio === 'High');
  const highDone = high.filter((b) => bought.has(b.item)).length;

  $('#buycount').textContent = hits.length + ' of ' + DATA.buy.length;

  // Priority is what she thought before; verdict is what she learned after.
  // Within a priority band the things she swore by lead and the regrets trail,
  // so the top of the list is the part worth acting on.
  const rank = { High: 0, Medium: 1, Low: 2 };
  const vrank = { must: 0, note: 1, '': 1, skip: 2 };
  const sorted = [...hits].sort((a, b) =>
    (rank[a.prio] - rank[b.prio]) ||
    (vrank[a.verdict] - vrank[b.verdict]) ||
    a.cat.localeCompare(b.cat) || a.item.localeCompare(b.item));

  const summary =
    '<div class="buysum"><b>' + highDone + ' of ' + high.length + '</b> high-priority items ticked off' +
    ' · <b>' + bought.size + '</b> of ' + DATA.buy.length + ' in total.' +
    ' Her 7 <b>MUST</b>s and 11 <b>skip</b>s are the two filters worth starting with.</div>';

  $('#buylist').innerHTML = summary + (sorted.length
    ? sorted.map((b) => {
        const done = bought.has(b.item);
        const id = 'buy-' + b.item.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        return '<label class="buy' + (done ? ' done' : '') + '" for="' + id + '">' +
          '<input type="checkbox" id="' + id + '" data-item="' + b.item.replace(/"/g, '&quot;') + '"' +
            (done ? ' checked' : '') + '>' +
          '<span class="bh"><span class="bn">' + b.item + '</span>' +
            (b.brand ? '<span class="bbrand">' + b.brand + '</span>' : '') + '</span>' +
          '<span class="bmeta">' +
            '<span class="tag p-' + b.prio + '">' + b.prio + '</span>' +
            '<span class="tag cat">' + b.cat + '</span>' +
            (b.kind === 'Consumable' ? '<span class="tag cat">Repeat buy</span>' : '') +
            (b.verdict === 'must' ? '<span class="tag v-must">Her MUST</span>' : '') +
            (b.verdict === 'skip' ? '<span class="tag v-skip">She’d skip</span>' : '') +
            (b.src === 'Added' ? '<span class="tag src-Added">Not CJ’s</span>' : '') +
            (b.cost ? '<span class="tag cost">₱' + b.cost + ' in 2022</span>' : '') +
          '</span>' +
          (b.note ? '<span class="bnote">' + b.note + '</span>' : '') +
          '<span class="blinks">' +
            '<a href="' + searchUrl(b) + '" target="_blank" rel="noopener">Search Shopee</a>' +
            (b.link ? '<a class="orig" href="' + b.link + '" target="_blank" rel="noopener">CJ’s 2022 link</a>' : '') +
          '</span>' +
        '</label>';
      }).join('')
    : '<p class="slog-empty">Nothing matches those filters.</p>');

  $$('#buylist input[type=checkbox]').forEach((cb) => cb.addEventListener('change', () => {
    if (cb.checked) bought.add(cb.dataset.item); else bought.delete(cb.dataset.item);
    saveBought();
    renderBuy();
  }));
}

$('#buyq').addEventListener('input', (e) => { buyFilters.q = e.target.value; renderBuy(); });
$$('#view-buy .filt').forEach((btn) => btn.addEventListener('click', () => {
  const on = btn.getAttribute('aria-pressed') !== 'true';
  btn.setAttribute('aria-pressed', String(on));
  if (btn.dataset.todo) buyFilters.todo = on;
  else {
    const [key, val] = btn.dataset.p ? ['prio', btn.dataset.p]
      : btn.dataset.v ? ['verdict', btn.dataset.v]
      : ['src', btn.dataset.s];
    if (on) buyFilters[key].add(val); else buyFilters[key].delete(val);
  }
  renderBuy();
}));

renderBuy();

/* ---- budget totals ------------------------------------------------------ */
/*
 * Every figure here is summed from DATA.budget at run time. The bands in the
 * document have been edited several times; a total typed alongside them would
 * have gone quietly wrong on the first edit.
 *
 * Committed and optional are kept apart because they answer different
 * questions: what this costs if nothing is chosen, and what the choices add.
 */
const peso = (n) => '₱' + Math.round(n).toLocaleString('en-PH');
const band = (lo, hi) => peso(lo) + ' – ' + peso(hi);

const sumBand = (rows) => rows.reduce((t, r) => [t[0] + r.low, t[1] + r.high], [0, 0]);

const PHASE_NAME = {
  Pregnancy: 'Pregnancy',
  Y0: 'First year',
  Y1: 'Year 1–2',
  Y2: 'Year 2–3',
  Y3: 'Year 3–4',
  Y4: 'Year 4–5',
  Y5: 'Year 5–6',
};

function totalsRow(label, lo, hi, cls, note) {
  return '<div class="totrow' + (cls ? ' ' + cls : '') + '">' +
    '<span class="lbl">' + label + '</span>' +
    '<span class="amt">' + band(lo, hi) + '</span>' +
    (note ? '<span class="note">' + note + '</span>' : '') +
  '</div>';
}

(() => {
  const core = DATA.budget.filter((r) => !r.optional);
  const opt = DATA.budget.filter((r) => r.optional);

  /* --- what you actually pay on the day --- */
  const d = DATA.delivery;
  const oop = (k) => [d[k].low - d[k].philhealth, d[k].high - d[k].philhealth];
  const [nLo, nHi] = oop('normal');
  const [cLo, cHi] = oop('caesarean');

  /* --- pregnancy, to the birth --- */
  const pCore = sumBand(core.filter((r) => r.phase === 'Pregnancy'));
  const pOpt = sumBand(opt.filter((r) => r.phase === 'Pregnancy'));

  /* --- first year, and the whole of nought to five --- */
  const y0Core = sumBand(core.filter((r) => r.phase === 'Y0'));
  const y0Opt = sumBand(opt.filter((r) => r.phase === 'Y0'));
  const allCore = sumBand(core);
  const allOpt = sumBand(opt);

  /* --- the two lines that dominate everything --- */
  const childcare = sumBand(DATA.budget.filter((r) => /yaya|night nurse/i.test(r.category)));
  const school = sumBand(DATA.budget.filter((r) => /preschool|kindergarten|school/i.test(r.category)));
  const gear = sumBand(DATA.budget.filter((r) => /nursery and gear/i.test(r.category)));

  $('#totals').innerHTML =
    '<section class="tot">' +
      '<h3>What it comes to</h3>' +
      '<div class="sub">Summed from the bands further down. Low to high, in pesos.</div>' +

      totalsRow('Pregnancy — committed', pCore[0], pCore[1], '',
        'Consults, tests, scans, vaccines, vitamins, maternity clothes.') +
      totalsRow('Pregnancy — if you choose them', pOpt[0], pOpt[1], 'opt',
        'NIPT, and a childbirth class or doula.') +
      totalsRow('Pregnancy, all in', pCore[0] + pOpt[0], pCore[1] + pOpt[1], 'grand') +

      '<div style="height:1.4rem"></div>' +

      totalsRow('Birth — vaginal, after PhilHealth', nLo, nHi, '',
        'Makati Med bill of ' + band(d.normal.low, d.normal.high) + ', less the ' +
        peso(d.normal.philhealth) + ' PhilHealth benefit. Before any HMO.') +
      totalsRow('Birth — caesarean, after PhilHealth', cLo, cHi, '',
        'Bill of ' + band(d.caesarean.low, d.caesarean.high) + ', less ' +
        peso(d.caesarean.philhealth) + ' — the low end of the ' + peso(58000) + '–' +
        peso(62000) + ' band, so this is the cautious figure. A section costs you roughly ' +
        peso(cLo - nLo) + ' – ' + peso(cHi - nHi) + ' more.') +

      '<div style="height:1.4rem"></div>' +

      totalsRow('First year — committed', y0Core[0], y0Core[1], '',
        'Delivery, gear, nappies, paediatrician, a yaya, the binyag.') +
      totalsRow('First year — if you choose them', y0Opt[0], y0Opt[1], 'opt',
        'Formula, and a night nurse for the first months.') +
      totalsRow('First year, all in', y0Core[0] + y0Opt[0], y0Core[1] + y0Opt[1], 'grand') +

      '<div style="height:1.4rem"></div>' +

      totalsRow('Everything, birth to five', allCore[0] + allOpt[0], allCore[1] + allOpt[1], 'grand',
        'Six years of the table below, optional lines included.') +

      '<p class="cav"><b>Of that, childcare is ' + band(childcare[0], childcare[1]) +
      ' and school fees are ' + band(school[0], school[1]) + '.</b> ' +
      'Together they are most of the number. The gear everyone worries about — cot, ' +
      'stroller, car seat, carrier — is ' + band(gear[0], gear[1]) + ', a rounding error ' +
      'beside either. If you want to change this figure, that is where the lever is, ' +
      'not in the registry.</p>' +

      '<p class="cav">These are planning bands for a Makati household using private ' +
      'care, not quotes. Every peso figure carries <b>low confidence</b>. For the ' +
      'birth, Makati Med billing will give a written estimate on request — that is ' +
      'the only number that means anything.</p>' +
    '</section>';
})();

/* ---- yaya cost calculator ----------------------------------------------- */
/*
 * Built on a real 2022 stack a friend kept: a 10,000 base came to 159,323 a
 * year once everything statutory was counted. The salary-linked parts scale;
 * the contributions and allowances are editable, because contribution tables
 * are revised and this session could not read the government ones.
 */
(() => {
  const el = $('#yaya');
  if (!el) return;

  el.innerHTML =
    '<section class="tot">' +
      '<h3>What help actually costs</h3>' +
      '<div class="sub">Salary is about three-quarters of it. Change any figure.</div>' +
      '<div class="yform">' +
        '<label>Monthly salary <input type="number" id="y-sal" min="0" step="500" value="13000"></label>' +
        '<label>Contributions / mo <input type="number" id="y-con" min="0" step="10" value="1570"></label>' +
        '<label>Allowances / mo <input type="number" id="y-all" min="0" step="50" value="700"></label>' +
      '</div>' +
      '<div id="y-out"></div>' +
      '<p class="cav">The defaults reproduce a friend’s real 2022 sheet: on a ' +
      peso(10000) + ' base this lands within ' + peso(200) + ' of the ' + peso(159323) +
      ' a year they actually budgeted. Set the salary to ' + peso(10000) + ' to see it.</p>' +
      '<p class="cav"><b>Contributions</b> are SSS, PhilHealth and Pag-IBIG, both shares, ' +
      'as a household that absorbs them would budget. They rise with salary bracket, ' +
      'so check the current tables. <b>Allowances</b> default to toiletries, a medical ' +
      'allowance and travel. Not included: food and lodging if live-in, one-off hiring ' +
      'costs, or pay in lieu of a rest day.</p>' +
    '</section>';

  const num = (id, fallback) => {
    const v = Number($(id).value);
    return Number.isFinite(v) && v >= 0 ? v : fallback;
  };

  function render() {
    const sal = num('#y-sal', 0);
    const con = num('#y-con', 0);
    const all = num('#y-all', 0);

    const thirteenth = sal / 12;          // one month's pay, spread
    const leave = (sal * 5) / 12 / 26;    // five paid days a year, spread
    const monthly = sal + thirteenth + leave + con + all;
    const annual = monthly * 12;
    const multiple = sal > 0 ? annual / (sal * 12) : 0;

    const line = (l, v, cls, note) =>
      '<div class="totrow' + (cls ? ' ' + cls : '') + '">' +
        '<span class="lbl">' + l + '</span><span class="amt">' + peso(v) + '</span>' +
        (note ? '<span class="note">' + note + '</span>' : '') + '</div>';

    $('#y-out').innerHTML =
      line('Salary', sal) +
      line('13th month, spread', thirteenth) +
      line('Five paid leave days, spread', leave) +
      line('Contributions', con) +
      line('Allowances', all) +
      line('Per month', monthly, 'grand') +
      line('Per year', annual, 'grand',
        sal > 0 ? 'That is ' + multiple.toFixed(2) + '× the salary. Budgeting the salary alone understates it by ' + peso(annual - sal * 12) + ' a year.' : '');
  }

  ['#y-sal', '#y-con', '#y-all'].forEach((id) => $(id).addEventListener('input', render));
  render();
})();

/* ---- sleep log --------------------------------------------------------- */
/*
 * Stored in localStorage, which is this browser on this device only. That is a
 * deliberate limit rather than an oversight: the page's shared-database
 * capability would make the artifact organization-internal and break the
 * "anyone with the link" sharing already in use, which is not a trade to make
 * on the reader's behalf. Every read and write is guarded — localStorage throws
 * in a private window and can come back empty.
 */
const SLEEP_KEY = 'cub-sleep-v1';

const loadSleep = () => {
  try {
    const raw = localStorage.getItem(SLEEP_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};
const saveSleep = (nights) => {
  try { localStorage.setItem(SLEEP_KEY, JSON.stringify(nights)); return true; } catch (e) { return false; }
};

let nights = loadSleep();

/** Notes are free text typed by hand, and go into innerHTML. */
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderSleep() {
  const sorted = [...nights].sort((a, b) => (a.date < b.date ? -1 : 1));
  const scored = sorted.filter((n) => typeof n.score === 'number');

  if (!sorted.length) {
    $('#slog-summary').textContent = '';
    $('#slog-chart').innerHTML = '';
    $('#slog-list').innerHTML =
      '<p class="slog-empty">Nothing logged yet. Open Oura in the morning and copy the numbers across &mdash; ' +
      'after a week or so the trend starts being worth more than any single night.</p>';
    return;
  }

  const recent = scored.slice(-7);
  const avg = recent.length
    ? Math.round(recent.reduce((t, n) => t + n.score, 0) / recent.length)
    : null;
  const hours = sorted.filter((n) => typeof n.hours === 'number').slice(-7);
  const avgH = hours.length
    ? (hours.reduce((t, n) => t + n.hours, 0) / hours.length).toFixed(1)
    : null;

  $('#slog-summary').textContent =
    sorted.length + ' night' + (sorted.length === 1 ? '' : 's') +
    (avg !== null ? ' \u00b7 last 7 average ' + avg : '') +
    (avgH !== null ? ' \u00b7 ' + avgH + 'h' : '');

  // One series over time, so no legend; only the latest bar is labelled.
  const bars = scored.slice(-21);
  $('#slog-chart').innerHTML = bars.length
    ? '<div class="sbars">' + bars.map((n, i) => {
        const band = n.score >= 80 ? 'ok' : n.score >= 65 ? 'low' : 'poor';
        const last = i === bars.length - 1;
        return '<div class="sbar' + (last ? ' last' : '') + '" data-band="' + band + '"' +
          ' style="height:' + Math.max(4, n.score) + '%"' +
          ' title="' + n.date + ': ' + n.score + '">' +
          (last ? '<span>' + n.score + '</span>' : '') + '</div>';
      }).join('') + '</div>' +
      '<div class="saxis"><span>' + bars[0].date + '</span><span>' + bars[bars.length - 1].date + '</span></div>'
    : '';

  $('#slog-list').innerHTML = [...sorted].reverse().slice(0, 14).map((n) => {
    const g = gestationOn(n.date);
    return '<div class="srow">' +
      '<span class="sd">' + n.date + '</span>' +
      '<span class="sw">' + (g ? g : '') + '</span>' +
      '<span class="ss">' + (typeof n.score === 'number' ? n.score : '\u2014') +
        (typeof n.hours === 'number' ? ' \u00b7 ' + n.hours + 'h' : '') +
        (typeof n.hr === 'number' ? ' \u00b7 ' + n.hr + 'bpm' : '') + '</span>' +
      '<span class="sfoot"><span>' + (n.note ? esc(n.note) : '') + '</span>' +
        '<button class="sdel" type="button" data-date="' + n.date + '">Remove</button></span>' +
    '</div>';
  }).join('');

  $$('.sdel').forEach((b) => b.addEventListener('click', () => {
    nights = nights.filter((n) => n.date !== b.dataset.date);
    saveSleep(nights);
    renderSleep();
  }));
}

/** The gestational age on a given night, so a score sits next to the stage. */
function gestationOn(dateStr) {
  const total = 280 - Math.round((civil(DATA.edd) - civil(dateStr)) / MS);
  if (total < 0 || total > 320) return '';
  return Math.floor(total / 7) + 'w' + (total % 7) + 'd';
}

$('#s-date').value = todayIso();
$('#slog-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const date = $('#s-date').value;
  if (!date) return;
  const num = (sel, min, max) => {
    const v = Number($(sel).value);
    return $(sel).value !== '' && Number.isFinite(v) && v >= min && v <= max ? v : undefined;
  };
  const entry = {
    date,
    score: num('#s-score', 0, 100),
    hours: num('#s-hours', 0, 16),
    hr: num('#s-hr', 30, 140),
    note: $('#s-note').value.trim() || undefined,
  };
  // One entry per night: re-saving the same date replaces it.
  nights = [...nights.filter((n) => n.date !== date), entry];
  if (!saveSleep(nights)) {
    $('#slog-summary').textContent = 'Could not save \u2014 this browser is blocking storage.';
  }
  $('#s-score').value = ''; $('#s-hours').value = ''; $('#s-hr').value = ''; $('#s-note').value = '';
  renderSleep();
});

renderSleep();

/* ---- vitals ------------------------------------------------------------ */
/* Status is labelled as well as coloured: colour alone is not an encoding. */
const STATUS_MARK = { good: '\u2713', watch: '\u25B3', urgent: '\u25B3', pending: '\u00B7' };

(() => {
  const measured = DATA.vitals.filter((v) => v.status !== 'pending');
  const waiting = DATA.vitals.filter((v) => v.status === 'pending');
  const flagged = measured.filter((v) => v.status !== 'good').length;

  $('#vitals-count').textContent =
    measured.length + ' measured \u00b7 ' +
    (flagged ? flagged + ' to watch' : 'all in range') +
    (waiting.length ? ' \u00b7 ' + waiting.length + ' outstanding' : '');

  const row = (v) =>
    '<div class="vrow"><span class="vn">' + v.name +
      '<span class="vpill ' + v.status + '">' + STATUS_MARK[v.status] + ' ' + v.status + '</span></span>' +
      '<span class="vv">' + v.value + '</span>' +
      '<span class="vp">' + v.plain + '</span>' +
      '<span class="vr">Normal is ' + v.reference + ' \u00b7 ' + v.measured + '</span>' +
    '</div>';

  $('#vitals-list').innerHTML =
    '<div class="vgroup">Measured</div>' + measured.map(row).join('') +
    (waiting.length ? '<div class="vgroup">Not yet taken</div>' + waiting.map(row).join('') : '');
})();

/* ---- stage-gated prompts ----------------------------------------------- */
/* Things that are not worth showing yet. Gated on the live week so they appear
   on their own, rather than sitting in the list for eight months being ignored. */
const STAGE_PROMPTS = [
  {
    from: 26,
    until: 37,
    title: 'Time to ask the birth-plan questions',
    body: 'You are past 26 weeks. The questions for Dra. Villafria are on the Birth tab &mdash; her caesarean rate, her threshold, and who decides in the room. Ask them before 30 weeks so the plan is agreed calmly.',
    view: 'birth',
    cta: 'Open the questions',
  },
  {
    from: 18,
    until: 23,
    title: 'The anomaly scan settles one big question',
    body: 'This scan rules placenta previa in or out, which is the first thing that can decide the mode of birth. Worth asking about specifically.',
    view: 'birth',
    cta: 'Why it matters',
  },
  {
    from: 34,
    until: 43,
    title: 'The birth plan settles about now',
    body: 'Position is known from around 36 weeks. If a planned caesarean is the answer and it is elective, it is timed at 39 weeks or later.',
    view: 'birth',
    cta: 'See the dates',
  },
];

(() => {
  // Windows overlap by design — at 34-36 weeks both the questions prompt and
  // the settles-now prompt apply. The later stage is the more useful one, so
  // pick the highest start week that matches rather than the first listed.
  const prompt = STAGE_PROMPTS
    .filter((p) => now.weeks >= p.from && now.weeks < p.until)
    .sort((a, b) => b.from - a.from)[0];
  if (!prompt) return;
  $('#stage-prompt').innerHTML =
    '<div class="stage"><h3>' + prompt.title + '</h3><p>' + prompt.body + '</p>' +
    '<button class="subtab" type="button" data-view="' + prompt.view + '">' + prompt.cta + '</button></div>';
})();

/* ---- birth day --------------------------------------------------------- */
/* Sun-sign boundaries drift up to a day a year, so these are the computed
   2027 ingress moments in Manila time rather than a generic table. */
const SIGNS = [
  { name: 'Taurus', glyph: '\u2649', from: '2027-04-20T16:00', trait: 'steady, stubborn, fond of comfort' },
  { name: 'Gemini', glyph: '\u264A', from: '2027-05-21T15:00', trait: 'curious, quick, two minds at once' },
  { name: 'Cancer', glyph: '\u264B', from: '2027-06-21T23:00', trait: 'tender, homebound, long memory' },
];
const BANDS = [
  { id: 'pre',   label: 'Preterm',    max: 258, note: 'Before 37 weeks — early enough to carry added risk.' },
  { id: 'early', label: 'Early term', max: 272, note: 'More respiratory, temperature and glucose trouble than full term. A planned section here needs an indication.' },
  { id: 'full',  label: 'Full term',  max: 286, note: 'The lowest-risk window, and where an elective section is timed.' },
  { id: 'late',  label: 'Late term',  max: 293, note: 'Monitoring usually steps up.' },
  { id: 'post',  label: 'Post-term',  max: 9999, note: 'Induction is normally discussed well before here.' },
];
const STONES = {
  3: ['Diamond', 'Daisy, sweet pea'],
  4: ['Emerald', 'Lily of the valley, hawthorn'],
  5: ['Pearl, moonstone', 'Rose, honeysuckle'],
};

const bandFor = (days) => BANDS.find((b) => days <= b.max);
/**
 * The sign for a calendar day.
 *
 * A sign changes at a moment, not at midnight, so the ingress date belongs to
 * both signs — and 21 May 2027 is exactly that day here. Returning the cusp
 * explicitly matters more than usual: the due date is two days before it.
 */
const signFor = (iso) => {
  let current = { name: 'Aries', glyph: '\u2648', trait: 'headlong, impatient, brave' };
  for (const s of SIGNS) {
    const day = s.from.slice(0, 10);
    if (iso === day) return { ...s, cusp: { before: current, at: s.from.slice(11) } };
    if (iso > day) current = s;
  }
  return current;
};
const signLabel = (s) =>
  s.cusp
    ? s.cusp.before.glyph + ' ' + s.cusp.before.name + ' until ' + s.cusp.at + ', then ' + s.glyph + ' ' + s.name
    : s.glyph + ' ' + s.name;

const bdLmp = civil(DATA.edd) - 280 * MS;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const gaDays = (t) => Math.round((t - bdLmp) / MS);
const gaLabel = (t) => { const d = gaDays(t); return Math.floor(d / 7) + 'w' + (d % 7) + 'd'; };
const longDate = (t) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(t));

$('#bd-legend').innerHTML = BANDS.map((b) => '<span class="band ' + b.id + '">' + b.label + '</span>').join('');

(() => {
  const edd = civil(DATA.edd);
  const sign = signFor(DATA.edd);
  const cusp = SIGNS.find((s) => s.from.slice(0, 10) > DATA.edd);
  const toCusp = cusp ? Math.round((civil(cusp.from.slice(0, 10)) - edd) / MS) : null;
  $('#bd-summary').innerHTML =
    '<div><dt>Due date</dt><dd>' + new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(edd)) + '</dd></div>' +
    '<div><dt>On the day</dt><dd>' + signLabel(sign) + '</dd></div>' +
    (toCusp !== null ? '<div><dt>' + cusp.name + ' from</dt><dd>' + toCusp + ' days later</dd></div>' : '') +
    '<div><dt>Chinese year</dt><dd>Fire Goat</dd></div>';
})();

function showDay(t) {
  const band = bandFor(gaDays(t));
  const date = new Date(t);
  const sign = signFor(iso(t));
  const [stone, flower] = STONES[date.getUTCMonth()] ?? ['\u2014', '\u2014'];
  const isEdd = iso(t) === DATA.edd;

  $$('.bd-day').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.t) === t)));
  $('#bd-detail').innerHTML =
    '<div class="bd-detail"><h3>' + longDate(t) + (isEdd ? ' \u2014 the due date' : '') + '</h3>' +
    '<p class="ga">' + gaLabel(t) + ' \u00b7 <span class="band ' + band.id + '">' + band.label + '</span></p>' +
    '<p>' + band.note + '</p>' +
    '<div class="bd-grid">' +
      '<div><dt>Star sign</dt><dd' + (sign.cusp ? ' style="font-size:.9rem"' : '') + '>' + signLabel(sign) + '</dd></div>' +
      '<div><dt>Said to be</dt><dd style="font-weight:400">' + (sign.cusp ? 'A cusp day \u2014 it depends on the hour' : sign.trait) + '</dd></div>' +
      '<div><dt>Chinese year</dt><dd>Fire Goat \u4e01\u672a</dd></div>' +
      '<div><dt>Birthstone</dt><dd>' + stone + '</dd></div>' +
      '<div><dt>Birth flower</dt><dd style="font-weight:400">' + flower + '</dd></div>' +
    '</div></div>';
}

(() => {
  const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  let html = '';
  for (const month of [3, 4, 5]) {
    const first = Date.UTC(2027, month, 1);
    const days = new Date(Date.UTC(2027, month + 1, 0)).getUTCDate();
    const lead = (new Date(first).getUTCDay() + 6) % 7; // Monday-first
    html += '<div class="bd-month"><h3>' +
      new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(first)) +
      '</h3><div class="bd-dow">' + DOW.map((d) => '<span>' + d + '</span>').join('') + '</div><div class="bd-days">';
    html += '<div class="bd-blank"></div>'.repeat(lead);
    for (let day = 1; day <= days; day += 1) {
      const t = Date.UTC(2027, month, day);
      const g = gaDays(t);
      const band = bandFor(g);
      // 22w0d to 42w6d. Outside that range a date is not a birth day anyone is
      // planning for — nobody is still pregnant at 46 weeks, and showing it
      // implies the calendar means something it does not.
      const reachable = g >= 154 && g <= 300;
      html += '<button type="button" class="bd-day' + (iso(t) === DATA.edd ? ' edd' : '') + '"' +
        ' data-t="' + t + '" data-band="' + (reachable ? band.id : '') + '" aria-pressed="false"' +
        (reachable ? '' : ' disabled') +
        ' aria-label="' + longDate(t) + ', ' + gaLabel(t) + '">' +
        '<span class="n">' + day + '</span>' +
        (reachable ? '<span class="g">' + gaLabel(t) + '</span>' : '') +
        '</button>';
    }
    html += '</div></div>';
  }
  $('#bd-cal').innerHTML = html;
  $$('.bd-day').forEach((b) => {
    if (!b.disabled) b.addEventListener('click', () => showDay(Number(b.dataset.t)));
  });
  showDay(civil(DATA.edd));
})();

/* ---- calendar ---------------------------------------------------------- */
$('#callist').innerHTML = DATA.calendar.map(c =>
  '<div class="calrow"><span class="d">' + c.date + '</span><span class="g">' + c.ga + '</span>' +
  '<span><b>' + c.feast + '</b></span><span class="n">' + c.note + '</span></div>'
).join('');

/* ---- navigation -------------------------------------------------------- */
function show(view) {
  $$('.view').forEach(v => { v.hidden = v.id !== 'view-' + view; });
  $$('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.view === view)));
  document.body.className = view === 'nico' ? 'nico' : view === 'prayers' ? 'prayers' : view === 'flags' ? 'flags' : '';
  scrollTo({ top: 0, behavior: 'instant' });
}
$$('[data-view]').forEach(b => b.addEventListener('click', () => show(b.dataset.view)));
$('#toflags').addEventListener('click', () => show('flags'));

$$('.subtab[data-sub]').forEach(b => b.addEventListener('click', () => {
  const group = b.closest('.sub');
  $$('.subtab', group).forEach(o => o.setAttribute('aria-selected', String(o === b)));
  const views = group.parentElement;
  $$('.subview', views).forEach(v => { v.hidden = v.id !== b.dataset.sub; });
}));
</script>`;

mkdirSync(new URL('../docs/site/', import.meta.url), { recursive: true });
const out = new URL('../docs/site/index.html', import.meta.url);
writeFileSync(out, html);
console.log(
  `wrote docs/site/index.html — ${(html.length / 1024).toFixed(0)}KB, ` +
    `${weekData.length} weeks, ${foods.length} foods, ${calendar.length} feasts`,
);
