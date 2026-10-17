// Case 3. Which requests does the app get most? One route taking most of the traffic while nobody does anything
// special is a loop: an effect that sets state that re-runs the effect.
import { loadSpans } from './spans.mjs'

const requests = loadSpans().filter((s) => s.kind === 2) // SERVER spans: one per request the app received
const byRoute = new Map()
for (const r of requests) {
  const route = `${r.attributes['http.method']} ${r.attributes['http.route'] ?? r.attributes['http.target']}`
  byRoute.set(route, (byRoute.get(route) ?? 0) + 1)
}
console.log(`${requests.length} requests\n`)
for (const [route, count] of [...byRoute].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(Math.round((count / requests.length) * 100)).padStart(3)}%  ${String(count).padStart(5)}  ${route}`)
}
