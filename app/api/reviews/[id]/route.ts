import type { NextRequest } from 'next/server'
import { REVIEWS } from '@/data/reviews'
import { jitter } from '@/lib/sleep'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/reviews/[id]'>) {
  await jitter(15, 21)
  const reviews = REVIEWS[(await ctx.params).id] ?? []
  // Nothing to send — say so with the status.
  if (reviews.length === 0) return new Response(null, { status: 204 })
  return Response.json(reviews)
}
