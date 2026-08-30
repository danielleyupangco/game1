/**
 * Produces a single self-contained HTML file.
 *
 * The published page has no server and no module loading beyond the page
 * itself, so every chunk has to be inlined — which also means code splitting
 * and lazy imports have to be off for this build only.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = process.argv[2] ?? path.join(ROOT, 'dist-artifact', 'ledger.html')

const build = spawnSync('npx', ['vite', 'build', '--mode', 'artifact'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, ARTIFACT: '1' },
})
if (build.status !== 0) process.exit(build.status ?? 1)

const dist = path.join(ROOT, 'dist')
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')

// Inline every stylesheet and script the built page references.
html = html.replace(/<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => {
  const css = fs.readFileSync(path.join(dist, href.replace(/^\.?\//, '')), 'utf8')
  return `<style>\n${css}\n</style>`
})
html = html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, src) => {
  const js = fs.readFileSync(path.join(dist, src.replace(/^\.?\//, '')), 'utf8')
  return `<script type="module">\n${escapeForInlineScript(js)}\n</script>`
})

/**
 * Makes a bundle safe to paste between <script> tags.
 *
 * Two hazards: a literal </script> closes the tag early, and raw U+FFFD or a
 * lone surrogate is not well-formed text the host will accept. HTML entities
 * are not decoded inside a script element, so those characters are rewritten
 * as JavaScript escapes — valid in string literals, template literals and
 * regex literals alike, which is everywhere a minifier can put them.
 */
function escapeForInlineScript(source) {
  return source
    .replace(/<\/script>/gi, '<\\/script>')
    .replace(/\uFFFD/g, '\\uFFFD')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, (c) =>
      `\\u${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
    )
}

// The host wraps the file in its own document skeleton, so hand back only the
// page content: title, styles, body markup, then scripts. Vite emits the module
// script into <head>, so it is collected separately and re-appended after the
// markup — otherwise it would be dropped with the rest of the head.
const title = (html.match(/<title>([\s\S]*?)<\/title>/) ?? [, 'Ledger'])[1]
const styles = [...html.matchAll(/<style>[\s\S]*?<\/style>/g)].map((m) => m[0]).join('\n')
const scripts = [...html.matchAll(/<script type="module">[\s\S]*?<\/script>/g)].map((m) => m[0]).join('\n')
const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/) ?? [, ''])[1]

if (!scripts) {
  console.error('no inlined script found — the build output changed shape')
  process.exit(1)
}

const page = `<title>${title}</title>\n${styles}\n${body}\n${scripts}\n`

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, page)
console.log(`\n${path.relative(process.cwd(), OUT)} — ${(page.length / 1e6).toFixed(2)} MB`)
