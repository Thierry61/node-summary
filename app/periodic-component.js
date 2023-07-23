// Server component regenerated periodically

import { loadSummary } from '../lib/load-summary'
import Cards from './cards'
import Err from './err'

export default async function PeriodicComponent() {
  // Don't do: 
  //    let summary = await fetch(`http://localhost:3003/api/summary`)
  //    summary = await summary.json()
  // because host and port are uncertain and the API behavior could differ in the future
  // for example a 503 HTTP status could be generated on error (in either API or server component)

  // Instead just share code in internal server library
  const summary = await loadSummary()
  let err = summary.err
  return (
    <main className="mx-2 mb-2">
      {
        err == undefined ?
          <Cards summary={summary} /> :
          <Err err={err} date={summary.server_time} />
      }
    </main>
  )
}
