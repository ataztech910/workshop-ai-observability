// Mission 6 · 'use observe': uncomment the ▶ line (Cmd+/), then npm run mission 6.
// 'use observe' // ▶
//   Why: the stock check becomes a span — and when it throws, the span carries the exception.

import { jitter } from './sleep'

// Asks the (simulated) inventory service how many items are in stock.
export async function checkInventory(productId: string): Promise<{ productId: string; inStock: number }> {
  await jitter(8, 20)
  if (Math.random() < 0.3) throw new Error('Inventory service timeout: upstream not responding')
  return { productId, inStock: 3 + (Number(productId) % 5) }
}
