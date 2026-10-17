// Case 4. N+1: inside one request, the same call repeated once per item instead of once for all of them.
// Aggregates hide it (each call is fast); the structure of a single trace shows it.
import { loadSpans } from './spans.mjs'

const MIN_REPEATS = 3
// Server side only: a browser loading 17 files for one page is how pages load, not a bug.
const spans = loadSpans().filter((s) => !s.service?.endsWith('-browser'))
const nameOf = new Map(spans.map((s) => [s.spanId, s.name])) // to say where the repeats happen

const patterns = new Map() // "parent → child" → { counts: repeats each time, traces: where }
for (const siblings of Map.groupBy(spans.filter((s) => s.parentSpanId), (s) => `${s.traceId} ${s.parentSpanId} ${s.name}`).values()) {
  if (siblings.length < MIN_REPEATS) continue
  const pattern = `${nameOf.get(siblings[0].parentSpanId) ?? '?'} → ${siblings[0].name}`
  if (!patterns.has(pattern)) patterns.set(pattern, { counts: [], traces: new Set() })
  patterns.get(pattern).counts.push(siblings.length)
  patterns.get(pattern).traces.add(siblings[0].traceId)
}
console.log(`the same call ${MIN_REPEATS}+ times under one parent:\n`)
for (const [pattern, { counts, traces }] of [...patterns].sort((a, b) => b[1].traces.size - a[1].traces.size)) {
  const min = Math.min(...counts), max = Math.max(...counts)
  console.log(`  ${pattern} ×${min === max ? min : `${min}–${max}`}   in ${traces.size} traces`)
}
