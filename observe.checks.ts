// Mission 12 · The night patrol: what must stay true about the shop. Uncomment the ▶ lines (Cmd+/).
// The observer reads this file while it runs — no restart — and asks the shop on a timer, like a customer would.
// A check that fails twice in a row becomes an anomaly in the observer. Plain data — nothing to import.
type Check = {
  name: string
  url: string
  method?: string
  body?: unknown
  everySeconds?: number
  expect?: { status?: number | number[]; maxMs?: number; bodyIncludes?: string }
}

const checks: Check[] = [
  // { name: 'home page shows the shop', url: '/', everySeconds: 10, expect: { bodyIncludes: 'Porto Shop' } }, // ▶
  //   Why: the simplest patrol — is the shop up, and is it the shop? A page can answer 200 and still be the wrong page.
  // { name: 'checkout takes under a second', url: '/api/checkout', method: 'POST', body: { productId: '1' }, everySeconds: 10, expect: { status: 200, maxMs: 1000 } }, // ▶
  //   Why: the deployment that makes checkout slow is caught at 3 am — when nobody is buying, so no customer can complain.
  // { name: 'checkout refuses 99 items', url: '/api/checkout', method: 'POST', body: { productId: '1', quantity: 99 }, everySeconds: 10, expect: { status: 400 } }, // ▶
  //   Why: an invariant — what the shop must refuse. It turns red the day somebody loosens the validation.
]

export default checks
