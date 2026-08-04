import { Link } from 'react-router'
import { PageHeader, Card } from '../components/ui'
import { AccountsIcon, ReceiptIcon, WrenchIcon, SettingsIcon, LogoutIcon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'

const items = [
  { to: '/accounts', label: 'Accounts (debtors & creditors)', icon: AccountsIcon },
  { to: '/expenses', label: 'Expenses & receipts', icon: ReceiptIcon },
  { to: '/services', label: 'Servicing & reminders', icon: WrenchIcon },
  { to: '/settings', label: 'Business settings', icon: SettingsIcon },
]

export default function More() {
  const { signOut, user } = useAuth()

  return (
    <div>
      <PageHeader title="More" />
      <div className="space-y-2">
        {items.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card interactive className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon width={18} height={18} />
              </span>
              <span className="flex-1 font-medium text-slate-800">{label}</span>
              <span className="text-slate-300">›</span>
            </Card>
          </Link>
        ))}
        <button className="w-full text-left" onClick={() => signOut()}>
          <Card interactive className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <LogoutIcon width={18} height={18} />
            </span>
            <span className="font-medium text-slate-800">Sign out</span>
          </Card>
        </button>
      </div>
      {user?.email && <p className="mt-6 text-center text-xs text-slate-400">Signed in as {user.email}</p>}
    </div>
  )
}
