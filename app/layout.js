import './globals.css'

export const metadata = {
  title: 'Bitcoin node summary',
  description: 'Display summary information by accessing the Bitcoin node RPC API'
}

// http-equiv is normally unsupported but refresh seems to work, whereas I didn't succeed to use setInterval as in
// https://iq.js.org/questions/react/how-to-update-a-component-every-second?_sm_au_=iRsvHQP0J05RrM7fML8tvK34L00HF.
// I suppose this because all the components are server components which can't use client JavaScript.
export default async function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta http-equiv="refresh" content={`${process.env.REVALIDATE}`} />
      </head>
      <body>{children}</body>
    </html>
  )
}
