import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = { title: 'Porto Shop' }

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>
        <header className="station">
          <div aria-hidden className="planet" />
          <div className="station-bar container">
            <Link href="/" className="station-name">
              ◉ STATION PORTO-7
            </Link>
            <span className="pill">➜ Shipping to colonies</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}
