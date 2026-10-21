// npm run mission <N> — your checklist for mission N: what it is about, what to do, and what is done.
// It reads your project files, what your receiver wrote to .telemetry/spans.ndjson and, from part 3 on, the observer.
// It never changes your code; it keeps your progress and quiz answers in .telemetry/. Without a number it shows the
// first mission that is not done yet.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
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
const versionsOf = (name) => services.find((s) => s.name === name)?.versions ?? []
const [v1At, v2At] = ['v1', 'v2'].map((v) => versionsOf(app.name).indexOf(v))
// Done missions stay done (.telemetry/progress.json): the observer forgets on a restart, and its version comparison
// only looks back so far — neither should send you back to a mission you finished.
const readJson = (file) => {
  try {
    const value = JSON.parse(read(file) || '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}
// Keyed by the mission's title, so a renumbering does not move a star. `npm run mission reset` forgets it all.
const progress = readJson('.telemetry/progress.json')
const keep = (file, value) => {
  mkdirSync(new URL('.telemetry/', root), { recursive: true })
  writeFileSync(new URL(file, root), JSON.stringify(value, null, 2))
}
// Part 4: can the observer compare the two deployments? It needs checkouts in both. Asked only until mission 9 is done.
const regression =
  observerUp && !progress['Two deployments'] ? (await ask(`/api/regression?service=${encodeURIComponent(app.name ?? '')}&sinceMinutes=1440`))?.regression : undefined
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

// ── Mission 10: the bugs, as questions you answer from what the observer shows ────────────────────────────────────
// npm run mission 10 <key> <answer>. Accepted answers are kept in .telemetry/answers.json.
const QUIZ = [
  { key: 'click', q: 'product 1, ♡ Save for later does nothing. What does the code call on null?', word: true, accept: ['5d7761697ab69a64'], where: 'Errors → the uncaught error from product 1: read its message' },
  { key: 'details', q: 'product 4, Show details breaks the page. Which component throws?', accept: ['d0aee3867bc22550'], where: 'Errors → the error after Show details: the component is named in it' },
  { key: 'hydration', q: 'every product page: server and browser render different text. Which component?', accept: ['9dee5e384a4ee24b'], where: 'Errors → hydration mismatch: the message names the component' },
  { key: 'reviews', q: 'product 2, reviews never load. What status does the reviews API answer?', word: true, accept: ['64acdb610ebf7b08'], where: 'Errors → the reviews error: the status is in its message' },
  { key: 'checkout', q: 'Buy ×20 fails. Up to how many items does the shop allow?', word: true, accept: ['e66b4cb627b57e3d'], where: 'Traces → placeOrder of a refused order: order.rejected (your span from mission 5)' },
  { key: 'search', q: 'typing in the search box: which request repeats over and over?', accept: ['e5b22981c3a23e7e'], where: 'Overview → the request with by far the most calls' },
  { key: 'home', q: 'the home page: which function runs once per product, one after another?', accept: ['e58eb6cb984578e6'], where: 'Traces → GET / → the waterfall: the same name many times in a row' },
  {
    key: 'deploy',
    q: 'v2 made one request much slower. Which function inside it takes the extra time?',
    accept: ['804572d688110ac7'],
    where:
      'Overview (1h) → Slowest: the request at the top → Traces: type its name, Min ms 1000 → open one → the waterfall: the longest bar inside it (the card "v2 looks like a regression", bottom right, names the request too)',
  },
  { key: 'stock', q: 'which operation fails about one time in three?', accept: ['0ca58540cd484b20', '964a3186fe078beb', '69c56a883cf5ecb8'], where: 'Overview → the busiest requests and their error rate, or Errors → the server-side error with the most hits' },
]
const answers = readJson('.telemetry/answers.json')
// The answers are kept as hashes, so they are not there to read at a glance — find them in the observer.
const hash = (text) => createHash('sha256').update(`porto-7:${text}`).digest('hex').slice(0, 16)
const norm = (text) => String(text).toLowerCase().replace(/[^a-z0-9]/g, '')
/**
 * A name is compared whole, ignoring case, punctuation, an HTTP method in front and a word like "component" after it
 * ("GET /api/products", "<Viewers>", "getProductById()"). A short answer (a number, push) may be one word of a longer
 * one ("HTTP 204", "reading 'push'").
 */
const correct = (item, answer) => {
  const text = String(answer).trim().replace(/^(get|post|put|patch|delete)\s+/i, '').replace(/\s+(component|function|operation|span|request)$/i, '')
  // A word of a short answer counts, but not a list of guesses: three words at most.
  const words = String(answer).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  const tried = [norm(text), ...(item.word && words.length <= 3 ? words : [])]
  return tried.some((t) => t && item.accept.includes(hash(t)))
}

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
    // The first steps depend on what holds port 4318 right now.
    steps: [
      ...(receiverUp && !observerUp
        ? ['the receiver you built in mission 1 (npm run receiver) is still running and holds port 4318 — stop it: Ctrl+C in its terminal']
        : []),
      ...(observerUp
        ? ['✓ the observer is running on 4318 — open http://127.0.0.1:4318 in the browser']
        : [
            'start the observer in a free terminal: npm run observer (the first start downloads it, give it a minute)',
            'wait for its banner: "next-observer  ui  http://127.0.0.1:4318"',
            'open http://127.0.0.1:4318 in the browser — the observer, still empty',
          ]),
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
  {
    title: 'Two deployments',
    story: [
      'Real shops change. Today Porto-7 ships two builds of the shop, v1 and then v2, with customers on both — and',
      'every span carries its version (service.version), so the observer can tell one deployment from the next.',
    ],
    steps: [
      'stop npm run dev (Ctrl+C) and start the first build instead: npm run dev:v1',
      'in a third terminal: npm run users 60 — customers in a real browser — then npm run load 40 — server traffic',
      'deploy the next build: Ctrl+C npm run dev:v1, then npm run dev:v2',
      'the same customers again: npm run users 60, then npm run load 40',
    ],
    goals: [
      { what: 'observer on 4318', outcome: true, ok: () => observerUp, hint: 'npm run observer (mission 8)' },
      {
        what: 'v1 deployed',
        outcome: true,
        ok: () => versionsOf(app.name).includes('v1'),
        got: () => versionsOf(app.name).join(' → '),
        hint: 'Ctrl+C npm run dev, then npm run dev:v1',
      },
      { what: 'customers on v1', outcome: true, ok: () => versionsOf(`${app.name}-browser`).includes('v1'), hint: 'while v1 runs: npm run users 60' },
      {
        what: 'v2 deployed after v1',
        outcome: true,
        ok: () => v1At >= 0 && v2At > v1At,
        // The observer orders versions by when it first saw them: v2 seen first can only be fixed by starting over.
        hint: v2At >= 0 && v2At < v1At ? 'the observer saw v2 before v1 — restart it (Ctrl+C, npm run observer), then dev:v1, then dev:v2' : 'Ctrl+C npm run dev:v1, then npm run dev:v2',
      },
      { what: 'customers on v2', outcome: true, ok: () => versionsOf(`${app.name}-browser`).includes('v2'), hint: 'while v2 runs: npm run users 60' },
      {
        what: 'enough to compare',
        outcome: true,
        ok: () => Boolean(regression),
        hint: 'npm run load 40 on v1 and again on v2 — comparing needs checkouts in both versions',
      },
    ],
    stuck: "the shop is not answering? use the port npm run dev:v1 printed: BASE_URL=http://localhost:<port> npm run users 60 (and the same for npm run load)",
    done: 'two deployments on record, with customers on both — like a real release. Now: what broke between them?',
  },
  {
    title: 'Find the bugs',
    quiz: true,
    story: [
      "v2 is out. Sandy-9 complains, Kevin's dashboard is green, and Lord Manager wants names. Nine things are wrong:",
      'six you met as a customer in part 1, three that only the telemetry shows. Find each one in the observer —',
      'no DevTools, no code — and name it.',
    ],
    steps: [
      'open the observer: Errors, Overview, Traces (click one for its waterfall), and the card in the bottom right corner',
      'the observer shows the last 15 minutes by default — pick 1h at the top of Errors and Overview, or nothing older shows',
      'answer a question: npm run mission 10 <key> — e.g. npm run mission 10 home — it asks for the answer',
      'a wrong answer tells you where to look — not the answer',
    ],
    // Checked when the list is printed — after an answer given in this same run has been kept.
    goals: QUIZ.map((item) => {
      const right = () => correct(item, answers[item.key] ?? '')
      return { what: item.key, outcome: true, ok: right, got: () => (right() ? String(answers[item.key]) : ''), hint: item.q }
    }),
    stuck: 'too little in Errors? pick 1h at the top; still nothing — npm run users 60 again, the customers make the browser bugs happen',
    done: 'nine bugs named from the telemetry alone. How many did you notice by hand in part 1?',
  },
]

// ── An answer for mission 10: npm run mission 10 <key> <answer> ─────────────────────────────────────────────────────
const QUIZ_N = MISSIONS.findIndex((m) => m.quiz) + 1
if (process.argv[2] === 'reset') {
  keep('.telemetry/progress.json', {})
  keep('.telemetry/answers.json', {})
  console.log('progress and quiz answers forgotten — every mission is checked from scratch again')
  process.exit(0)
}
if (process.argv[2] === String(QUIZ_N) && process.argv[3]) {
  const item = QUIZ.find((q) => q.key === process.argv[3].toLowerCase())
  let answer = process.argv.slice(4).join(' ')
  // Only the key given: ask for the answer here — no quotes needed for <Details> or getProductById().
  if (item && !answer && process.stdin.isTTY) {
    const prompt = createInterface({ input: process.stdin, output: process.stdout })
    try {
      answer = (await prompt.question(`${paint(1, item.key)} — ${item.q}\n${paint(2, `where to look: ${item.where}`)}\n> `)).trim()
    } catch {
      console.log() // Ctrl+D or Ctrl+C: no answer
    } finally {
      prompt.close()
    }
  }
  if (!item) console.log(paint(31, `no question "${process.argv[3]}" — the keys: ${QUIZ.map((q) => q.key).join(', ')}`))
  else if (!answer) console.log(paint(31, `the answer is missing — type it after the key, in quotes: npm run mission ${QUIZ_N} ${item.key} "<answer>"`))
  else if (correct(item, answer)) {
    answers[item.key] = answer
    keep('.telemetry/answers.json', answers)
    console.log(paint(32, `✓ ${item.key}: ${answer} — right`))
  } else console.log(paint(31, `✗ ${item.key}: "${answer}" — not quite. Look at: ${item.where}${process.argv[4] ? '  (on the command line, put the answer in quotes)' : ''}`))
  console.log()
}

// ── Which mission, and the printout ────────────────────────────────────────────────────────────────────────────────
// A mission is complete when what it is for has arrived (the outcome goals). The "uncomment" items are the way there —
// someone who caught up with --solution or a tag has the result without having uncommented your copy of the lines.
const results = MISSIONS.map((m) => m.goals.map((g) => ({ ...g, done: g.ok() })))
const live = results.map((r) => r.filter((g) => g.outcome).every((g) => g.done) && r.some((g) => g.outcome))
const complete = live.map((done, i) => done || progress[MISSIONS[i].title] === true)
if (live.some((done, i) => done && !progress[MISSIONS[i].title])) keep('.telemetry/progress.json', { ...progress, ...Object.fromEntries(live.flatMap((done, i) => (done ? [[MISSIONS[i].title, true]] : []))) })
const asked = Number(process.argv[2])
if (process.argv[2] && !(Number.isInteger(asked) && asked >= 1 && asked <= MISSIONS.length)) {
  console.log(`usage: npm run mission <1–${MISSIONS.length}>   ·   npm run mission reset — start the checks over`)
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
