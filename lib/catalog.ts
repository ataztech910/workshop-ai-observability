// Mission 6 · 'use observe': uncomment the ▶ line (Cmd+/), then npm run mission 6.
// 'use observe' // ▶
//   Why: the home page's product list becomes a span, with the queries it makes inside it.

import type { Product } from '@/data/products'
import { getProductById, getProductIds } from './db'

// The product list for the home page.
export async function listProducts(): Promise<Product[]> {
  const ids = await getProductIds()
  const products: Product[] = []
  for (const id of ids) {
    const product = await getProductById(id)
    if (product) products.push(product)
  }
  return products
}
