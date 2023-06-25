import Image from 'next/image'

export default async function Header() {
  return (
    <header className='flex flex-cols justify-between gap-2 m-3'>
      <div>
        <Image className='inline mr-2 mb-1' src='/btc.svg' width={24} height={24} alt="Bitcoin logo"/>
        <span>Node Summary</span>
      </div>
    </header>
  )
}
