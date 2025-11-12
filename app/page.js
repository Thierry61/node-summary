// Server component reloaded periodically

// Force dynamic to avoid error: Dynamic server usage: no-store fetch http://127.0.0.1:8332
// when building the site
export const dynamic = "force-dynamic";

import { cookies } from 'next/headers'
import PeriodicComponent from './periodic-component'

export default async function Home() {
  const cookieStore = await cookies()
  const action = cookieStore.get('action')?.value
  return (
      <PeriodicComponent action={action} />
  )
}
