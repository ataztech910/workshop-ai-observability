import type { NextRequest } from 'next/server'
import { listProducts } from '@/lib/catalog'

// The catalog; `?q=` keeps the products whose name contains it.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase() ?? ''
  const products = await listProducts()
  return Response.json(q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products)
}
