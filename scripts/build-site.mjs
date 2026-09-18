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
  extractCaffeine,
  extractCalendar,
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
  birthday: renderSection('pregnancy', '13. Birth day — dates and signs'),
  birthplan: renderSection('pregnancy', '14. Birth plan — caesarean or vaginal'),
};

const data = JSON.stringify({ edd: EDD, weeks: weekData, foods, caffeine, calendar })
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
  ['travel', 'Travel'],
  ['money', 'Money'],
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

${panel('food', 'Food', `<div id="foodlist" class="foods"></div>`,
  `<p class="lede">131 items. Most of them are fine &mdash; the list leads with reassurance and saves <b>avoid</b> for genuine risk.</p>
   <div class="tools">
     <input type="search" id="foodq" placeholder="Search kinilaw, tuyo, cheese&hellip;" aria-label="Search foods">
     <button class="filt" data-s="safe" aria-pressed="false" type="button">Safe</button>
     <button class="filt" data-s="caution" aria-pressed="false" type="button">Caution</button>
     <button class="filt" data-s="avoid" aria-pressed="false" type="button">Avoid</button>
     <span class="count" id="foodcount"></span>
   </div>`)}

${panel('move', 'Move', `<div class="prose">${prose.move}</div>`)}
${panel('travel', 'Travel', `<div class="prose">${prose.travel}</div>`)}
${panel('money', 'Money', `<div class="prose">${prose.money}${prose.shops}</div>`)}

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
  <figure class="firstlook">
    <img src="${SCAN_SAC}" alt="First ultrasound, 18 September 2026: the gestational sac, with the yolk sac visible inside it." loading="eager">
    <figcaption>
      <b>18 September 2026 &middot; 5 weeks 0 days.</b>
      The first picture of the cub &mdash; the gestational sac, 6.1mm across, with
      the yolk sac visible inside it. Makati Medical Center.
    </figcaption>
  </figure>
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

${panel('flags', 'When to call', `<div class="prose">${prose.redFlags}</div>`)}
${panel('about', 'Dating &amp; sources', `<div class="prose">${prose.dating}${prose.tests}${prose.nutrients}${prose.sources}</div>`)}

<footer>
  <p>Built from the three source documents in <code>/docs</code>. General information, not medical advice &mdash; Dra. Villafria&rsquo;s guidance comes first, and in an emergency go to the Makati Med ER.</p>
  <p><button class="subtab" data-view="about" type="button">Dating &amp; sources</button></p>
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
$$('.filt').forEach(b => b.addEventListener('click', () => {
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
$('#view-food').insertAdjacentHTML('beforeend',
  '<h3 style="font-family:var(--display);font-size:1.25rem;margin:2.5rem 0 .3rem">Caffeine</h3>' +
  '<p class="lede">The daily limit is 200mg. Each bar is measured against it &mdash; two cups of barako put her over before lunch.</p>' +
  '<div class="tw" style="padding:.3rem .6rem">' + caf + '</div>');

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
