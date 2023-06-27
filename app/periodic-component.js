import { loadSummary } from '../lib/load-summary'
import Cards from './cards'

export default async function PeriodicComponent() {
  const summary = await loadSummary()
  return (
    <main className="text-sm mx-2 mb-2">
      <Cards summary={summary} />
    </main>
  )
}
