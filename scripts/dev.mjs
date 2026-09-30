// `npm run dev:v1` / `npm run dev:v2` — run the app as a given "deployment" against a separately running observer
// (`npm run observer`), so switching versions keeps the telemetry history — like a real deploy.
// v2 contains the slow-payment regression; every span carries its version (service.version). Cross-platform.
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const version = process.argv[2] ?? 'v2'
const endpoint = process.env.OBSERVE_ENDPOINT ?? 'http://127.0.0.1:4318'

const observer = await fetch(`${endpoint}/health`).then((r) => r.ok, () => false)
if (!observer) {
  console.error(`No observer at ${endpoint} — start it first in another terminal:  npm run observer`)
  process.exit(1)
}

const nextBin = join(dirname(createRequire(import.meta.url).resolve('next/package.json')), 'dist', 'bin', 'next')
console.log(`[shop] starting ${version} → telemetry to ${endpoint}`)
const child = spawn(process.execPath, [nextBin, 'dev', ...process.argv.slice(3)], {
  stdio: 'inherit',
  env: { ...process.env, SHOP_VERSION: version, OBSERVE_SERVICE_VERSION: version, OBSERVE_ENDPOINT: endpoint },
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('exit', (code) => process.exit(code ?? 0))
