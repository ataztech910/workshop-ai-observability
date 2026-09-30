import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductById } from '@/lib/db'
import { Buy } from './buy'

export default async function ProductPage(props: PageProps<'/product/[id]'>) {
  const { id } = await props.params
  const product = await getProductById(id)
  if (!product) notFound()
  return (
    <main>
      <Link href="/">← Catalog</Link>
      <h1>{product.name}</h1>
      <p>€{(product.priceCents / 100).toFixed(2)}</p>
      <Buy productId={product.id} />
    </main>
  )
}
