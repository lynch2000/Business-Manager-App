import { Input, Button } from './ui'
import { TrashIcon, PlusIcon } from './Icons'
import { formatCurrency, round2 } from '../lib/currency'

export interface EditableLineItem {
  key: string
  description: string
  quantity: number
  unit_price: number
}

export function newLineItem(): EditableLineItem {
  return { key: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0 }
}

export function lineTotal(item: EditableLineItem): number {
  return round2(item.quantity * item.unit_price)
}

export function computeTotals(items: EditableLineItem[], vatRate: number) {
  const subtotal = round2(items.reduce((sum, i) => sum + lineTotal(i), 0))
  const vat_amount = round2((subtotal * vatRate) / 100)
  const total = round2(subtotal + vat_amount)
  return { subtotal, vat_amount, total }
}

export default function LineItemsEditor({
  items,
  onChange,
  vatRate,
}: {
  items: EditableLineItem[]
  onChange: (items: EditableLineItem[]) => void
  vatRate: number
}) {
  function update(key: string, patch: Partial<EditableLineItem>) {
    onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  }

  function remove(key: string) {
    onChange(items.filter((i) => i.key !== key))
  }

  const { subtotal, vat_amount, total } = computeTotals(items, vatRate)

  return (
    <div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="rounded-xl border border-slate-200 p-3">
            <Input
              placeholder="Description"
              value={item.description}
              onChange={(e) => update(item.key, { description: e.target.value })}
              className="mb-2"
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={item.quantity}
                onChange={(e) => update(item.key, { quantity: Number(e.target.value) })}
                className="w-20"
                aria-label="Quantity"
              />
              <span className="text-slate-400">×</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={item.unit_price}
                onChange={(e) => update(item.key, { unit_price: Number(e.target.value) })}
                className="flex-1"
                aria-label="Unit price"
              />
              <span className="w-24 shrink-0 text-right text-sm font-medium text-slate-700">
                {formatCurrency(lineTotal(item))}
              </span>
              <button type="button" onClick={() => remove(item.key)} className="text-slate-400 hover:text-red-500">
                <TrashIcon width={18} height={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="ghost" className="mt-2" onClick={() => onChange([...items, newLineItem()])}>
        <PlusIcon width={16} height={16} /> Add line
      </Button>

      <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>VAT ({vatRate}%)</span>
          <span>{formatCurrency(vat_amount)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-slate-900">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}
