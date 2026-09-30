import type { NextRequest } from 'next/server'
import { checkInventory } from '@/lib/inventory'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/inventory/[id]'>) {
  // No try/catch on purpose: the error reaches Next, the request fails with 500 and its span is marked as an error.
  return Response.json(await checkInventory((await ctx.params).id))
}
