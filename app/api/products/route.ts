import { listProducts } from '@/lib/catalog'

export async function GET() {
  return Response.json(await listProducts())
}
