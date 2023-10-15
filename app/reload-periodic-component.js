// Client component reloading periodically the server component passed in parameter
// (well, not exactly: in fact the whole page is reloaded)
// Inspired from https://iq.js.org/questions/react/how-to-update-a-component-every-second?_sm_au_=iRsvHQP0J05RrM7fML8tvK34L00HF.

'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'

// Note that client components cannot be async functions. See: https://nextjs.org/docs/messages/no-async-client-component
export default function ReloadPeriodicComponent({ refresh, children }) {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, refresh * 1000)
    return () => clearInterval(interval)
  })

  return (
    <>
      {children}
    </>
  )
}
