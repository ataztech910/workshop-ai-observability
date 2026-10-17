// Case 2. "Payment failed" — the browser got a 400. Why? Find the failed requests, then everything the app recorded
// in the same trace: the reason is there only if somebody put it on a span (block 3).
import { loadSpans } from './spans.mjs'

const spans = loadSpans()
const rejected = spans.filter((s) => s.kind === 2 && s.attributes['http.route'] === '/api/checkout' && s.attributes['http.status_code'] === 400)
console.log(`${rejected.length} rejected orders\n`)
for (const request of rejected) {
  console.log(`trace ${request.traceId}`)
  for (const s of spans.filter((s) => s.traceId === request.traceId && s !== request)) {
    const own = Object.entries(s.attributes).filter(([key]) => !key.startsWith('next.') && !key.startsWith('http.') && key !== 'operation.name')
    if (own.length) console.log(`  ${s.name}  ${own.map(([k, v]) => `${k}=${v}`).join('  ')}`)
  }
}
