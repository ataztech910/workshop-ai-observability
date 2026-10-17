// Case 6. Which operation fails most often? An error rate that is neither 0% nor 100% is a dependency that works
// "sometimes" — the hardest kind to reproduce by hand.
import { loadSpans } from './spans.mjs'

const stats = new Map()
for (const s of loadSpans()) {
  const st = stats.get(s.name) ?? { calls: 0, errors: 0 }
  st.calls++
  if (s.error) st.errors++
  stats.set(s.name, st)
}
const MIN_CALLS = 10 // a single failed call says nothing about a rate
console.log(`error rate by operation (${MIN_CALLS}+ calls, at least one error):\n`)
for (const [name, { calls, errors }] of [...stats].filter(([, st]) => st.calls >= MIN_CALLS && st.errors > 0).sort((a, b) => b[1].errors / b[1].calls - a[1].errors / a[1].calls)) {
  console.log(`  ${String(Math.round((errors / calls) * 100)).padStart(3)}%  ${String(errors).padStart(4)} of ${String(calls).padEnd(5)} ${name}`)
}
