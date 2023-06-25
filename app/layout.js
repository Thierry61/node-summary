import './globals.css'
import Header from './header'

export const metadata = {
  title: 'Bitcoin node summary',
  description: 'Display summary information by accessing the Bitcoin node RPC API'
}

export default async function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
      </head>
      <body>
        <Header/>
        {children}
      </body>
    </html>
  )
}
