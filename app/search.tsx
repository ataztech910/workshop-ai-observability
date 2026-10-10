'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Product } from '@/data/products'

// Search as you type, through /api/products?q=.
export function Search() {
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Product[]>([])
  const filter = { q: query.trim() }

  useEffect(() => {
    if (!filter.q) return
    fetch(`/api/products?q=${encodeURIComponent(filter.q)}`)
      .then((res) => res.json())
      .then(setFound)
  }, [filter])

  return (
    <div className="search">
      <input type="search" placeholder="Search the shop" value={query} onChange={(e) => setQuery(e.target.value)} />
      {filter.q && (
        <ul className="products">
          {found.map((p) => (
            <li key={p.id}>
              <Link href={`/product/${p.id}`}>{p.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
