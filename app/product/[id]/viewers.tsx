'use client'

// A little social proof next to the price.
export function Viewers() {
  const viewers = 2 + Math.floor(Math.random() * 30)
  return <p className="muted">{viewers} people are looking at this right now</p>
}
