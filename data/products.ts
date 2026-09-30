export interface Product {
  id: string
  name: string
  priceCents: number
}

export const PRODUCTS: Product[] = [
  { id: '1', name: 'Porto tile mug', priceCents: 1800 },
  { id: '2', name: 'Cork notebook', priceCents: 1200 },
  { id: '3', name: 'Sardine tin (decorative)', priceCents: 900 },
  { id: '4', name: 'Azulejo coaster set', priceCents: 2400 },
  { id: '5', name: 'Port wine glass', priceCents: 1500 },
]
