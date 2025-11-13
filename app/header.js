// Note: SVG icons originate from https://feathericons.com/ (open source with MIT license)

import Image from 'next/image'
import { getVersion } from '../lib/load-summary'
import Settings from './settings'

export default async function Header({ action, theme, refresh, themeDef, refreshDef }) {
  const vers = await getVersion()
  const err = vers.err
  const vers_or_err = err == undefined ? vers.subversion : JSON.stringify(err)

  // Cancel button tooltip fragments
  const refreshCancel = refresh == 'Never' ? 'Never' : `${refresh} seconds`
  const themeCancel = theme

  // Cancel button complete tooltip
  const tooltipCancel = `Keep previous values (refresh: ${refreshCancel}, theme: ${themeCancel})`

  // Menu tooltip (action cookie value 'open' means that the form is currently opened, so clicking on the menu will close it)
  const tooltipMenu = action == 'open' ? `Close settings form and keep previous values (refresh: ${refreshCancel}, theme: ${themeCancel})` :
    'Open settings form'

  return (
    <header className='sticky top-0 z-30 w-full bg-white dark:bg-blue-800 dark:text-white flex flex-cols justify-between'>
      <div className='m-2'>
        <a href='https://bitcoincore.org/en/about/' className='unconditional-tooltip tooltip-right tooltip inline'>
          <Image className='inline' src='/btc.svg' width={24} height={24} alt="Bitcoin icon"/>
          <span className='tooltip-text'>Bitcoin Core project</span>
        </a>
        { // GitHub logo from https://github.com/logos
        <a href='https://github.com/Thierry61/node-summary' className='unconditional-tooltip tooltip-right tooltip ml-2 inline'>
          <Image className='inline w-5 h-5 dark:invert' src='/github-mark.svg' width={24} height={24} alt="GitHub logo"/>
          <span className='tooltip-text'>Source repository</span>
        </a>
        }
        { // Noscript icon copied from Chrome settings
        <span className='unconditional-tooltip tooltip-right tooltip ml-1.5 inline'>
          <Image className='inline w-5 h-5 dark:invert' src='/no-script.svg' width={24} height={24} alt="No script icon"/>
          <span className='tooltip-text'>Page without scripts</span>
        </span>
        }
      </div>
      <span className='m-2 justify-center'>Node Summary {vers_or_err}</span>
      <div className='m-2 justify-end'>
        <form action='/settings'>
          <input type='hidden' id='action' name='action' value='open'/>
          <input type="submit" id='burger' className='hidden'/>
          <label htmlFor="burger" className='unconditional-tooltip tooltip-left tooltip inline align-middle cursor-pointer'>
            <Image className='w-6 h-6 dark:invert' src='/menu.svg' width={24} height={24} alt="Menu"/>
            <span className='tooltip-text'>{tooltipMenu}</span>
          </label>
        </form>
        {
          (action != 'open') ? null // For undefined (root path '/')
          : <Settings refresh={refresh} refreshDef={refreshDef} theme={theme} themeDef={themeDef} tooltipCancel={tooltipCancel} />  // For 'open' (/settings path)
        }
      </div>
    </header>
  )
}
