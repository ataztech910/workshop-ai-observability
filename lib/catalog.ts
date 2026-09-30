'use observe'

import type { Product } from '@/data/products'
import { getProductById, getProductIds } from './db'

// BUG 2 — N+1: one query for the ids, then one query per product, one after another.
// No single span is slow; together they are. One query for all products would do.
export async function listProducts(): Promise<Product[]> {
  const ids = await getProductIds()
  const products: Product[] = []
  for (const id of ids) {
    const product = await getProductById(id)
    if (product) products.push(product)
  }
  return products
}
