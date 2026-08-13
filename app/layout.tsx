import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Public_Sans } from 'next/font/google'
import './globals.css'
import { THEME_INIT_SCRIPT } from '@/lib/theme-script'

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Relay — Community Accessibility Map',
  description:
    'Relay is a community-driven map of step-free entrances, working elevators, accessible restrooms, curb cuts, and temporary blockers — reported and verified by the people who rely on them.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    {
      media: '(prefers-color-scheme: light)',
      color: '#f7fafb',
    },
    {
      media: '(prefers-color-scheme: dark)',
      color: '#1a2230',
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${publicSans.variable} bg-background`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_INIT_SCRIPT,
          }}
        />
      </head>

      <body>
        {children}

        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}