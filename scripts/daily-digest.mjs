#!/usr/bin/env node
/**
 * Daily news digest -> Telegram.
 *
 * Fetches RSS/Atom feeds, keeps recent items, groups them into sections
 * (AI news, practical AI tips, Philippines news) and sends the result to
 * a Telegram chat. No dependencies; runs on Node 18+.
 *
 * Env vars (required unless --dry-run):
 *   TELEGRAM_BOT_TOKEN  bot token from @BotFather
 *   TELEGRAM_CHAT_ID    chat to send to (your user id or a group id)
 *
 * Usage:
 *   node scripts/daily-digest.mjs            # fetch + send
 *   node scripts/daily-digest.mjs --dry-run  # fetch + print, no Telegram
 */

const SECTIONS = [
  {
    title: '🤖 AI News',
    windowHours: 26,
    maxItems: 6,
    maxPerFeed: 3,
    feeds: [
      { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
      { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
      { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
    ],
  },
  {
    title: '💡 Practical AI & Tips',
    // These publish a few times a week, so look further back.
    windowHours: 96,
    maxItems: 4,
    maxPerFeed: 2,
    feeds: [
      { name: 'One Useful Thing', url: 'https://www.oneusefulthing.org/feed' },
      { name: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/' },
      { name: "Ben's Bites", url: 'https://www.bensbites.com/feed' },
      { name: 'Every', url: 'https://every.to/feed.xml' },
    ],
  },
  {
    title: '🇵🇭 Philippines',
    windowHours: 26,
    maxItems: 8,
    maxPerFeed: 3,
    feeds: [
      { name: 'Rappler', url: 'https://www.rappler.com/feed/' },
      { name: 'BusinessWorld', url: 'https://www.bworldonline.com/feed/' },
      { name: 'Philstar', url: 'https://www.philstar.com/rss/headlines' },
      { name: 'Inquirer News', url: 'https://newsinfo.inquirer.net/feed' },
      { name: 'Inquirer Lifestyle', url: 'https://lifestyle.inquirer.net/feed' },
      { name: 'GMA News', url: 'https://data.gmanetwork.com/gno/rss/news/feed.xml' },
    ],
  },
];

const TELEGRAM_LIMIT = 4096;
const FETCH_TIMEOUT_MS = 20000;
const DRY_RUN = process.argv.includes('--dry-run');

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripCdata(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function tagContent(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decodeEntities(stripCdata(m[1]).trim()) : '';
}

/** Parse RSS 2.0 <item> or Atom <entry> blocks into {title, link, date}. */
function parseFeed(xml) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  return blocks.map((block) => {
    const title = tagContent(block, 'title').replace(/<[^>]+>/g, '').trim();
    let link = tagContent(block, 'link');
    if (!link) {
      // Atom: <link href="..."/> — prefer rel="alternate" or the first href.
      const alt = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)
        ?? block.match(/<link[^>]*href=["']([^"']+)["']/i);
      link = alt ? decodeEntities(alt[1]) : '';
    }
    const dateStr = tagContent(block, 'pubDate') || tagContent(block, 'published') || tagContent(block, 'updated') || tagContent(block, 'dc:date');
    const date = dateStr ? new Date(dateStr) : null;
    return { title, link, date: date && !Number.isNaN(date.getTime()) ? date : null };
  }).filter((it) => it.title && it.link);
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'user-agent': 'Mozilla/5.0 (daily-digest bot)', accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = parseFeed(await res.text());
    return items.map((it) => ({ ...it, source: feed.name }));
  } catch (err) {
    console.error(`[warn] ${feed.name} (${feed.url}): ${err.message}`);
    return [];
  }
}

function buildSection(section, allItems) {
  const cutoff = Date.now() - section.windowHours * 3600 * 1000;
  const seen = new Set();
  const perFeed = new Map();
  const picked = [];
  const sorted = allItems
    .filter((it) => it.date && it.date.getTime() >= cutoff)
    .sort((a, b) => b.date - a.date);
  // Round-robin-ish: cap per feed so one chatty source doesn't fill the section.
  for (const it of sorted) {
    const key = it.title.toLowerCase().replace(/\W+/g, ' ').trim();
    if (seen.has(key)) continue;
    const count = perFeed.get(it.source) ?? 0;
    if (count >= section.maxPerFeed) continue;
    seen.add(key);
    perFeed.set(it.source, count + 1);
    picked.push(it);
    if (picked.length >= section.maxItems) break;
  }
  return picked;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDigest(sectionsWithItems) {
  const today = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const lines = [`<b>📰 Daily Digest — ${today}</b>`];
  for (const { section, items } of sectionsWithItems) {
    lines.push('', `<b>${escapeHtml(section.title)}</b>`);
    if (items.length === 0) {
      lines.push('<i>Nothing new today.</i>');
      continue;
    }
    for (const it of items) {
      lines.push(`• <a href="${escapeHtml(it.link)}">${escapeHtml(it.title)}</a> — ${escapeHtml(it.source)}`);
    }
  }
  return lines.join('\n');
}

/** Split on line boundaries so each chunk fits Telegram's message limit. */
function chunkMessage(text, limit = TELEGRAM_LIMIT - 96) {
  const chunks = [];
  let current = '';
  for (const line of text.split('\n')) {
    if (current && current.length + line.length + 1 > limit) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set (or use --dry-run)');
  }
  for (const chunk of chunkMessage(text)) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.ok === false) {
      throw new Error(`Telegram sendMessage failed: HTTP ${res.status} ${JSON.stringify(body)}`);
    }
  }
}

async function main() {
  const sectionsWithItems = [];
  for (const section of SECTIONS) {
    const results = await Promise.all(section.feeds.map(fetchFeed));
    const items = buildSection(section, results.flat());
    sectionsWithItems.push({ section, items });
  }

  const total = sectionsWithItems.reduce((n, s) => n + s.items.length, 0);
  if (total === 0) {
    console.error('[error] no items fetched from any feed — not sending');
    process.exit(1);
  }

  const digest = formatDigest(sectionsWithItems);
  if (DRY_RUN) {
    console.log(digest);
    console.log(`\n[dry-run] ${total} items, ${digest.length} chars, ${chunkMessage(digest).length} message(s)`);
    return;
  }
  await sendTelegram(digest);
  console.log(`Sent digest with ${total} items.`);
}

main().catch((err) => {
  console.error(`[error] ${err.message}`);
  process.exit(1);
});
