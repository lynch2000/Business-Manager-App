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
            <Card className="flex items-center gap-3">
              <Icon width={20} height={20} className="text-brand-600" />
              <span className="font-medium text-slate-800">{label}</span>
            </Card>
          </Link>
        ))}
        <button className="w-full text-left" onClick={() => signOut()}>
          <Card className="flex items-center gap-3">
            <LogoutIcon width={20} height={20} className="text-slate-500" />
            <span className="font-medium text-slate-800">Sign out</span>
          </Card>
        </button>
      </div>
      {user?.email && <p className="mt-6 text-center text-xs text-slate-400">Signed in as {user.email}</p>}
    </div>
  )
}
