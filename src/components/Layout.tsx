import { NavLink, Outlet } from 'react-router'
import { HomeIcon, UsersIcon, QuoteIcon, InvoiceIcon, MoreIcon } from './Icons'

const tabs = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/customers', label: 'Customers', icon: UsersIcon, end: false },
  { to: '/quotes', label: 'Quotes', icon: QuoteIcon, end: false },
  { to: '/invoices', label: 'Invoices', icon: InvoiceIcon, end: false },
  { to: '/more', label: 'More', icon: MoreIcon, end: false },
]

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col bg-slate-50">
      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-6 safe-top">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-xl border-t border-slate-200/70 bg-white/90 shadow-[0_-1px_16px_rgba(15,23,42,0.06)] backdrop-blur-lg safe-bottom">
        <ul className="flex justify-between px-2 pt-1.5">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition-colors duration-150 ${
                    isActive ? 'text-brand-600' : 'text-slate-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-8 w-9 items-center justify-center rounded-full transition-all duration-200 ${
                        isActive ? 'scale-100 bg-brand-50' : 'scale-90 bg-transparent'
                      }`}
                    >
                      <Icon width={20} height={20} />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
