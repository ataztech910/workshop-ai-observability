import Link from 'next/link'
import { listProducts } from '@/lib/catalog'
import { Search } from './search'

// Rendered per request, so every visit loads the catalog.
export const dynamic = 'force-dynamic'

const price = (cents: number) => `€${(cents / 100).toFixed(2)}`

export default async function CatalogPage() {
  const products = await listProducts()
  return (
    <main className="catalog container">
      <h1>Porto Shop</h1>
      <p className="tagline">Trading post · Station Porto-7</p>
      <Search />
      <ul className="products">
        {products.map((p) => (
          <li key={p.id}>
            {/* The whole card is the link: picture, name and price. */}
            <Link href={`/product/${p.id}`} className="product-card panel">
              <img src={`/products/${p.id}.jpg`} alt="" width={816} height={816} loading="lazy" />
              <div>
                <span className="product-name">{p.name}</span>
                <p className="price">{price(p.priceCents)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
