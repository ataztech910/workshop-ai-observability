// Block 4: what must stay true about the shop. next-observer reads this file on start and asks the app on a timer;
// a check that fails twice in a row goes to the AI agents. Plain data — nothing to import.
type Check = {
  name: string
  url: string
  method?: string
  body?: unknown
  everySeconds?: number
  expect?: { status?: number | number[]; maxMs?: number; bodyIncludes?: string }
}

const checks: Check[] = [
  { name: 'home page shows the shop', url: '/', everySeconds: 10, expect: { bodyIncludes: 'Porto Shop' } },
  { name: 'catalog answers', url: '/api/products', everySeconds: 10, expect: { status: 200, maxMs: 1000 } },
  // The deployment that makes checkout slow is caught here even when nobody is buying.
  { name: 'checkout takes under a second', url: '/api/checkout', method: 'POST', body: { productId: '1' }, everySeconds: 10, expect: { status: 200, maxMs: 1000 } },
  // An invariant: what the API must refuse. It fails the day somebody loosens the validation.
  { name: 'checkout refuses 99 items', url: '/api/checkout', method: 'POST', body: { productId: '1', quantity: 99 }, everySeconds: 10, expect: { status: 400 } },
  { name: 'stock is known', url: '/api/inventory/1', everySeconds: 10 },
]

export default checks
