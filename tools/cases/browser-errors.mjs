// Case 1. Errors in the user's browser — the ones you never see in your own console.
// The browser APM agent turns each one into a span with an `exception` event.
import { loadSpans } from './spans.mjs'

const found = new Map()
for (const span of loadSpans()) {
  if (!span.service?.endsWith('-browser')) continue
  for (const event of span.events) {
    if (event.name !== 'exception') continue
    // The first line is enough to tell errors apart (the hydration diff below it differs every time).
    const key = `${span.name}: ${String(event.attributes['exception.message'] ?? '(no message)').split('\n')[0]}`
    found.set(key, (found.get(key) ?? 0) + 1)
  }
}
console.log(`${found.size} different errors in browsers:\n`)
for (const [error, count] of [...found].sort((a, b) => b[1] - a[1])) console.log(`  ${count}×  ${error.slice(0, 140)}`)
