# Daily News Digest → Telegram

Every day at **7:00 AM Philippine time**, a GitHub Action
(`.github/workflows/daily-digest.yml`) runs `scripts/daily-digest.mjs`, which
pulls headlines from RSS feeds and sends them to you on Telegram, grouped into
three sections:

| Section | Sources | Lookback |
|---|---|---|
| 🤖 AI News | TechCrunch AI, The Verge AI, VentureBeat AI, MIT Tech Review | 26 h |
| 💡 Practical AI & Tips | One Useful Thing (Ethan Mollick), Simon Willison, Ben's Bites, Latent Space | 96 h |
| 🇵🇭 Philippines | Rappler, BusinessMirror, Philstar, Inquirer News, Inquirer Lifestyle, GMA News | 26 h |

No API keys or paid services are involved — only a free Telegram bot.

## One-time setup (~5 minutes)

### 1. Create a Telegram bot

1. In Telegram, open a chat with **[@BotFather](https://t.me/BotFather)**.
2. Send `/newbot` and follow the prompts (pick any name, e.g. `Dani Daily Digest`).
3. BotFather replies with a **bot token** like `1234567890:AAExAmPlEtOkEn...`. Copy it.

### 2. Get your chat ID

1. Open a chat with your new bot and send it any message (e.g. "hi") —
   this is required before the bot can message you.
2. In a browser, open (with your token substituted):
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
3. Find `"chat":{"id":123456789,...}` in the response — that number is your **chat ID**.

### 3. Add the secrets to this repo

On GitHub: **Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | the token from BotFather |
| `TELEGRAM_CHAT_ID` | the chat ID from step 2 |

### 4. Test it

Go to **Actions → Daily News Digest → Run workflow**. You should receive the
digest in Telegram within a minute. After that it arrives automatically every
morning. (GitHub's cron can drift 5–15 minutes at busy times.)

## Customizing

Everything lives in `scripts/daily-digest.mjs`:

- **Add/remove sources:** edit the `feeds` arrays in `SECTIONS` (any RSS or Atom URL works).
- **More or fewer headlines:** adjust `maxItems` / `maxPerFeed` per section.
- **Different delivery time:** change the `cron` line in
  `.github/workflows/daily-digest.yml` (cron is in UTC; PH time minus 8 hours).
- **Test locally:** `node scripts/daily-digest.mjs --dry-run` prints the digest
  without sending anything.
