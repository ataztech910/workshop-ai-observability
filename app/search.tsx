'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Product } from '@/data/products'

// Search as you type, through /api/products?q=.
export function Search() {
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Product[]>([])
  const filter = { q: query.trim() }
  let changesWhen: unknown = filter
  // Mission 11 · the fix: uncomment the ▶ line (Cmd+/).
  // changesWhen = filter.q // ▶
  //   Why: React runs the effect again whenever its dependency changes. `filter` is a new object on every render, so:
  //   the effect fetches, the result renders, a new object, the effect fetches again — the request loop. Depend on
  //   the text itself: it changes only when you type.

  useEffect(() => {
    if (!filter.q) return
    fetch(`/api/products?q=${encodeURIComponent(filter.q)}`)
      .then((res) => res.json())
      .then(setFound)
  }, [changesWhen])

  return (
    <div className="search">
      <input type="search" className="field" placeholder="Search the shop" value={query} onChange={(e) => setQuery(e.target.value)} />
      {filter.q && found.length > 0 && (
        <ul className="search-results panel">
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
