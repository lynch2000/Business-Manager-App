export type DueStatus = 'overdue' | 'due_soon' | 'upcoming'

export function dueStatus(nextDueDate: string): DueStatus {
  const days = (new Date(nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (days < 0) return 'overdue'
  if (days <= 30) return 'due_soon'
  return 'upcoming'
}
