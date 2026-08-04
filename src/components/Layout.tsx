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
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6 safe-top">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-xl border-t border-slate-200 bg-white/95 backdrop-blur safe-bottom">
        <ul className="flex justify-between px-2 pt-1">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 rounded-lg py-2 text-[11px] font-medium ${
                    isActive ? 'text-brand-600' : 'text-slate-400'
                  }`
                }
              >
                <Icon width={22} height={22} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
