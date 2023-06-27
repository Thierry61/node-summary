import Image from 'next/image'

export default async function Header() {
  return (
    <header className='sticky top-0 z-30 w-full bg-white flex flex-cols justify-between'>
      <div className='m-2'>
        <Image className='inline mr-2' src='/btc.svg' width={24} height={24} alt="Bitcoin logo"/>
        <span className='inline align-middle'>Node Summary</span>
      </div>
    </header>
  )
}
