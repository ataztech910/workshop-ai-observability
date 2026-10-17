// Case 4. N+1: inside one request, the same call repeated once per item instead of once for all of them.
// Aggregates hide it (each call is fast); the structure of a single trace shows it.
import { groupBy, loadSpans } from './spans.mjs'

const MIN_REPEATS = 3
// Server side only: a browser loading 17 files for one page is how pages load, not a bug.
const spans = loadSpans().filter((s) => !s.service?.endsWith('-browser'))
const nameOf = new Map(spans.map((s) => [s.spanId, s.name])) // to say where the repeats happen

const patterns = new Map() // "parent → child" → how many times it repeated, once per trace
for (const siblings of groupBy(spans.filter((s) => s.parentSpanId), (s) => `${s.traceId} ${s.parentSpanId} ${s.name}`).values()) {
  if (siblings.length < MIN_REPEATS) continue
  const pattern = `${nameOf.get(siblings[0].parentSpanId) ?? '?'} → ${siblings[0].name}`
  if (!patterns.has(pattern)) patterns.set(pattern, [])
  patterns.get(pattern).push(siblings.length)
}
console.log(`the same call ${MIN_REPEATS}+ times under one parent:\n`)
for (const [pattern, counts] of [...patterns].sort((a, b) => b[1].length - a[1].length)) {
  const min = Math.min(...counts), max = Math.max(...counts)
  console.log(`  ${pattern} ×${min === max ? min : `${min}–${max}`}   in ${counts.length} traces`)
}
