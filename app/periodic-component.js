import { loadSummary } from '../lib/load-summary'
import Cards from './cards'
import Err from './Err'

export default async function PeriodicComponent() {
  const summary = await loadSummary()
  let err = summary.err
  return (
    <main className="mx-2 mb-2">
      {
        err == undefined ? <Cards summary={summary} /> : <Err err={err} date={summary.date} />
      }
    </main>
  )
}
