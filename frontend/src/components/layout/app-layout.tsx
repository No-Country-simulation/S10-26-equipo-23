import { Link, Outlet } from 'react-router'
import { paths } from '@/config/paths'

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center border-b bg-background px-9">
        <Link to={paths.busquedas} className="rounded-md font-semibold">
          RepuSense
        </Link>
      </header>
      <main className="flex flex-1 flex-col px-9 py-9">
        <Outlet />
      </main>
    </div>
  )
}
