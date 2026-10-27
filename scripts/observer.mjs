// `npm run observer:real` — the observer with a real model instead of the mock one (OBSERVE_AI=real). Cross-platform:
// `OBSERVE_AI=real npm run observer` does not work in Windows' cmd. The model's keys (GEMINI_API_KEY + GEMINI_MODEL,
// or none for Kitana) come from your shell or from a .env file here — git ignores it.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

if (existsSync('.env')) process.loadEnvFile('.env')
const mode = process.argv[2] ?? 'real'

// The same `npm run observer` as always — one place for the observer's version.
const child = spawn('npm', ['run', 'observer'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, OBSERVE_AI: mode },
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('exit', (code) => process.exit(code ?? 0))
