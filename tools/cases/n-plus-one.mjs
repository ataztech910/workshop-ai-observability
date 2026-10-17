// Case 4. N+1: inside one request, the same call repeated once per item instead of once for all of them.
// Aggregates hide it (each call is fast); the structure of a single trace shows it.
import { loadSpans } from './spans.mjs'

const MIN_REPEATS = 3
// Server side only: a browser loading 17 files for one page is how pages load, not a bug.
const spans = loadSpans().filter((s) => !s.service?.endsWith('-browser'))
const parentName = new Map(spans.map((s) => [s.spanId, s.name])) // to say where the repeats happen
const groups = new Map() // "trace + parent + name" → spans
for (const s of spans) {
  if (!s.parentSpanId) continue
  const key = `${s.traceId} ${s.parentSpanId} ${s.name}`
  groups.set(key, [...(groups.get(key) ?? []), s])
}

const repeated = new Map() // "parent → child ×N" → how many traces
for (const list of groups.values()) {
  if (list.length < MIN_REPEATS) continue
  const key = `${parentName.get(list[0].parentSpanId) ?? '?'} → ${list[0].name} ×${list.length}`
  repeated.set(key, (repeated.get(key) ?? 0) + 1)
}
console.log(`the same call ${MIN_REPEATS}+ times under one parent:\n`)
for (const [pattern, traces] of [...repeated].sort((a, b) => b[1] - a[1])) console.log(`  ${pattern}   in ${traces} traces`)
