import './globals.css'
import Header from './header'

export const metadata = {
  title: 'Bitcoin node summary',
  description: 'Display summary information by accessing the Bitcoin node RPC API'
}

// http-equiv is normally unsupported but refresh seems to work.
// Alternative implementation would be to use a client component with a useEffect
// that periodically refreshes the page, but the problem with this solution
// is that repeat factor in animations doesn't work properly.
export default async function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="refresh" content={`${process.env.REVALIDATE}`} />
      </head>
      <body>
        <Header/>
        {children}
      </body>
    </html>
  )
}
