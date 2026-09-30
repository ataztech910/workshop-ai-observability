import type { NextRequest } from 'next/server'
import { getProductById } from '@/lib/db'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/products/[id]'>) {
  const product = await getProductById((await ctx.params).id)
  return product ? Response.json(product) : Response.json({ error: 'not found' }, { status: 404 })
}
