import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function TopBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const activeSection = location.pathname.startsWith('/compete') ? 'compete' : 'practice'

  const navItems: { label: string; key: typeof activeSection; path: string }[] = [
    { label: 'PRACTICE', key: 'practice', path: '/practice' },
    { label: 'COMPETE',  key: 'compete', path: '/compete' },
  ]

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-margin h-12 bg-background border-b border-outline-variant">
      <div className="flex items-center gap-6">
        <span className="font-headline-md text-headline-md font-bold text-primary-container tracking-tighter">
          HAXNATION // SOC SIMULATION
        </span>
        <nav className="hidden md:flex gap-4 h-full">
          {navItems.map(({ label, key, path }) => (
            <button
              key={key}
              onClick={() => navigate(path)}
              className={[
                'flex items-center h-full px-2 font-label-caps text-label-caps transition-colors duration-150',
                activeSection === key
                  ? 'text-primary-container border-b border-primary-container'
                  : 'text-on-surface-variant hover:text-on-surface',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <>
            <div className="flex items-center gap-2 group/avatar relative">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                {user.name}
              </span>
            </div>
            <button
              onClick={logout}
              className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface border border-outline-variant px-3 py-1 hover:bg-surface-variant hover:text-primary transition-colors"
            >
              EXIT
            </button>
          </>
        )}
      </div>
    </header>
  )
}
