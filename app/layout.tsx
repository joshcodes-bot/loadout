import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LOADOUT — Training OS',
  description: 'Upload programs, attach set videos, get coach feedback.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
