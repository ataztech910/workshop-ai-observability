// Case 5. Which deployment made it slow? Every span carries service.version — compare one operation across versions.
//   npm run case regression              chargePayment
//   npm run case regression getProductById
import { loadSpans, percentile } from './spans.mjs'

const operation = process.argv[2] ?? 'chargePayment'
const byVersion = new Map()
for (const s of loadSpans()) {
  if (s.name !== operation) continue
  byVersion.set(s.version ?? '(none)', [...(byVersion.get(s.version ?? '(none)') ?? []), s.durationMs])
}
console.log(`${operation} by version:\n`)
for (const [version, ms] of [...byVersion].sort()) {
  console.log(`  ${version.padEnd(8)} calls ${String(ms.length).padStart(4)}   p50 ${percentile(ms, 50).toFixed(0).padStart(5)} ms   p95 ${percentile(ms, 95).toFixed(0).padStart(5)} ms`)
}
