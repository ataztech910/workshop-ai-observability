import { getProductById } from '@/lib/db'
import { chargePayment } from '@/lib/payment'

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { productId?: unknown; quantity?: unknown } | null
  const quantity = body?.quantity ?? 1
  if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 10) {
    return Response.json({ error: 'quantity must be an integer from 1 to 10' }, { status: 400 })
  }
  const product = typeof body?.productId === 'string' ? await getProductById(body.productId) : undefined
  if (!product) return Response.json({ error: 'unknown product' }, { status: 400 })
  const payment = await chargePayment(product.priceCents * (quantity as number))
  return Response.json({ ok: true, ...payment })
}
