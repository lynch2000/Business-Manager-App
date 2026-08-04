import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles: Record<string, string> = {
    primary: 'bg-brand-600 text-white shadow-sm shadow-brand-900/10 hover:bg-brand-700 active:bg-brand-800',
    secondary: 'bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 active:bg-slate-100',
    danger: 'bg-red-600 text-white shadow-sm shadow-red-900/10 hover:bg-red-700 active:bg-red-800',
    ghost: 'bg-transparent text-brand-600 hover:bg-brand-50 active:bg-brand-100',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

const fieldClasses =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-shadow duration-150 placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClasses} ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClasses} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClasses} ${props.className ?? ''}`} />
}

export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_8px_rgba(15,23,42,0.04)] ${
        interactive ? 'transition-all duration-150 active:scale-[0.98] active:shadow-sm' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h1 className="text-[1.35rem] font-semibold tracking-tight text-slate-900">{title}</h1>
      {action}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
      <p className="font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  )
}

const badgeColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-700',
  accepted: 'bg-green-50 text-green-700',
  paid: 'bg-green-50 text-green-700',
  declined: 'bg-red-50 text-red-700',
  void: 'bg-red-50 text-red-700',
  expired: 'bg-amber-50 text-amber-700',
  overdue: 'bg-red-50 text-red-700',
  partially_paid: 'bg-amber-50 text-amber-700',
  unpaid: 'bg-amber-50 text-amber-700',
  due_soon: 'bg-amber-50 text-amber-700',
  upcoming: 'bg-slate-100 text-slate-600',
}

const dotColors: Record<string, string> = {
  draft: 'bg-slate-400',
  sent: 'bg-blue-500',
  accepted: 'bg-green-500',
  paid: 'bg-green-500',
  declined: 'bg-red-500',
  void: 'bg-red-500',
  expired: 'bg-amber-500',
  overdue: 'bg-red-500',
  partially_paid: 'bg-amber-500',
  unpaid: 'bg-amber-500',
  due_soon: 'bg-amber-500',
  upcoming: 'bg-slate-400',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badgeColors[status] ?? 'bg-slate-100 text-slate-600'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColors[status] ?? 'bg-slate-400'}`} />
      {status.replace('_', ' ')}
    </span>
  )
}

export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-100 border-t-brand-600" />
    </div>
  )
}
