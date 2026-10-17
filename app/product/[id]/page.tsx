import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductById } from '@/lib/db'
import { Buy } from './buy'
import { Details } from './details'
import { Reviews } from './reviews'
import { Viewers } from './viewers'
import { Wishlist } from './wishlist'

export default async function ProductPage(props: PageProps<'/product/[id]'>) {
  const { id } = await props.params
  const product = await getProductById(id)
  if (!product) notFound()
  return (
    <main className="product container">
      <img src={`/products/${product.id}.jpg`} alt={product.name} width={816} height={816} className="panel" />
      <div className="product-info">
        <Link href="/" className="back">
          ← Catalog
        </Link>
        <div>
          <h1>{product.name}</h1>
          <p className="price">€{(product.priceCents / 100).toFixed(2)}</p>
          <Viewers />
        </div>
        <Buy productId={product.id} />
        <div className="actions">
          <Wishlist productId={product.id} /> <Details productId={product.id} />
        </div>
        <section>
          <h2>Reviews</h2>
          <Reviews productId={product.id} />
        </section>
      </div>
    </main>
  )
}
