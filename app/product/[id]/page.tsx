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
    <main>
      <Link href="/">← Catalog</Link>
      <h1>{product.name}</h1>
      <p>€{(product.priceCents / 100).toFixed(2)}</p>
      <Viewers />
      <Buy productId={product.id} />
      <div className="actions">
        <Wishlist productId={product.id} /> <Details productId={product.id} />
      </div>
      <h2>Reviews</h2>
      <Reviews productId={product.id} />
    </main>
  )
}
