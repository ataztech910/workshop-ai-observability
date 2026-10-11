// `npm run load [seconds]` — steady traffic through the shop so the collector, detector and agents have data.
// BASE_URL (default http://localhost:3000), RPS (default 3).
const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const RPS = Number(process.env.RPS ?? 3)
const seconds = Number(process.argv[2] ?? 60)

const requests = [
  () => fetch(`${BASE}/`),
  () => fetch(`${BASE}/api/products`),
  () => fetch(`${BASE}/api/inventory/${1 + Math.floor(Math.random() * 5)}`),
  () => fetch(`${BASE}/api/inventory/${1 + Math.floor(Math.random() * 5)}`),
  // Single products, so that different queries overlap — what a busy shop does all the time.
  () => fetch(`${BASE}/api/products/${1 + Math.floor(Math.random() * 5)}`),
  () => fetch(`${BASE}/api/products/${1 + Math.floor(Math.random() * 5)}`),
  () => fetch(`${BASE}/api/checkout`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId: String(1 + Math.floor(Math.random() * 5)) }) }),
]

// Next picks another port when 3000 is busy — make sure it is the shop answering, not some other app.
const probe = await fetch(`${BASE}/api/products`).then(async (r) => (r.ok ? r.json() : null), () => null)
if (!Array.isArray(probe)) {
  console.error(`The shop is not answering at ${BASE}. Check the port \`npm run dev\` printed and run:  BASE_URL=http://localhost:<port> npm run load`)
  process.exit(1)
}

const stats = { sent: 0, ok: 0, failed: 0 }
const until = Date.now() + seconds * 1000
let i = 0
console.log(`[load] ${RPS} req/s for ${seconds}s against ${BASE}`)
while (Date.now() < until) {
  const batch = Array.from({ length: RPS }, () => requests[i++ % requests.length]())
  const results = await Promise.allSettled(batch)
  for (const r of results) {
    stats.sent++
    if (r.status === 'fulfilled' && r.value.ok) stats.ok++
    else stats.failed++
  }
  await new Promise((r) => setTimeout(r, 1000))
}
console.log(`[load] done: ${stats.sent} requests, ${stats.ok} ok, ${stats.failed} failed`)
