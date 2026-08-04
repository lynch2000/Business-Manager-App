export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(amount)
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IE', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(date),
  )
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
