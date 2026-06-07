interface NavItem {
  icon: string
  label: string
  active?: boolean
  badge?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { icon: 'terminal',            label: 'TERMINAL' },
  { icon: 'list_alt',            label: 'LOGS' },
  { icon: 'hub',                 label: 'NETWORK' },
  { icon: 'notifications_active', label: 'ALERTS', badge: true },
  { icon: 'description',         label: 'REPORTS' },
]

const BOTTOM_ITEMS: NavItem[] = [
  { icon: 'settings', label: 'SETTINGS' },
  { icon: 'help',     label: 'HELP' },
]

interface SideRailProps {
  activeIcon?: string
}

export default function SideRail({ activeIcon = 'list_alt' }: SideRailProps) {
  return (
    <aside className="fixed left-0 top-12 h-[calc(100vh-48px)] z-40 flex flex-col justify-between py-4 bg-surface-container-lowest border-r border-outline-variant w-16 hover:w-64 transition-all duration-300 group overflow-hidden">
      {/* Top section */}
      <div className="flex flex-col gap-2">
        {/* User identity */}
        <div className="flex items-center px-4 py-3 gap-4 mb-2">
          <div className="w-8 h-8 bg-surface-variant border border-outline flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[18px]">person</span>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            <p className="font-label-caps text-label-caps text-primary leading-none">
              OPERATOR
            </p>
            <p className="text-[9px] text-on-surface-variant mt-0.5">ANALYST</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col">
          {NAV_ITEMS.map(({ icon, label, badge }) => {
            const isActive = icon === activeIcon
            return (
              <a
                key={icon}
                href="#"
                onClick={e => e.preventDefault()}
                className={[
                  'flex items-center h-12 px-5 gap-4 transition-all duration-200 relative border-l-2',
                  isActive
                    ? 'bg-primary-container text-on-primary-container border-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-variant border-transparent',
                ].join(' ')}
              >
                <span
                  className="material-symbols-outlined shrink-0"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {icon}
                </span>
                <span className="font-label-caps text-label-caps opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {label}
                </span>
                {badge && !isActive && (
                  <div className="absolute right-4 w-2 h-2 bg-error" />
                )}
              </a>
            )
          })}
        </nav>
      </div>

      {/* Bottom section */}
      <div className="flex flex-col">
        <button className="mx-2 mb-4 h-10 bg-primary-container text-on-primary-container font-label-caps text-label-caps flex items-center justify-center gap-2 overflow-hidden">
          <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            LAUNCH SIM
          </span>
        </button>
        {BOTTOM_ITEMS.map(({ icon, label }) => (
          <a
            key={icon}
            href="#"
            onClick={e => e.preventDefault()}
            className="flex items-center h-12 px-5 gap-4 text-on-surface-variant hover:bg-surface-variant transition-all duration-200"
          >
            <span className="material-symbols-outlined shrink-0">{icon}</span>
            <span className="font-label-caps text-label-caps opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {label}
            </span>
          </a>
        ))}
      </div>
    </aside>
  )
}
