import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import type { ThemeModePreference } from '@/lib/themeModeContext'
import './globals.css'
import { Providers } from './providers'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'FSH AI Job Coach',
  description: 'AI-powered job search assistant',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('themeMode')?.value
  const initialThemeMode: ThemeModePreference =
    raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'

  return (
    <html lang='en'>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers initialThemeMode={initialThemeMode}>{children}</Providers>
      </body>
    </html>
  )
}
