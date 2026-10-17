// Case 5. Which deployment made it slow? Every span carries service.version — compare one operation across versions.
//   npm run case regression              chargePayment
//   npm run case regression getProductById
import { groupBy, loadSpans, percentile } from './spans.mjs'

const operation = process.argv[2] ?? 'chargePayment'
const byVersion = groupBy(loadSpans().filter((s) => s.name === operation), (s) => s.version ?? '(none)')
console.log(`${operation} by version:\n`)
for (const [version, spans] of [...byVersion].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))) {
  const ms = spans.map((s) => s.durationMs)
  console.log(`  ${version.padEnd(8)} calls ${String(ms.length).padStart(4)}   p50 ${percentile(ms, 50).toFixed(0).padStart(5)} ms   p95 ${percentile(ms, 95).toFixed(0).padStart(5)} ms`)
}
