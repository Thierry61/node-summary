import Image from 'next/image'
import { getVersion } from '../lib/load-summary'

export default async function Header() {
  const vers = await getVersion()
  const err = vers.err
  const vers_or_err = err == undefined ? vers.subversion : JSON.stringify(err)
  return (
    <header className='sticky top-0 z-30 w-full bg-white flex flex-cols justify-between'>
      <div className='m-2'>
        <Image className='inline mr-2' src='/btc.svg' width={24} height={24} alt="Bitcoin logo"/>
        <span className='inline align-middle'>Node Summary - {vers_or_err}</span>
      </div>
    </header>
  )
}
