// npm run mission <N> — your checklist for mission N of part 2: what it is about, what to do, and what is done.
// It reads your project files and what your receiver wrote to .telemetry/spans.ndjson; it never changes your code.
// Without a number it shows the first mission that is not done yet.
import { existsSync, readFileSync } from 'node:fs'
import { loadSpans } from './cases/spans.mjs'
import { FIRST_SPAN, TREE, handSpans } from './mission.mjs'

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
const uncomment = (file, what) => ({ what, hint: `${file} — uncomment the ${what} ▶ line` })

// ── What has arrived ───────────────────────────────────────────────────────────────────────────────────────────────
const app = JSON.parse(read('package.json') || '{}')
const spans = loadSpans({ quiet: true })
const fromShop = spans.filter((s) => s.service === app.name)
const fromBrowser = spans.filter((s) => s.service === `${app.name}-browser`)
const placeOrders = fromShop.filter((s) => s.name === 'placeOrder')
const functionSpans = fromShop.filter((s) => String(s.attributes['code.filepath'] ?? '').includes('lib/'))
// The last batch you sent by hand (missions 2 and 3), as raw OTLP — the shape you edit in span.json.
let lastByHand
const lines = read('.telemetry/spans.ndjson').split('\n')
for (let i = lines.length - 1; i >= 0 && !lastByHand; i--) {
  if (!lines[i].includes('"by-hand"')) continue // a cheap test first: most lines are the shop's batches
  try {
    const hand = handSpans(JSON.parse(lines[i]))
    if (hand.spans.length > 0) lastByHand = hand
  } catch {}
}
// Port 4318: your receiver in part 2, the observer from part 3 on. The observer's /health also counts its spans.
const OBSERVER = 'http://127.0.0.1:4318'
const ask = async (path) => {
  try {
    const res = await fetch(`${OBSERVER}${path}`, { signal: AbortSignal.timeout(1500) })
    return res.ok ? await res.json() : undefined
  } catch {
    return undefined
  }
}
const health = await ask('/health')
const receiverUp = Boolean(health)
const observerUp = typeof health?.spans === 'number'
const services = observerUp ? ((await ask('/api/services')) ?? []) : []
const inObserver = (name) => services.some((s) => s.name === name)
// Your placeOrder spans as the observer has them (part 3): the traces, then the span with the reason in one of them.
const placeOrderTraces = observerUp ? ((await ask('/api/traces?operation=placeOrder&exactOperation=true&limit=20')) ?? []) : []
let reasonInObserver
for (const t of placeOrderTraces) {
  const trace = await ask(`/api/traces/${t.traceId}`)
  reasonInObserver = trace?.spans?.find((s) => s.name === 'placeOrder' && s.attributes?.['order.rejected'])
  if (reasonInObserver) break
}
// Your own file: if it does not load (a line uncommented with its "Why" text, say), mission 7 says so and the rest works.
let isRejected = () => false
let rejectedBroken = ''
try {
  ;({ isRejected } = await import('./cases/rejected.mjs'))
} catch (error) {
  rejectedBroken = error.message
}
const rejected = fromShop.filter((s) => {
  try {
    return isRejected(s)
  } catch {
    return false
  }
})
const withReason = rejected.filter((r) => placeOrders.some((p) => p.traceId === r.traceId && p.attributes['order.rejected']))

/** Missions 2 and 3 are checked against your last hand-sent span(s), with the goals the receiver shows. */
function fromReceiver(mission, pick, missing) {
  const subject = lastByHand && pick(lastByHand)
  return mission.goals.map((g) => ({
    what: g.what,
    outcome: true,
    ok: () => Boolean(subject) && g.ok(subject, lastByHand.root),
    got: () => (subject ? String(g.got(subject, lastByHand.root)) : lastByHand ? missing.got : 'nothing sent yet'),
    hint: subject ? g.hint(lastByHand.root) : lastByHand ? missing.hint : 'send tools/span.json with curl (the command is in the README, part 2)',
  }))
}

const ROUTE = 'app/api/checkout/route.ts'

// ── The missions ───────────────────────────────────────────────────────────────────────────────────────────────────
const MISSIONS = [
  {
    title: 'Your own receiver',
    story: [
      'Before any tool, the thing every telemetry backend is: a server that takes OTLP over HTTP and keeps it.',
      'Yours listens on 4318, the standard port, and prints what arrives.',
    ],
    steps: [
      'tools/receiver.mjs — uncomment the five ▶ lines (Cmd+/), read the "Why" under each',
      'tools/print-spans.mjs — uncomment the first four ▶ lines',
      'start it in a second terminal: npm run receiver',
      "send the sample span: curl -s -H 'content-type: application/json' --data @tools/span.json http://127.0.0.1:4318/v1/traces",
    ],
    goals: [
      { ...uncomment('tools/receiver.mjs', 'chunks.push'), ok: () => active('tools/receiver.mjs', /chunks\.push\(chunk\)/) },
      { ...uncomment('tools/receiver.mjs', 'decode'), ok: () => active('tools/receiver.mjs', /batch = decode\(/) },
      { ...uncomment('tools/receiver.mjs', 'save'), ok: () => active('tools/receiver.mjs', /save\(batch\)/) },
      { ...uncomment('tools/receiver.mjs', 'printSpans'), ok: () => active('tools/receiver.mjs', /printSpans\(batch\)/) },
      { ...uncomment('tools/receiver.mjs', 'answer 200'), ok: () => active('tools/receiver.mjs', /\.end\('\{\}'\)/) },
      { ...uncomment('tools/print-spans.mjs', 'who'), ok: () => active('tools/print-spans.mjs', /who = `/) },
      { ...uncomment('tools/print-spans.mjs', 'ms'), ok: () => active('tools/print-spans.mjs', /ms = Number\(BigInt/) },
      { ...uncomment('tools/print-spans.mjs', 'error'), ok: () => active('tools/print-spans.mjs', /error = span\.status/) },
      { ...uncomment('tools/print-spans.mjs', 'details'), ok: () => active('tools/print-spans.mjs', /details = \(span\.attributes/) },
      { what: 'receiver running', outcome: true, ok: () => receiverUp || spans.length > 0, hint: 'npm run receiver in a second terminal' },
      { what: 'a batch kept', outcome: true, ok: () => spans.length > 0, got: () => `${spans.length} spans`, hint: 'send tools/span.json with the curl above' },
    ],
    stuck: 'npm run receiver -- --solution',
    done: 'a server, a JSON body, an answer — that is all a telemetry backend is at its core.',
  },
  {
    title: 'Your first span',
    story: [
      "Colony Sandy-9 cannot place an order, and Kevin's dashboard is all green.",
      'Be the app: write the span that reports the failed order — with the reason.',
    ],
    steps: [
      'edit tools/span.json — name, times, status, attributes',
      'send it with the same curl after each change; your receiver prints the checklist too',
    ],
    goals: fromReceiver(FIRST_SPAN, (h) => h.root, {}),
    stuck: 'every ✗ above says which JSON field and what to put there',
    done: FIRST_SPAN.done.join(' '),
  },
  {
    title: 'Make it a tree',
    story: ['The order failed inside the payment. Show it: the payment is a child of the checkout, in the same trace.'],
    steps: [
      'tools/span.json — add a second span to "spans" (mind the comma between the two)',
      "tools/print-spans.mjs — uncomment the indent ▶ line, so a tree looks like a tree",
      'send it with curl',
    ],
    goals: [
      ...fromReceiver(TREE, (h) => h.child, { got: 'no second span yet', hint: 'add a second span to "spans" in tools/span.json, then send it' }),
      { ...uncomment('tools/print-spans.mjs', 'indent'), ok: () => active('tools/print-spans.mjs', /indent = span\.parentSpanId/) },
    ],
    stuck: 'the hints above carry the real traceId and spanId of your first span — copy them',
    done: TREE.done.join(' '),
  },
  {
    title: 'The APM agent, by hand',
    story: [
      'Typing JSON does not scale. The APM agent is a library inside the app that writes those spans for you —',
      'for every request, on the server and in the browser — and sends them to your receiver.',
    ],
    steps: [
      'npm install next-observe',
      'uncomment the ▶ lines in instrumentation.ts, instrumentation-client.ts and next.config.ts',
      'restart npm run dev (Ctrl+C, then again)',
      'in the shop: product 1 → ♡ Save for later; then Quantity 20 → Buy',
      'tools/print-spans.mjs — uncomment the noise-filter ▶ line: Next.js sends a dozen spans per page',
    ],
    goals: [
      {
        what: 'next-observe installed',
        ok: () => Boolean(app.dependencies?.['next-observe']) && existsSync(new URL('node_modules/next-observe/package.json', root)),
        hint: 'npm install next-observe',
      },
      { what: 'server half', ok: () => active('instrumentation.ts', /export \{ register \} from 'next-observe\/server'/), hint: 'instrumentation.ts — uncomment the ▶ line' },
      { what: 'browser half', ok: () => active('instrumentation-client.ts', /import 'next-observe\/client'/), hint: 'instrumentation-client.ts — uncomment the ▶ line' },
      {
        what: 'browser route',
        ok: () => active('next.config.ts', /import \{ withObserve \}/) && active('next.config.ts', /config = withObserve\(nextConfig\)/),
        hint: 'next.config.ts — uncomment both ▶ lines',
      },
      {
        what: 'server spans arrive',
        outcome: true,
        ok: () => fromShop.length > 0,
        got: () => `${fromShop.length} spans`,
        hint: 'receiver running? then restart npm run dev and open a page of the shop',
      },
      {
        what: 'browser spans arrive',
        outcome: true,
        ok: () => fromBrowser.length > 0,
        got: () => `${fromBrowser.length} spans`,
        hint: 'reload the shop in the browser (the page needs the new instrumentation-client.ts)',
      },
      {
        what: 'the 400 is data',
        outcome: true,
        ok: () => fromShop.some((s) => s.name?.includes('/api/checkout') && Number(s.attributes['http.response.status_code'] ?? s.attributes['http.status_code']) === 400),
        hint: 'in the shop: product 1 → Quantity 20 → Buy',
      },
      { what: 'a browser error is data', outcome: true, ok: () => fromBrowser.some((s) => s.attributes['observe.kind'] === 'browser-error'), hint: 'in the shop: product 1 → ♡ Save for later' },
      { ...uncomment('tools/print-spans.mjs', 'noise-filter'), what: 'terminal readable', ok: () => active('tools/print-spans.mjs', /if \(NOISE\.has\(scope\?\.name\)/) },
    ],
    stuck: 'git stash -u && git checkout -B workshop block-3-instrumentation && npm install',
    done: 'the shop reports itself — the same OTLP you wrote by hand, now automatic. Two bugs from part 1 are data now. But read the 400: it says THAT the order failed, not WHY.',
  },
  {
    title: 'A span of your own',
    story: [
      'The 400 says that the order failed. Sandy-9 asks why — and the automatic spans cannot know: they speak HTTP,',
      'not orders. Your code knows. Put the reason where the telemetry is.',
    ],
    steps: [
      'app/api/checkout/route.ts — uncomment the four ▶ lines',
      'in the shop: product 1 → Quantity 20 → Buy (the dev server picks up the change on save)',
    ],
    goals: [
      { ...uncomment(ROUTE, 'import'), ok: () => active(ROUTE, /import \{ trace \} from '@opentelemetry\/api'/) },
      { ...uncomment(ROUTE, 'startSpan'), ok: () => active(ROUTE, /span = trace\.getTracer\('porto-shop'\)\.startSpan\('placeOrder'\)/) },
      { ...uncomment(ROUTE, 'order.quantity'), ok: () => active(ROUTE, /span\.setAttribute\('order\.quantity'/) },
      { ...uncomment(ROUTE, 'order.rejected'), ok: () => active(ROUTE, /span\.setAttribute\('order\.rejected'/) },
      { what: 'placeOrder arrives', outcome: true, ok: () => placeOrders.length > 0, got: () => `${placeOrders.length} spans`, hint: 'in the shop: buy anything' },
      {
        what: 'the reason arrives',
        outcome: true,
        ok: () => placeOrders.some((s) => s.attributes['order.rejected']),
        got: () => String(placeOrders.find((s) => s.attributes['order.rejected'])?.attributes['order.rejected'] ?? ''),
        hint: 'in the shop: product 1 → Quantity 20 → Buy',
      },
    ],
    stuck: 'git stash -u && git checkout -B workshop block-3-instrumentation && npm install',
    done: 'the 400 says why now — a reason no automatic instrumentation could know.',
  },
  {
    title: "'use observe'",
    story: [
      'A span of your own took a tracer, a try and a finally. For plain functions there is a shorter way:',
      'one line at the top of a file, and every function it exports becomes a span — with the file it lives in.',
    ],
    steps: [
      "uncomment the 'use observe' ▶ line at the top of lib/payment.ts, lib/db.ts, lib/catalog.ts, lib/inventory.ts",
      'in the shop: open the home page, open a product, buy something',
    ],
    goals: [
      ...['lib/payment.ts', 'lib/db.ts', 'lib/catalog.ts', 'lib/inventory.ts'].map((file) => ({
        what: file,
        ok: () => active(file, /^'use observe'/),
        hint: `${file} — uncomment the 'use observe' ▶ line at the top`,
      })),
      {
        what: 'function spans arrive',
        outcome: true,
        ok: () => functionSpans.length > 0,
        got: () => `${new Set(functionSpans.map((s) => s.name)).size} functions`,
        hint: 'in the shop: open the home page and a product',
      },
      {
        what: 'chargePayment arrives',
        outcome: true,
        ok: () => functionSpans.some((s) => s.name === 'chargePayment'),
        hint: 'in the shop: buy one of anything (Quantity 1)',
      },
    ],
    stuck: 'git stash -u && git checkout -B workshop block-3-instrumentation && npm install',
    done: 'every function in lib/ is a span now, with its file — when something is slow, the trace points at the code.',
  },
  {
    title: 'One case by hand',
    story: [
      'You have the raw spans. Answer the question a script can answer: which orders were refused — and why?',
      'This is what an observability backend does all day: filter, group by trace, read the attributes.',
    ],
    steps: [
      'tools/cases/rejected.mjs — uncomment the three ▶ lines one by one',
      'after each: npm run case checkout-400 — watch the search narrow down',
    ],
    goals: [
      { ...uncomment('tools/cases/rejected.mjs', 'kind'), ok: () => active('tools/cases/rejected.mjs', /checks\.push\(span\.kind === 2\)/) },
      { ...uncomment('tools/cases/rejected.mjs', 'route'), ok: () => active('tools/cases/rejected.mjs', /checks\.push\(span\.attributes\['http\.route'\]/) },
      { ...uncomment('tools/cases/rejected.mjs', 'status'), ok: () => active('tools/cases/rejected.mjs', /checks\.push\(span\.attributes\['http\.status_code'\]/) },
      {
        what: 'rejected orders found',
        outcome: true,
        ok: () => !rejectedBroken && rejected.length > 0 && rejected.every((s) => s.name?.includes('/api/checkout')),
        got: () => (rejectedBroken ? 'file broken' : `${rejected.length} spans`),
        hint: rejectedBroken ? `tools/cases/rejected.mjs does not load: ${rejectedBroken}` : 'in the shop: product 1 → Quantity 20 → Buy, then npm run case checkout-400',
      },
      {
        what: 'with the reason',
        outcome: true,
        ok: () => withReason.length > 0,
        got: () => `${withReason.length} of ${rejected.length}`,
        hint: 'buy 20 again after mission 5 — older orders were refused before your placeOrder existed',
      },
    ],
    stuck: 'npm run case checkout-400 -- --solution shows the answer — then make your three lines match it',
    done: 'you did by script what an observability backend does: filter, group by trace, read the reason. Five more cases in tools/cases/.',
  },
  {
    title: 'Good evening, Kevin',
    story: [
      'A script answers one question, once — and at 3 am nobody runs it. What you need is a program that takes the',
      'telemetry all the time, keeps it, shows it and watches it: an observer. Ours is next-observer. It is not part',
      'of the shop: it runs next to it, on the port your receiver used, 4318 — so the shop does not change a line.',
    ],
    steps: [
      'stop your receiver: Ctrl+C in its terminal — the port has to be free',
      'start the observer in that terminal: npm run observer (the first start downloads it, give it a minute)',
      'wait for its banner: "next-observer  ui  http://127.0.0.1:4318"',
      'open http://127.0.0.1:4318 in the browser — the observer, still empty',
      'in the shop: reload a page; product 1 → Quantity 20 → Buy',
      'back in the observer: Traces → your placeOrder → find order.rejected in its attributes',
    ],
    goals: [
      {
        what: 'observer on 4318',
        outcome: true,
        ok: () => observerUp,
        got: () => (observerUp ? `${health.spans} spans` : receiverUp ? 'your receiver' : 'nothing'),
        hint: receiverUp ? 'Ctrl+C your receiver, then npm run observer' : 'npm run observer',
      },
      { what: 'the shop arrives', outcome: true, ok: () => inObserver(app.name), hint: 'keep npm run dev running and open a page of the shop' },
      { what: 'the browser arrives', outcome: true, ok: () => inObserver(`${app.name}-browser`), hint: 'reload the shop in the browser' },
      {
        what: 'your placeOrder',
        outcome: true,
        ok: () => placeOrderTraces.length > 0,
        got: () => `${placeOrderTraces.length} traces`,
        hint: 'in the shop: buy anything — what your receiver kept is not in the observer',
      },
      {
        what: 'with the reason',
        outcome: true,
        ok: () => Boolean(reasonInObserver),
        got: () => String(reasonInObserver?.attributes?.['order.rejected'] ?? ''),
        hint: 'in the shop: product 1 → Quantity 20 → Buy',
      },
    ],
    stuck: '"port 4318 is taken"? your receiver still runs — Ctrl+C it. Nothing arrives? npm run dev must be running too',
    done: 'the same OTLP, a different receiver — the shop did not change one line. Now look around: Traces, Errors, Overview.',
  },
]

// ── Which mission, and the printout ────────────────────────────────────────────────────────────────────────────────
// A mission is complete when what it is for has arrived (the outcome goals). The "uncomment" items are the way there —
// someone who caught up with --solution or a tag has the result without having uncommented your copy of the lines.
const results = MISSIONS.map((m) => m.goals.map((g) => ({ ...g, done: g.ok() })))
const complete = results.map((r) => r.filter((g) => g.outcome).every((g) => g.done) && r.some((g) => g.outcome))
const asked = Number(process.argv[2])
if (process.argv[2] && !(Number.isInteger(asked) && asked >= 1 && asked <= MISSIONS.length)) {
  console.log(`usage: npm run mission <1–${MISSIONS.length}>`)
  process.exit(1)
}
const n = asked || complete.indexOf(false) + 1 || MISSIONS.length
const mission = MISSIONS[n - 1]
const goals = results[n - 1]

console.log(MISSIONS.map((m, i) => (complete[i] ? paint(33, `★${i + 1}`) : i + 1 === n ? paint(1, `[${i + 1}]`) : paint(2, `${i + 1}`))).join(' '))
console.log(paint(36, `══ Mission ${n} of ${MISSIONS.length} · ${mission.title} ${'═'.repeat(Math.max(4, 60 - mission.title.length))}`))
for (const line of mission.story) console.log(line)
console.log(`\n${paint(1, 'Your task')}`)
mission.steps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`))
console.log(`  ${mission.steps.length + 1}. npm run mission ${n} again`)
if (complete[n - 1]) {
  console.log(`\n${paint(33, `★ Mission ${n} complete — ${mission.done}`)}`)
  if (n < MISSIONS.length) console.log(paint(2, `  next: npm run mission ${n + 1}`))
} else {
  console.log(`\n${paint(1, 'Check')}  ${goals.filter((g) => g.done).length}/${goals.length}`)
  for (const g of goals) {
    const mark = g.done ? paint(32, '✓') : paint(31, '✗')
    console.log(`  ${mark} ${g.what.padEnd(24)} ${(g.got?.() ?? '').padEnd(16)} ${g.done ? '' : paint(2, `← ${g.hint}`)}`)
  }
  console.log(`\n${paint(2, `Stuck?  ${mission.stuck}`)}`)
}
