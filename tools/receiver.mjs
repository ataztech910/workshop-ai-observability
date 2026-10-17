// A minimal OTLP/HTTP receiver — the first thing every telemetry backend does. Node built-ins only.
//   npm run receiver                 listens on 127.0.0.1:4318, the standard OTLP/HTTP port: POST /v1/traces, JSON
//   npm run receiver -- --solution   the same with the finished tools/solutions/print-spans.mjs
// Every batch is printed by tools/print-spans.mjs (your part) and appended as one line to .telemetry/spans.ndjson —
// the file the case scripts read in block 4.
// Port 4318 on purpose: the app's APM agent sends there by default, and in block 5 the observer takes the same port
// over — the app does not change. So the receiver and the observer never run at the same time.
import { appendFileSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { gunzipSync } from 'node:zlib'

const PORT = 4318
const DIR = new URL('../.telemetry/', import.meta.url) // in the repo root, wherever you start it from
const FILE = new URL('spans.ndjson', DIR)
const { printSpans } = await import(process.argv.includes('--solution') ? './solutions/print-spans.mjs' : './print-spans.mjs')
mkdirSync(DIR, { recursive: true })

createServer((req, res) => {
  // Like the observer: `npm run dev:v1` / `dev:v2` check that something is listening before they start the shop.
  if (req.method === 'GET' && req.url === '/health') return res.writeHead(200, { 'content-type': 'application/json' }).end('{"status":"ok"}')
  if (req.method !== 'POST' || !req.url?.startsWith('/v1/traces')) return res.writeHead(404).end()
  // OTLP also comes as protobuf (application/x-protobuf); next-observe sends JSON, and JSON is what we can read.
  if (!String(req.headers['content-type']).includes('json')) return res.writeHead(415).end('this receiver reads OTLP/JSON only')
  const chunks = []
  req.on('data', (chunk) => chunks.push(chunk))
  req.on('error', () => res.destroy()) // the sender went away mid-request: nothing to answer
  req.on('end', () => {
    let batch
    try {
      const body = Buffer.concat(chunks)
      batch = JSON.parse((req.headers['content-encoding'] === 'gzip' ? gunzipSync(body) : body).toString('utf8'))
    } catch {
      return res.writeHead(400).end('body is not JSON (or not valid gzip)')
    }
    // Whatever goes wrong below — the disk, your print-spans.mjs — the receiver keeps going. The file comes first:
    // a bug in your printing must not cost you the data for block 4.
    try {
      appendFileSync(FILE, JSON.stringify(batch) + '\n')
      printSpans(batch)
    } catch (error) {
      console.error(error)
    }
    // Success in OTLP is an empty ExportTraceServiceResponse.
    res.writeHead(200, { 'content-type': 'application/json' }).end('{}')
  })
})
  .on('error', (error) => {
    const taken = error.code === 'EADDRINUSE'
    console.error(taken ? `port ${PORT} is taken — stop the observer (or whatever listens there): the app sends to ${PORT}` : error.message)
    process.exit(1)
  })
  .listen(PORT, '127.0.0.1', () => console.log(`receiver  http://127.0.0.1:${PORT}/v1/traces → .telemetry/spans.ndjson`))
