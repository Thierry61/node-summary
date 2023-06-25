// Client component reloading periodically a server component
import ReloadPeriodicComponent from './reload-periodic-component'

// Server component reloaded periodically
import PeriodicComponent from './periodic-component'

export default async function Home() {
  return (
    <ReloadPeriodicComponent refresh={process.env.REVALIDATE}>
      <PeriodicComponent/>
    </ReloadPeriodicComponent>
  )
}
