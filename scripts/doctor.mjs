// `npm run doctor` — is this machine ready for the workshop? Each check says what to do when it fails.
// Required checks fail the command (exit 1); the real-AI check is optional — everything also runs with a mock model.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// At least the version with scheduled checks (block 5). A range with a patch number also keeps an older copy in
// npm's cache from being picked.
const OBSERVER = 'next-observer@^0.3.26'
// The standard OTLP port: your receiver listens there in blocks 2–4, the observer takes it over in block 5.
const OBSERVER_PORT = 4318
// The catch-up points. block-6-incident-f is the instructor's demo, not needed on your machine.
const TAGS = ['block-0-start', 'block-3-instrumentation', 'block-5-observer']
const root = process.cwd()
const isWindows = process.platform === 'win32'

const results = []
const ok = (label) => results.push({ status: 'ok', label })
const fail = (label, fix) => results.push({ status: 'fail', label, fix })
const warn = (label, fix) => results.push({ status: 'warn', label, fix })

const run = (command, args, timeout = 60_000, cwd = root) => spawnSync(command, args, { cwd, encoding: 'utf8', timeout, shell: isWindows })

// 1. Node.js: next-observer loads observe.agents.ts with Node's type stripping (22.18+).
const [major, minor] = process.versions.node.split('.').map(Number)
if (major > 22 || (major === 22 && minor >= 18)) ok(`Node.js ${process.versions.node}`)
else fail(`Node.js ${process.versions.node} — 22.18 or newer is needed`, 'install the current LTS from https://nodejs.org (or `nvm install --lts`)')

// 2. Dependencies installed. Read package.json files directly: packages with an `exports` map (next-observe) refuse
// require.resolve('<name>/package.json').
const installed = (name) => {
  try {
    return JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8')).version
  } catch {
    return undefined
  }
}
const next = installed('next')
const nextObserve = installed('next-observe')
if (!next) fail('dependencies are not installed', 'run `npm install` in this folder')
// You install next-observe yourself in part 2 — not having it yet is the starting point, not a problem.
else ok(`npm install done (next ${next}${nextObserve ? `, next-observe ${nextObserve}` : ', next-observe comes in part 2'})`)

// 3. The observer is downloaded — `npm run dev` / `npm run observer` start it with npx, which needs the network once.
// Through the network on purpose (no --prefer-offline): this runs at home and should pick up the newest observer.
const observer = run('npx', ['--yes', OBSERVER, '--help'], 180_000)
if (observer.status === 0) ok(`observer ready (${OBSERVER})`)
else fail('the observer could not be downloaded or started', `run \`npx --yes ${OBSERVER} --help\` while online and read its error`)

// 4. Its port is free — or the observer or your receiver is already running there, which is fine.
const portFree = await new Promise((resolve) => {
  const server = createServer()
  server.once('error', () => resolve(false))
  server.listen(OBSERVER_PORT, '127.0.0.1', () => server.close(() => resolve(true)))
})
if (portFree) ok(`port ${OBSERVER_PORT} is free for your receiver and the observer`)
else {
  // Recognise ours by the /health body, not just a 200: any web server answers 200 somewhere. The observer also counts
  // its spans; tools/receiver.mjs says only {"status":"ok"}. With a timeout: a hung program must not hang the check.
  const health = await fetch(`http://127.0.0.1:${OBSERVER_PORT}/health`, { signal: AbortSignal.timeout(3000) })
    .then((r) => r.json())
    .then((body) => (body?.status !== 'ok' ? undefined : typeof body.spans === 'number' ? 'the observer' : 'your receiver'), () => undefined)
  if (health) ok(`${health} is already running on port ${OBSERVER_PORT}`)
  else fail(`port ${OBSERVER_PORT} is used by another program`, `stop it — the app sends its telemetry to ${OBSERVER_PORT}, where your receiver (blocks 2–4) and the observer (block 5) listen`)
}

// 5. The block tags, to catch up during the workshop.
if (existsSync(join(root, '.git'))) {
  const tags = run('git', ['tag', '--list', 'block-*']).stdout?.split(/\r?\n/).filter(Boolean) ?? []
  const missing = TAGS.filter((t) => !tags.includes(t))
  if (missing.length === 0) ok(`workshop tags present (${TAGS.join(', ')})`)
  else fail(`missing git tags: ${missing.join(', ')}`, 'run `git fetch --tags`')
} else warn('not a git clone — catching up with tags will not work', 'clone the repository with git instead of downloading a zip')

// 6. Everything the blocks add is in npm's cache, so the workshop does not depend on the Wi-Fi. Two things are needed,
// and both are done once in a temporary folder that is removed afterwards:
//   - in block 3 you run `npm install next-observe`: without a lockfile entry npm has to look up which versions exist,
//     so the same command is run here from the starting state — that caches the lookups;
//   - catching up (`git checkout -B workshop <tag> && npm install`) installs exactly what the tag's lockfile names, so
//     the last block's dependency tree is installed too — that caches every package file.
const START = TAGS[0]
const LAST_BLOCK = TAGS[TAGS.length - 1]
const fileAt = (tag, file) => run('git', ['show', `${tag}:${file}`])
const sources = { startPkg: fileAt(START, 'package.json'), startLock: fileAt(START, 'package-lock.json'), lastPkg: fileAt(LAST_BLOCK, 'package.json'), lastLock: fileAt(LAST_BLOCK, 'package-lock.json') }
const cannotDownload = (reason) =>
  fail(`could not download the packages the blocks add${reason ? ` (${reason})` : ''}`, 'check the network and run `npm run doctor` again — do it before the workshop, the Wi-Fi there is slow')
if (Object.values(sources).some((r) => r.status !== 0)) {
  warn('could not prepare the blocks for working offline (the workshop tags are missing)', 'run `git fetch --tags`, then `npm run doctor` again')
} else {
  // Anything unexpected here (no writable temp folder, a damaged tag) is one failed check, not a crash of the report.
  let tmp
  try {
    tmp = mkdtempSync(join(tmpdir(), 'porto-shop-cache-'))
    // No --prefer-offline here either: the cache should end up with what the registry has today.
    const npm = (args) => run('npm', [...args, '--ignore-scripts', '--no-audit', '--no-fund'], 600_000, tmp).status === 0
    writeFileSync(join(tmp, 'package.json'), sources.startPkg.stdout)
    writeFileSync(join(tmp, 'package-lock.json'), sources.startLock.stdout)
    // What the blocks add on top of the start: next-observe and the OpenTelemetry API (block 3).
    const startDeps = JSON.parse(sources.startPkg.stdout).dependencies ?? {}
    const added = Object.keys(JSON.parse(sources.lastPkg.stdout).dependencies ?? {}).filter((name) => !(name in startDeps))
    const likeInit = added.length === 0 || npm(['install', ...added])
    writeFileSync(join(tmp, 'package.json'), sources.lastPkg.stdout)
    writeFileSync(join(tmp, 'package-lock.json'), sources.lastLock.stdout)
    const likeCatchUp = npm(['ci'])
    if (likeInit && likeCatchUp) ok('every part works without Wi-Fi (the packages are in npm\'s cache)')
    else cannotDownload()
  } catch (error) {
    cannotDownload(error instanceof Error ? error.message : String(error))
  } finally {
    // Removing a folder that could not be created, or cannot be removed, must not hide the result either.
    try {
      if (tmp) rmSync(tmp, { recursive: true, force: true })
    } catch {
      // The system clears its temp folder on its own.
    }
  }
}

// 7. Google Chrome for `npm run users` (customers in a browser) — playwright-core drives the installed Chrome, so
// nothing is downloaded. Optional: without it the browser bugs are still there to click by hand.
try {
  const { chromium } = await import('playwright-core')
  const chrome = await chromium.launch({ channel: 'chrome', headless: true, timeout: 30_000 })
  await chrome.close()
  ok('Google Chrome for npm run users')
} catch {
  warn('Google Chrome not found — npm run users needs it', 'install it from https://www.google.com/chrome/ (or click through the shop by hand)')
}

// 8. Real AI (optional): Gemini, or Kitana through a logged-in CLI.
const hasCli = (name) => run(name, ['--version'], 20_000).status === 0
if (process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL) ok(`real AI: Gemini (${process.env.GEMINI_MODEL})`)
else if (process.env.GEMINI_API_KEY) warn('GEMINI_API_KEY is set but GEMINI_MODEL is not', 'set GEMINI_MODEL too, e.g. GEMINI_MODEL=gemini-2.5-flash')
else {
  const cli = ['claude', 'codex'].find(hasCli)
  if (cli) ok(`real AI: Kitana through the ${cli} CLI (make sure you are logged in)`)
  else warn('no real AI configured — agents run with the mock model', 'optional: set GEMINI_API_KEY + GEMINI_MODEL, or install and log in to the Claude Code or Codex CLI')
}

const mark = { ok: '✓', warn: '!', fail: '✗' }
console.log('Porto Shop — workshop check\n')
for (const r of results) {
  console.log(`  ${mark[r.status]} ${r.label}`)
  if (r.fix) console.log(`      → ${r.fix}`)
}
const failed = results.filter((r) => r.status === 'fail').length
console.log(failed ? `\n${failed} problem(s) to fix before the workshop.` : '\nAll set — see you at the workshop.')
process.exit(failed ? 1 : 0)
