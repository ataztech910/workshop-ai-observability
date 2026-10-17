// Case 2. "Payment failed" — the browser got a 400. Why? Find the failed requests, then what the app itself recorded
// on the server in the same trace: the reason is there only if somebody put it on a span (your placeOrder).
//   npm run case checkout-400                — with your tools/cases/rejected.mjs
//   npm run case checkout-400 -- --solution  — with the finished one
import { loadSpans } from './spans.mjs'

const { isRejected } = await import(process.argv.includes('--solution') ? '../solutions/rejected.mjs' : './rejected.mjs')

// What the server instrumentation adds on its own (HTTP, Next.js, code location) — not an explanation of anything.
const AUTOMATIC = /^(http|next|code|observe)\.|^(operation|resource)\.name$/

const spans = loadSpans().filter((s) => !s.service?.endsWith('-browser'))
const byTrace = Map.groupBy(spans, (s) => s.traceId)
const rejected = spans.filter(isRejected)
console.log(`${rejected.length} rejected orders\n`)
if (rejected.length === 0) console.log('none found — buy 20 of something in the shop, or finish tools/cases/rejected.mjs')
for (const request of rejected) {
  console.log(`trace ${request.traceId}`)
  let said = false
  for (const s of byTrace.get(request.traceId)) {
    const own = Object.entries(s.attributes).filter(([key]) => !AUTOMATIC.test(key))
    if (own.length) console.log(`  ${s.name}  ${own.map(([k, v]) => `${k}=${v}`).join('  ')}`)
    said ||= own.length > 0
  }
  if (!said) console.log('  nothing — the app did not record why')
}
