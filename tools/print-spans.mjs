// Step 2 of your receiver: print what a batch of OTLP/JSON says — one header per sender, one line per span.
//
// A batch looks like this:
//   { resourceSpans: [ { resource: { attributes: [...] },          ← who sent it: service.name, service.version
//                        scopeSpans: [ { scope: { name },          ← which library made the spans
//                                        spans: [ { traceId, spanId, parentSpanId, name, kind,
//                                                   startTimeUnixNano, endTimeUnixNano,   ← nanoseconds, as strings
//                                                   status: { code },                     ← 2 = error
//                                                   attributes: [ { key, value: { stringValue | intValue | … } } ],
//                                                   events: [ { name, attributes } ] } ] } ] } ] }
//
// Uncomment the lines marked ▶ one by one (Cmd+/ or Ctrl+/ on the line) and send the span again after each:
//   ── 14:02:31 · ? · 1 span ──                         ← before
//     GET /checkout                    0.0 ms  ok
//   ── 14:02:40 · my-first-service v1 · 1 span ──      ← after
//     GET /checkout                  250.0 ms  ok      http.route=/checkout http.status_code=200
// Two ▶ lines wait: the indent is for "Make it a tree", the noise filter for when the shop sends spans (it sends a lot).
// If the terminal floods while you type in the shop's search box, that is not your code — it is one of the shop's
// bugs, and you will meet it again in part 4.
// You do not need to restart the receiver: it reloads when you save this file.

// Ready-made helpers. An OTLP attribute is { key, value: { stringValue | intValue | doubleValue | boolValue } }: the
// value says its own type, because the same format has to carry data from every language.
const value = (v = {}) => v.stringValue ?? v.intValue ?? v.doubleValue ?? v.boolValue
const attr = (attributes = [], key) => value(attributes.find((a) => a.key === key)?.value)
// Next.js and the browser's page loader send many spans of their own on every request — not what we look for.
const NOISE = new Set(['next.js', '@opentelemetry/instrumentation-document-load'])
// Colours in a terminal, plain text anywhere else.
const paint = (code, text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text)
// One span, one line: long attribute lists are cut to the terminal's width.
const clip = (text, width) => (text.length > width ? `${text.slice(0, Math.max(0, width - 1))}…` : text)

export function printSpans(batch) {
  for (const { resource, scopeSpans = [] } of batch.resourceSpans ?? []) {
    const about = resource?.attributes
    let who = '?'
    // who = `${attr(about, 'service.name')} ${attr(about, 'service.version') ?? ''}` // ▶
    //   Why: the span itself does not say who sent it — the resource does, once for the whole batch. service.name is
    //   how every backend groups telemetry by app; service.version is how it tells one deployment from the next.

    const lines = []
    let hidden = 0
    for (const { scope, spans = [] } of scopeSpans) {
      for (const span of spans) {
        let ms = 0
        // ms = Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)) / 1e6 // ▶
        //   Why: a span has a start and an end, not a duration. The times are nanoseconds since 1970 — a number too
        //   big for a JS number to keep exactly, so OTLP/JSON sends it as a string; BigInt does the subtraction.

        let error = false
        // error = span.status?.code === 2 // ▶
        //   Why: status is how a span says it failed: 0 unset, 1 ok, 2 error. An HTTP 500 or a thrown exception
        //   ends up here — this is what an "error rate" is counted from.

        let details = ''
        // details = (span.attributes ?? []).filter((a) => !a.key.startsWith('next.')).map((a) => `${a.key}=${value(a.value)}`).join(' ') // ▶
        //   Why: attributes are where a span says WHY — the route, the status code, the quantity, the reason an order
        //   was refused. Name, time and status tell you that something failed; attributes tell you what to fix.
        //   (next.* are Next.js's notes about itself — skipped.)

        // if (NOISE.has(scope?.name) && span.kind !== 2 && !error) { hidden++; continue } // ▶ later, when the shop sends spans
        //   Why: scope.name says which library made the span. Next.js alone makes a dozen per page; keep only
        //   requests (kind 2 = SERVER) and errors, or the few spans you care about drown.

        let indent = ''
        // indent = span.parentSpanId ? '  └ ' : '' // ▶ for "Make it a tree"
        //   Why: parentSpanId is what turns separate spans into a tree — a trace. No parent = the root, the request.

        const status = error ? paint(31, 'ERROR') : paint(32, 'ok   ')
        const head = `  ${(indent + span.name).padEnd(30)} ${ms.toFixed(1).padStart(8)} ms  `
        lines.push(`${head}${status}  ${paint(2, clip(details, (process.stdout.columns || 160) - head.length - 8))}`)
      }
    }

    const shown = lines.length ? `${lines.length} ${lines.length === 1 ? 'span' : 'spans'}` : 'nothing to show'
    const count = `${shown}${hidden ? `, ${hidden} noise hidden` : ''}`
    console.log(paint(36, `── ${new Date().toLocaleTimeString('en-GB')} · ${who.trim()} · ${count} ──`))
    for (const line of lines) console.log(line)
  }
}
