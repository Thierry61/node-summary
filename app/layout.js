import { cookies } from 'next/headers'
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
// Additionally this solution would need JavaScript client side.
export default async function RootLayout({ children }) {
  const cookieStore = cookies()
  const action = cookieStore.get('action')?.value
  let refresh = cookieStore.get('refresh')?.value
  // Default values when no cookies are defined:
  // - refresh: twice the REVALIDATE parameter
  // - theme: light
  // For consistency these values should be the same as default values defined in headers.js
  if (refresh == undefined) {
    refresh = 2*process.env.REVALIDATE
  }
  let theme = cookieStore.get('theme')?.value
  let dark = theme == 'dark' ? 'dark' : ''
  return (
    <html lang='en' className={dark}>
      <head>
        { (action != 'open' && refresh != 'Nevers') ? <meta httpEquiv="refresh" content={refresh} /> : null}
      </head>
      <body className='dark:bg-blue-700'>
        <Header/>
        {children}
      </body>
    </html>
  )
}
