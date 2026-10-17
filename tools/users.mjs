// `npm run users [seconds]` — customers in a real browser, so the browser bugs happen too (`npm run load` only talks
// to the server). Each customer picks a thing to do — save for later, buy 20, read reviews, open details, search —
// over and over until the time is up. Uses your installed Google Chrome; no browser download.
//   BASE_URL (default http://localhost:3000), USERS (customers at once, default 3), HEADED=1 to watch them.
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const USERS = Number(process.env.USERS ?? 3)
const seconds = Number(process.argv[2] ?? 60)
// The browser APM agent sends its spans in batches every two seconds: stay on a page long enough for them to leave.
const LINGER_MS = 2500

const probe = await fetch(`${BASE}/api/products`).then(async (r) => (r.ok ? r.json() : null), () => null)
if (!Array.isArray(probe)) {
  console.error(`The shop is not answering at ${BASE}. Check the port \`npm run dev\` printed and run:  BASE_URL=http://localhost:<port> npm run users`)
  process.exit(1)
}

// What a customer does. Each one ends on the page it acted on, so its spans get sent.
const scenarios = {
  'save for later': async (page) => {
    await page.goto(`${BASE}/product/1`)
    await page.getByRole('button', { name: /save for later/i }).click()
  },
  'buy 20': async (page) => {
    await page.goto(`${BASE}/product/1`)
    await page.getByLabel('Quantity').selectOption('20')
    await page.getByRole('button', { name: 'Buy' }).click()
  },
  'buy 1': async (page) => {
    await page.goto(`${BASE}/product/${1 + Math.floor(Math.random() * 5)}`)
    await page.getByRole('button', { name: 'Buy' }).click()
  },
  'read reviews': async (page) => {
    await page.goto(`${BASE}/product/2`)
  },
  'open details': async (page) => {
    await page.goto(`${BASE}/product/4`)
    await page.getByRole('button', { name: 'Show details' }).click()
  },
  search: async (page) => {
    await page.goto(`${BASE}/`)
    await page.getByRole('searchbox').pressSequentially('mug', { delay: 120 })
  },
}
const names = Object.keys(scenarios)

let browser
try {
  browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED })
} catch (error) {
  console.error(`Could not start Google Chrome: ${error.message.split('\n')[0]}\nInstall it from https://www.google.com/chrome/ — npm run doctor checks it too.`)
  process.exit(1)
}
const stop = () => browser.close().finally(() => process.exit(0))
process.on('SIGINT', stop)

const done = Object.fromEntries(names.map((n) => [n, 0]))
let failed = 0
const until = Date.now() + seconds * 1000
console.log(`[users] ${USERS} customers for ${seconds}s in Chrome against ${BASE}`)

async function customer() {
  const context = await browser.newContext() // a fresh visitor: empty localStorage, like a first visit
  const page = await context.newPage()
  page.setDefaultTimeout(10_000) // a step that cannot happen gives up, instead of holding the customer for 30 s
  while (Date.now() < until) {
    const name = names[Math.floor(Math.random() * names.length)]
    try {
      await scenarios[name](page)
      done[name]++
    } catch {
      failed++ // a step did not work out (the page broke, as it is meant to, or the shop is restarting); move on
    } finally {
      // Also after a failure: while the shop restarts between "deployments", every step fails at once.
      await new Promise((r) => setTimeout(r, LINGER_MS))
    }
  }
  await context.close()
}

// One customer going away (a closed window with HEADED=1, a crashed tab) does not end the others or lose the counts.
const ended = await Promise.allSettled(Array.from({ length: USERS }, customer))
await browser.close().catch(() => {})
const lost = ended.filter((r) => r.status === 'rejected').length
console.log(`[users] done: ${names.map((n) => `${n} ${done[n]}`).join(', ')}${failed ? `, ${failed} steps failed` : ''}${lost ? `, ${lost} customers left early` : ''}`)
