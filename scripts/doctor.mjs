// `npm run doctor` — is this machine ready for the workshop? Each check says what to do when it fails.
// Required checks fail the command (exit 1); the real-AI check is optional — everything also runs with a mock model.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'

const OBSERVER = 'next-observer@^0.3'
const OBSERVER_PORT = 4318
const TAGS = ['block-2-start', 'block-2-init', 'block-3-instrumentation', 'block-4-agents']
const root = process.cwd()
const isWindows = process.platform === 'win32'

const results = []
const ok = (label) => results.push({ status: 'ok', label })
const fail = (label, fix) => results.push({ status: 'fail', label, fix })
const warn = (label, fix) => results.push({ status: 'warn', label, fix })

const run = (command, args, timeout = 60_000) => spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout, shell: isWindows })

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
// next-observe comes with `npx next-observer init` in block 2 — not having it yet is the starting point, not a problem.
else ok(`npm install done (next ${next}${nextObserve ? `, next-observe ${nextObserve}` : ', next-observe comes with init in block 2'})`)

// 3. The observer is downloaded — `npm run dev` / `npm run observer` start it with npx, which needs the network once.
const observer = run('npx', ['--yes', '--prefer-offline', OBSERVER, '--help'], 180_000)
if (observer.status === 0) ok(`observer ready (${OBSERVER})`)
else fail('the observer could not be downloaded or started', `run \`npx --yes ${OBSERVER} --help\` while online and read its error`)

// 4. Its port is free — or the observer is already running there, which is fine.
const portFree = await new Promise((resolve) => {
  const server = createServer()
  server.once('error', () => resolve(false))
  server.listen(OBSERVER_PORT, '127.0.0.1', () => server.close(() => resolve(true)))
})
if (portFree) ok(`port ${OBSERVER_PORT} is free for the observer`)
else {
  // Recognise the observer by its /health body, not just a 200: any web server answers 200 somewhere.
  // With a timeout: a hung program on the port must not hang the check.
  const health = await fetch(`http://127.0.0.1:${OBSERVER_PORT}/health`, { signal: AbortSignal.timeout(3000) })
    .then((r) => r.json())
    .then((body) => body?.status === 'ok' && typeof body.spans === 'number', () => false)
  if (health) ok(`the observer is already running on port ${OBSERVER_PORT}`)
  else fail(`port ${OBSERVER_PORT} is used by another program`, `stop it, or start the observer on another port: \`npx ${OBSERVER} collector --port 4319\` (and OBSERVE_ENDPOINT=http://127.0.0.1:4319)`)
}

// 5. The block tags, to catch up during the workshop.
if (existsSync(join(root, '.git'))) {
  const tags = run('git', ['tag', '--list', 'block-*']).stdout?.split(/\r?\n/).filter(Boolean) ?? []
  const missing = TAGS.filter((t) => !tags.includes(t))
  if (missing.length === 0) ok('workshop tags present (block-2-start … block-4-agents)')
  else fail(`missing git tags: ${missing.join(', ')}`, 'run `git fetch --tags`')
} else warn('not a git clone — catching up with tags will not work', 'clone the repository with git instead of downloading a zip')

// 6. Real AI (optional): Gemini, or Kitana through a logged-in CLI.
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
