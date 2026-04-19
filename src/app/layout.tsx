import type { Metadata } from 'next'
import './globals.css'
import { Web3Provider } from '@/components/web3-provider'

export const metadata: Metadata = {
  title: 'TipJar Plus',
  description: 'Sepolia testnet TipJar dApp',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  )
}