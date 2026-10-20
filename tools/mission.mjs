// The game for "Your first span": the receiver calls this for every batch. It looks only at spans you send by hand
// (scope "by-hand", the one in tools/span.json) and prints how far you are from the mission — the shop's own spans
// are ignored. Nothing to change here.
//
// Mission: Colony Sandy-9 cannot place an order, and Kevin's dashboard is all green. Be the APM agent: edit
// tools/span.json until your receiver reports the failed order.

const value = (v = {}) => v.stringValue ?? v.intValue ?? v.doubleValue ?? v.boolValue
const attr = (attributes = [], key) => value(attributes.find((a) => a.key === key)?.value)
const paint = (code, text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text)

/** What the span must say, and where in the JSON it goes when it does not. */
const GOALS = [
  { what: 'name', ok: (s) => s.name === 'POST /checkout', got: (s) => s.name, hint: '"name": "POST /checkout"' },
  {
    what: 'duration',
    ok: (s) => ms(s) >= 1000,
    got: (s) => `${ms(s).toFixed(1)} ms`,
    hint: 'a full second: endTimeUnixNano − startTimeUnixNano ≥ 1 000 000 000',
  },
  { what: 'status', ok: (s) => s.status?.code === 2, got: (s) => `code ${s.status?.code ?? 'none'}`, hint: 'a failure is "status": { "code": 2 }' },
  {
    what: 'order.quantity',
    ok: (s) => Number(attr(s.attributes, 'order.quantity')) === 20,
    got: (s) => String(attr(s.attributes, 'order.quantity') ?? 'missing'),
    hint: 'an attribute { "key": "order.quantity", "value": { "intValue": 20 } }',
  },
  {
    what: 'order.rejected',
    ok: (s) => String(attr(s.attributes, 'order.rejected') ?? '').length > 0,
    got: (s) => String(attr(s.attributes, 'order.rejected') ?? 'missing'),
    hint: 'the reason, as text: "order.rejected" = "quantity 20 > limit 10"',
  },
]

function ms(span) {
  try {
    return Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)) / 1e6
  } catch {
    return 0 // times missing or not numbers — the hint says what goes there
  }
}

export function checkMission(batch) {
  const spans = (batch.resourceSpans ?? []).flatMap((r) => (r.scopeSpans ?? []).filter((s) => s.scope?.name === 'by-hand').flatMap((s) => s.spans ?? []))
  // The root span is the one that reports the order; a child (next task, "Make it a tree") does not have to.
  const span = spans.find((s) => !s.parentSpanId) ?? spans[0]
  if (!span) return

  const results = GOALS.map((g) => ({ ...g, done: g.ok(span) }))
  const done = results.filter((r) => r.done).length
  if (done === GOALS.length) {
    console.log(paint(33, `★ Mission complete — Sandy-9's failed order is on record, with the reason.`))
    console.log(paint(33, `  This is all an APM agent does: it fills these fields for you, thousands of times a second.`))
    return
  }
  console.log(paint(33, `mission · report Sandy-9's failed order  ${done}/${GOALS.length}`))
  for (const r of results) {
    const mark = r.done ? paint(32, '✓') : paint(31, '✗')
    console.log(`  ${mark} ${r.what.padEnd(15)} ${String(r.got(span)).padEnd(24)} ${r.done ? '' : paint(2, `← ${r.hint}`)}`)
  }
}
