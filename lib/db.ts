// Mission 6 · 'use observe': uncomment the ▶ line (Cmd+/), then npm run mission 6.
// 'use observe' // ▶
//   Why: every query becomes a span — you will see how many the shop makes, and how long each one takes.

// A fake database: every query costs ~18 ms, like a round trip to a real one.
import { PRODUCTS, type Product } from '@/data/products'
import { jitter } from './sleep'

export async function getProductIds(): Promise<string[]> {
  await jitter(6, 10)
  return PRODUCTS.map((p) => p.id)
}

export async function getProductById(id: string): Promise<Product | undefined> {
  await jitter(15, 21)
  return PRODUCTS.find((p) => p.id === id)
}
