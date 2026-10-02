import type { NextRequest } from 'next/server'
import { checkInventory } from '@/lib/inventory'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/inventory/[id]'>) {
  return Response.json(await checkInventory((await ctx.params).id))
}
