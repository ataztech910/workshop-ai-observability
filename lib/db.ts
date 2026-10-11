'use observe'

// A fake database: every query costs ~18 ms, like a round trip to a real one.
import { trace } from '@opentelemetry/api'
import { PRODUCTS, type Product } from '@/data/products'
import { queryProduct } from './pool'
import { jitter } from './sleep'

export async function getProductIds(): Promise<string[]> {
  await jitter(6, 10)
  return PRODUCTS.map((p) => p.id)
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const product = await queryProduct(id)
  // Did we get what we asked for? Status and duration cannot tell: a wrong row arrives just as fast, without an error.
  // The verdict goes on the span as an event; the observer raises an anomaly on the first `ok: false`.
  if (product) trace.getActiveSpan()?.addEvent('integrity_check', { ok: product.id === id, expected: id, actual: product.id })
  return product
}
