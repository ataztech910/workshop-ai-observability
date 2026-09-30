'use observe'

import { jitter } from './sleep'

// BUG 3 — the upstream inventory service times out on ~30% of calls, and we pass the failure straight through.
export async function checkInventory(productId: string): Promise<{ productId: string; inStock: number }> {
  await jitter(8, 20)
  if (Math.random() < 0.3) throw new Error('Inventory service timeout: upstream not responding')
  return { productId, inStock: 3 + (Number(productId) % 5) }
}
