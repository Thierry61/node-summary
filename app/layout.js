import { cookies } from 'next/headers'
import './globals.css'
import Header from './header'

export const metadata = {
  title: 'Bitcoin node summary',
  description: 'Display summary information by accessing the Bitcoin node RPC API'
}

// Default values when no cookies are defined:
// - refresh: twice the REVALIDATE parameter
// - theme: light
const refreshDef = 2*process.env.REVALIDATE
const refreshMin = process.env.REVALIDATE
const themeDef = 'light';

// http-equiv is normally unsupported but refresh seems to work.
// Alternative implementation would be to use a client component with a useEffect
// that periodically refreshes the page, but the problem with this solution
// is that repeat factor in animations doesn't work properly.
// Additionally this solution would need JavaScript client side.
export default async function RootLayout({ children }) {
  const cookieStore = await cookies()
  const action = cookieStore.get('action')?.value
  let refresh = cookieStore.get('refresh')?.value
  let theme = cookieStore.get('theme')?.value
  // Test refresh validity, fallback to default value if invalid
  if (refresh == undefined) {
    refresh = refreshDef
  } else if (refresh != 'Never') {
    refresh = parseInt(refresh)
    if (Number.isNaN(refresh)) {
      refresh = refreshDef
    } else if (refresh < refreshMin) {
        refresh = refreshDef
    }
  }
  // Test theme validity, fallback to default value if invalid
  if (theme == undefined || (theme != 'dark' && theme != 'light')) {
    theme = themeDef
  }
  let dark = theme == 'dark' ? 'dark' : ''
  return (
    <html lang='en' className={dark}>
      <head>
        { (action != 'open' && refresh != 'Never') ? <meta httpEquiv="refresh" content={refresh} /> : null}
      </head>
      <body className='dark:bg-blue-700'>
        <Header action={action} theme={theme} refresh={refresh} themeDef={themeDef} refreshDef={refreshDef}/>
        {children}
      </body>
    </html>
  )
}
