// Note: SVG icons originate from https://feathericons.com/ (open source with MIT license)

import Image from 'next/image'
import { getVersion } from '../lib/load-summary'

// TODO: Add layout choice (1x9, 2x5, 3x3, 5x2, 9x1, dynamic)

// Common styles for buttons that can be highlighted
const highlightButton = 'px-2 bg-blue-100 py-1.5 rounded-lg cursor-pointer tooltip-top tooltip ' +
                        'peer-checked:text-gray-100 peer-checked:bg-blue-400 peer-checked:py-4 ' +
                        'hover:text-gray-100 hover:bg-blue-400 hover:py-4 ' +
                        'dark:text-black dark:bg-blue-200 '

// Horizontal rule
function HR () {
  return (<div className='border-b-2 border-blue-600 dark:border-blue-400'/>)
}

// Compute refresh duration in seconds by multiplying refresh factor with REVALIDATE parameter.
// For example if refresh factor is 2, then duration is 2 * 5s = 10s
function refreshDuration (refreshFactor) {
  return refreshFactor * process.env.REVALIDATE
}

// Label of a refresh duration already in seconds. For example if refresh value is 10, then label is '10 seconds'
function refreshLabel (refreshDuration) {
  return refreshDuration == 'Never' ? 'Never' : `${refreshDuration} seconds`
}

// Note that refresh and refreshDef are in seconds and must not be converted by refreshDuration function
export default async function Header({ action, theme, refresh, themeDef, refreshDef }) {
  const vers = await getVersion()
  const err = vers.err
  const vers_or_err = err == undefined ? vers.subversion : JSON.stringify(err)
  // Radio buttons checked status
  const [ lightChk, darkChk ] = (theme == 'dark') ? [ false, true ] : [ true, false ]
  // Refresh button tooltip fragments
  const refreshReset = refreshLabel(refreshDef)
  const themeReset = themeDef
  // Cancel button tooltip fragments
  const refreshCancel = refreshLabel(refresh)
  const themeCancel = theme
  // Complete tooltips
  const tooltipReset = `Set to default values (refresh: ${refreshReset}, theme: ${themeReset})`
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
          : // For 'open' (/settings path)
            // TODO: Utilies like mr-0 or object-top don't work since tailwind 4 so a calc formula is used as a workaroud to right align or center the dialog
            <dialog className='animate-dialog ml-[calc(100%-260px)] mt-2 block w-64 shadow-xl dark:shadow-white shadow-blue-800 border-1 rounded-b-lg px-4 py-4 border-blue-600 dark:border-blue-400 bg-white dark:bg-blue-800 dark:text-white' id='dialog'>
              <form className='grid grid-cols-1 gap-y-4' action='/settings'>
                <div className='font-bold text-center'>Settings</div>
                <HR/>
                <div className=''>Refresh rate:</div>
                { /* Intermediate div elements for tooltip on select element. Padded to increase its height needed for tooltip relative bottom position */ }
                <div className='-my-3 pb-8 unconditional-tooltip tooltip-top tooltip'>
                  <select name='refresh' className='w-full pb-1 rounded-lg bg-blue-100 dark:text-black dark:bg-blue-200' defaultValue={refresh}>
                    <option value={refreshDuration(1)}>{refreshLabel(refreshDuration(1))}</option>
                    <option value={refreshDuration(2)}>{refreshLabel(refreshDuration(2))}</option>
                    <option value={refreshDuration(4)}>{refreshLabel(refreshDuration(4))}</option>
                    <option value={refreshDuration(6)}>{refreshLabel(refreshDuration(6))}</option>
                    <option value='Never'>Never</option>
                  </select>
                  <span className='tooltip-text'>Select browser refresh rate</span>
                </div>
                { /* Negative margin to compensate previous div padding */ }
                <div className='-mt-4'>Theme:</div>
                { /* intermediate div to group buttons in the same row, negative padding to bring it nearer 'Theme' div  */ }
                <div className='-mt-4 flex flex-cols justify-between items-center'>
                  { /* include (input, label) pairs inside elements so that peer sibling selectors work independently */ }
                  <div className=''>
                    <input type="radio" name='theme' id='light' value='light' className='peer hidden' defaultChecked={lightChk}/>
                    <label htmlFor='light' className={highlightButton} name='Light'>
                      <Image className='-mt-1 inline mr-2 invertible' src='/sun.svg' width={24} height={24} alt="Sun"/>
                      (Light)
                      <span className='tooltip-text'>Switch to light theme</span>
                    </label>
                  </div>
                  <div className=''>
                    <input type="radio" name='theme' id='dark' value='dark' className='peer hidden' defaultChecked={darkChk}/>
                      <label htmlFor='dark' className={highlightButton} name='Dark'>
                      <span className='tooltip-text'>Switch to dark theme</span>
                      <Image className='-mt-1 inline mr-2 invertible' src='/moon.svg' width={24} height={24} alt="Sun"/>
                      (Dark)
                    </label>
                  </div>
                </div>
                <HR/>
                <div className='h-12 flex flex-cols justify-between items-center'>
                  <button name="action" value="cancel" className={`unconditional-tooltip ${highlightButton}`}>
                    Cancel
                    <span className='tooltip-text'>{tooltipCancel}</span>
                  </button>
                  <button name="action" value="reset" className={`unconditional-tooltip justify-center ${highlightButton}`}>
                    Reset
                    <span className='tooltip-text'>{tooltipReset}</span>
                  </button>
                  <button name="action" value="save" className={`unconditional-tooltip justify-end ${highlightButton}`}>
                    <span className='mx-2.5'>OK</span>
                    <span className='tooltip-text'>Save current edited values</span>
                  </button>
                </div>
              </form>
            </dialog>
        }
      </div>
    </header>
  )
}
