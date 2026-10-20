// The game for part 2: the receiver calls this for every batch. It looks only at spans you send by hand (scope
// "by-hand", the one in tools/span.json) and prints how far you are from the mission — the shop's own spans are
// ignored. Nothing to change here.
//
// Mission 2 · "Your first span": Colony Sandy-9 cannot place an order, and Kevin's dashboard is all green. Be the
//   app: edit tools/span.json until your receiver reports the failed order.
// Mission 3 · "Make it a tree": the order failed inside the payment. Add a second span to tools/span.json — the
//   payment, as a child of the checkout — until your receiver shows one trace with two levels.

const value = (v = {}) => v.stringValue ?? v.intValue ?? v.doubleValue ?? v.boolValue
const attr = (attributes = [], key) => value(attributes.find((a) => a.key === key)?.value)
const paint = (code, text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text)

function ms(span) {
  try {
    return Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)) / 1e6
  } catch {
    return 0 // times missing or not numbers — the hint says what goes there
  }
}
const nano = (text) => {
  try {
    return BigInt(text)
  } catch {
    return undefined
  }
}

/** Mission 2: what the one span must say, and where in the JSON it goes when it does not. */
export const FIRST_SPAN = {
  number: 2,
  title: "report Sandy-9's failed order",
  done: ["Sandy-9's failed order is on record, with the reason.", 'Soon the shop will fill these fields by itself, thousands of times a second.'],
  goals: [
    { what: 'name', ok: (s) => s.name === 'POST /checkout', got: (s) => s.name, hint: () => '"name": "POST /checkout"' },
    {
      what: 'duration',
      ok: (s) => ms(s) >= 1000,
      got: (s) => `${ms(s).toFixed(1)} ms`,
      hint: () => 'a full second: endTimeUnixNano − startTimeUnixNano ≥ 1 000 000 000',
    },
    { what: 'status', ok: (s) => s.status?.code === 2, got: (s) => `code ${s.status?.code ?? 'none'}`, hint: () => 'a failure is "status": { "code": 2 }' },
    {
      what: 'order.quantity',
      ok: (s) => Number(attr(s.attributes, 'order.quantity')) === 20,
      got: (s) => String(attr(s.attributes, 'order.quantity') ?? 'missing'),
      hint: () => 'an attribute { "key": "order.quantity", "value": { "intValue": 20 } }',
    },
    {
      what: 'order.rejected',
      ok: (s) => String(attr(s.attributes, 'order.rejected') ?? '').length > 0,
      got: (s) => String(attr(s.attributes, 'order.rejected') ?? 'missing'),
      hint: () => 'the reason, as text: { "key": "order.rejected", "value": { "stringValue": "quantity 20 > limit 10" } }',
    },
  ],
}

/** Mission 3: the second span (the child) against the first one (the root). Hints carry the root's real ids. */
export const TREE = {
  number: 3,
  title: 'show where the order failed — make it a tree',
  done: [
    'one trace, two levels: the payment failed inside the checkout.',
    'traceId says "same request", parentSpanId says "inside which span". Between services the traceId travels in the',
    'traceparent header — that is how a trace crosses from the browser to the server and on.',
  ],
  goals: [
    { what: 'name', ok: (c) => c.name === 'chargePayment', got: (c) => c.name ?? 'missing', hint: () => '"name": "chargePayment"' },
    {
      what: 'traceId',
      ok: (c, r) => c.traceId === r.traceId,
      got: (c) => c.traceId ?? 'missing',
      hint: (r) => `the same as the checkout's: "traceId": "${r.traceId}"`,
    },
    {
      what: 'spanId',
      ok: (c, r) => /^[0-9a-f]{16}$/.test(c.spanId ?? '') && c.spanId !== r.spanId,
      got: (c) => c.spanId ?? 'missing',
      hint: () => 'its own: 16 hex characters, not the checkout\'s — e.g. "spanId": "a1b2c3d4e5f60718"',
    },
    {
      what: 'parentSpanId',
      ok: (c, r) => c.parentSpanId === r.spanId,
      got: (c) => c.parentSpanId ?? 'missing',
      hint: (r) => `the checkout's spanId: "parentSpanId": "${r.spanId}"`,
    },
    {
      what: 'status',
      ok: (c) => c.status?.code === 2,
      got: (c) => `code ${c.status?.code ?? 'none'}`,
      hint: () => 'the payment is what failed: "status": { "code": 2 }',
    },
    {
      what: 'inside parent',
      ok: (c, r) => {
        const [cs, ce, rs, re] = [c.startTimeUnixNano, c.endTimeUnixNano, r.startTimeUnixNano, r.endTimeUnixNano].map(nano)
        return [cs, ce, rs, re].every((t) => t !== undefined) && cs >= rs && ce <= re && ce >= cs
      },
      got: (c) => `${ms(c).toFixed(1)} ms`,
      hint: (r) => `a child happens during its parent: start and end between "${r.startTimeUnixNano}" and "${r.endTimeUnixNano}"`,
    },
  ],
}

function report(mission, subject, root) {
  const results = mission.goals.map((g) => ({ ...g, done: g.ok(subject, root) }))
  const done = results.filter((r) => r.done).length
  if (done === results.length) {
    console.log(paint(33, `★ Mission ${mission.number} complete — ${mission.done[0]}`))
    for (const line of mission.done.slice(1)) console.log(paint(33, `  ${line}`))
    return
  }
  console.log(paint(33, `mission ${mission.number} · ${mission.title}  ${done}/${results.length}   (all of it: npm run mission ${mission.number})`))
  for (const r of results) {
    const mark = r.done ? paint(32, '✓') : paint(31, '✗')
    console.log(`  ${mark} ${r.what.padEnd(15)} ${String(r.got(subject, root)).padEnd(24)} ${r.done ? '' : paint(2, `← ${r.hint(root)}`)}`)
  }
}

/** The spans you sent by hand in this batch (scope "by-hand"), and which of them is the root. */
export function handSpans(batch) {
  const spans = (batch.resourceSpans ?? []).flatMap((r) => (r.scopeSpans ?? []).filter((s) => s.scope?.name === 'by-hand').flatMap((s) => s.spans ?? []))
  // The root is the span without a parent; the first one if you have not set parentSpanId on any yet.
  const root = spans.find((s) => !s.parentSpanId) ?? spans[0]
  return { spans, root, child: spans.find((s) => s !== root) }
}

export function checkMission(batch) {
  const { spans, root, child } = handSpans(batch)
  if (spans.length === 0) return
  if (!child) return report(FIRST_SPAN, root, root)
  // Two or more spans: mission 3, on the first span that is not the root.
  report(TREE, child, root)
}
