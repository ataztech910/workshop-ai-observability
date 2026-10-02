'use observe'

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
