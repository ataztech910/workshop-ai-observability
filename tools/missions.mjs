// npm run mission — where you are in the shop's missions of part 2. It reads your project files and what your
// receiver has written to .telemetry/spans.ndjson, and prints a checklist: ✓ done, ✗ with what to do next.
// Run it as often as you like; nothing here changes your code.
import { existsSync, readFileSync } from 'node:fs'
import { loadSpans } from './cases/spans.mjs'

const root = new URL('../', import.meta.url)
const read = (file) => {
  try {
    return readFileSync(new URL(file, root), 'utf8')
  } catch {
    return ''
  }
}
/** A line that is there and not commented out. */
const active = (file, pattern) => read(file).split('\n').some((line) => !line.trim().startsWith('//') && pattern.test(line))
const paint = (code, text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text)

const app = JSON.parse(read('package.json') || '{}')
const spans = loadSpans({ quiet: true })
const fromShop = spans.filter((s) => s.service === app.name)
const fromBrowser = spans.filter((s) => s.service === `${app.name}-browser`)
const ROUTE = 'app/api/checkout/route.ts'
const placeOrders = fromShop.filter((s) => s.name === 'placeOrder')

const MISSIONS = [
  {
    title: 'The APM agent, by hand — let the shop report itself',
    done: [
      'the shop reports itself: the same OTLP you wrote by hand, now automatic.',
      'Two bugs from part 1 are data now. But read the 400: it says THAT the order failed, not WHY — next mission.',
    ],
    goals: [
      {
        what: 'next-observe installed',
        ok: () => Boolean(app.dependencies?.['next-observe']) && existsSync(new URL('node_modules/next-observe/package.json', root)),
        hint: 'npm install next-observe',
      },
      {
        what: 'server half',
        ok: () => active('instrumentation.ts', /export \{ register \} from 'next-observe\/server'/),
        hint: 'instrumentation.ts — uncomment the ▶ line',
      },
      {
        what: 'browser half',
        ok: () => active('instrumentation-client.ts', /import 'next-observe\/client'/),
        hint: 'instrumentation-client.ts — uncomment the ▶ line',
      },
      {
        what: 'browser route',
        ok: () => active('next.config.ts', /import \{ withObserve \}/) && active('next.config.ts', /config = withObserve\(nextConfig\)/),
        hint: 'next.config.ts — uncomment both ▶ lines',
      },
      {
        what: 'server spans arrive',
        ok: () => fromShop.length > 0,
        got: () => `${fromShop.length} spans`,
        hint: 'receiver running? then restart npm run dev and open a page of the shop',
      },
      {
        what: 'browser spans arrive',
        ok: () => fromBrowser.length > 0,
        got: () => `${fromBrowser.length} spans`,
        hint: 'reload the shop in the browser (the page needs the new instrumentation-client.ts)',
      },
      {
        what: 'the 400 is data',
        ok: () => fromShop.some((s) => s.name?.includes('/api/checkout') && Number(s.attributes['http.response.status_code'] ?? s.attributes['http.status_code']) === 400),
        hint: 'in the shop: product 1 → Quantity 20 → Buy',
      },
      {
        what: 'a browser error is data',
        ok: () => fromBrowser.some((s) => s.attributes['observe.kind'] === 'browser-error'),
        hint: 'in the shop: product 1 → ♡ Save for later',
      },
      {
        what: 'terminal readable',
        ok: () => active('tools/print-spans.mjs', /if \(NOISE\.has\(scope\?\.name\)/),
        hint: 'tools/print-spans.mjs — uncomment the noise-filter ▶ line: Next.js sends a dozen spans per page',
      },
    ],
  },
  {
    title: 'A span of your own — make the 400 say why',
    done: [
      'the 400 says why now — a reason no automatic instrumentation could know.',
      'Your code knows the business; a span of your own puts that knowledge where the telemetry is.',
    ],
    goals: [
      {
        what: 'the API',
        ok: () => active(ROUTE, /import \{ trace \} from '@opentelemetry\/api'/),
        hint: `${ROUTE} — uncomment the import ▶ line`,
      },
      {
        what: 'the span',
        ok: () => active(ROUTE, /span = trace\.getTracer\('porto-shop'\)\.startSpan\('placeOrder'\)/),
        hint: `${ROUTE} — uncomment the startSpan ▶ line`,
      },
      {
        what: 'order.quantity',
        ok: () => active(ROUTE, /span\.setAttribute\('order\.quantity'/),
        hint: `${ROUTE} — uncomment the order.quantity ▶ line`,
      },
      {
        what: 'order.rejected',
        ok: () => active(ROUTE, /span\.setAttribute\('order\.rejected'/),
        hint: `${ROUTE} — uncomment the order.rejected ▶ line`,
      },
      {
        what: 'placeOrder arrives',
        ok: () => placeOrders.length > 0,
        got: () => `${placeOrders.length} spans`,
        hint: 'in the shop: buy anything (the dev server picks up the change on save)',
      },
      {
        what: 'the reason arrives',
        ok: () => placeOrders.some((s) => s.attributes['order.rejected']),
        got: () => String(placeOrders.find((s) => s.attributes['order.rejected'])?.attributes['order.rejected'] ?? ''),
        hint: 'in the shop: product 1 → Quantity 20 → Buy',
      },
    ],
  },
]

for (const [i, mission] of MISSIONS.entries()) {
  const results = mission.goals.map((g) => ({ ...g, done: g.ok() }))
  const done = results.filter((r) => r.done).length
  if (done === results.length) {
    console.log(paint(33, `★ Mission ${i + 3} complete — ${mission.done[0]}`))
    for (const line of mission.done.slice(1)) console.log(paint(33, `  ${line}`))
    continue
  }
  console.log(paint(33, `mission ${i + 3} · ${mission.title}  ${done}/${results.length}`))
  for (const r of results) {
    const mark = r.done ? paint(32, '✓') : paint(31, '✗')
    console.log(`  ${mark} ${r.what.padEnd(24)} ${(r.got?.() ?? '').padEnd(10)} ${r.done ? '' : paint(2, `← ${r.hint}`)}`)
  }
  break // one mission at a time: the next one shows when this one is done
}
