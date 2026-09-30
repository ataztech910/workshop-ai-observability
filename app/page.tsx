import Link from 'next/link'
import { listProducts } from '@/lib/catalog'

// Rendered per request so every visit runs the catalog query (and its N+1).
export const dynamic = 'force-dynamic'

const price = (cents: number) => `€${(cents / 100).toFixed(2)}`

export default async function CatalogPage() {
  const products = await listProducts()
  return (
    <main>
      <h1>Porto Shop</h1>
      <ul className="products">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/product/${p.id}`}>{p.name}</Link> <span>{price(p.priceCents)}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}
