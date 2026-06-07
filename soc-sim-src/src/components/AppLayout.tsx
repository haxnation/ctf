import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import SideRail from './SideRail'

export default function AppLayout() {
  return (
    <div className="terminal-grid min-h-screen bg-background text-on-surface">
      <TopBar />
      <SideRail />
      <main className="ml-16 pt-12">
        <Outlet />
      </main>
    </div>
  )
}
