import Link from 'next/link'
import { listProducts } from '@/lib/catalog'
import { Search } from './search'

// Rendered per request, so every visit loads the catalog.
export const dynamic = 'force-dynamic'

const price = (cents: number) => `€${(cents / 100).toFixed(2)}`

export default async function CatalogPage() {
  const products = await listProducts()
  return (
    <main>
      <h1>Porto Shop</h1>
      <Search />
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
