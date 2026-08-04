import { jsPDF } from 'jspdf'
import type { BusinessSettings, Customer, LineItem } from '../types'
import { formatCurrency, formatDate } from './currency'
import defaultLogoUrl from '../assets/logo-wordmark.png'

const BRAND_NAVY = '#203058'

interface DocumentPdfInput {
  kind: 'Quote' | 'Invoice'
  number: string
  status: string
  issueDate: string
  dueOrValidDate: string | null
  dueOrValidLabel: string
  customer: Customer
  items: LineItem[]
  subtotal: number
  vatRate: number
  vatAmount: number
  total: number
  amountPaid?: number
  notes: string | null
  terms: string | null
  settings: BusinessSettings
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export async function buildDocumentPdf(input: DocumentPdfInput): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 48
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = margin

  const logo = await loadImage(input.settings.logo_url || defaultLogoUrl)

  if (logo) {
    const logoHeight = 34
    const logoWidth = logoHeight * (logo.naturalWidth / logo.naturalHeight)
    doc.addImage(logo, margin, y - 6, logoWidth, logoHeight)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(BRAND_NAVY)
  doc.text(input.kind.toUpperCase(), pageWidth - margin, y, { align: 'right' })

  doc.setFontSize(11)
  doc.setTextColor('#334155')
  doc.setFont('helvetica', 'normal')
  doc.text(`${input.number}`, pageWidth - margin, y + 16, { align: 'right' })
  doc.text(`Status: ${input.status}`, pageWidth - margin, y + 30, { align: 'right' })
  y += 48

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor('#0f172a')
  doc.text(input.settings.business_name || 'Your Business', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor('#475569')
  y += 16
  for (const line of [input.settings.address, input.settings.phone, input.settings.email, input.settings.vat_number ? `VAT: ${input.settings.vat_number}` : null]) {
    if (!line) continue
    doc.text(line, margin, y)
    y += 13
  }

  let yRight = margin + 48
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor('#0f172a')
  doc.text('Bill to', pageWidth - margin, yRight, { align: 'right' })
  yRight += 14
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#475569')
  const customerLines = [
    input.customer.name,
    input.customer.address_line1,
    input.customer.address_line2,
    [input.customer.city, input.customer.county].filter(Boolean).join(', '),
    input.customer.eircode,
    input.customer.phone,
    input.customer.email,
  ].filter(Boolean) as string[]
  for (const line of customerLines) {
    doc.text(line, pageWidth - margin, yRight, { align: 'right' })
    yRight += 13
  }

  y = Math.max(y, yRight) + 16
  doc.setDrawColor('#e2e8f0')
  doc.line(margin, y, pageWidth - margin, y)
  y += 20

  doc.setFontSize(10)
  doc.setTextColor('#64748b')
  doc.text(`Issue date: ${formatDate(input.issueDate)}`, margin, y)
  if (input.dueOrValidDate) {
    doc.text(`${input.dueOrValidLabel}: ${formatDate(input.dueOrValidDate)}`, pageWidth - margin, y, { align: 'right' })
  }
  y += 24

  // table header
  const col = { desc: margin, qty: pageWidth - margin - 220, price: pageWidth - margin - 150, total: pageWidth - margin }
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#0f172a')
  doc.text('Description', col.desc, y)
  doc.text('Qty', col.qty, y, { align: 'right' })
  doc.text('Unit price', col.price, y, { align: 'right' })
  doc.text('Total', col.total, y, { align: 'right' })
  y += 8
  doc.setDrawColor('#cbd5e1')
  doc.line(margin, y, pageWidth - margin, y)
  y += 16

  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#334155')
  for (const item of input.items) {
    const descLines = doc.splitTextToSize(item.description || '—', col.qty - col.desc - 10)
    doc.text(descLines, col.desc, y)
    doc.text(String(item.quantity), col.qty, y, { align: 'right' })
    doc.text(formatCurrency(item.unit_price), col.price, y, { align: 'right' })
    doc.text(formatCurrency(item.line_total), col.total, y, { align: 'right' })
    y += 16 * Math.max(descLines.length, 1) + 4
    if (y > 700) {
      doc.addPage()
      y = margin
    }
  }

  y += 6
  doc.line(pageWidth - margin - 200, y, pageWidth - margin, y)
  y += 18

  const totalsRow = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(bold ? '#0f172a' : '#475569')
    doc.text(label, pageWidth - margin - 200, y)
    doc.text(value, pageWidth - margin, y, { align: 'right' })
    y += 16
  }

  totalsRow('Subtotal', formatCurrency(input.subtotal))
  totalsRow(`VAT (${input.vatRate}%)`, formatCurrency(input.vatAmount))
  totalsRow('Total', formatCurrency(input.total), true)
  if (typeof input.amountPaid === 'number' && input.amountPaid > 0) {
    totalsRow('Paid', formatCurrency(input.amountPaid))
    totalsRow('Balance due', formatCurrency(input.total - input.amountPaid), true)
  }

  y += 10

  if (input.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#0f172a')
    doc.setFontSize(10)
    doc.text('Notes', margin, y)
    y += 14
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#475569')
    const lines = doc.splitTextToSize(input.notes, pageWidth - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * 13 + 10
  }

  if (input.terms) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#0f172a')
    doc.text('Terms', margin, y)
    y += 14
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#475569')
    const lines = doc.splitTextToSize(input.terms, pageWidth - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * 13 + 10
  }

  if (input.kind === 'Invoice' && (input.settings.iban || input.settings.bic)) {
    y += 6
    doc.setDrawColor('#e2e8f0')
    doc.line(margin, y, pageWidth - margin, y)
    y += 20
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor('#0f172a')
    doc.text('Payment details', margin, y)
    y += 14
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#475569')
    for (const [label, value] of [
      ['Account name', input.settings.account_name],
      ['Bank', input.settings.bank_name],
      ['IBAN', input.settings.iban],
      ['BIC', input.settings.bic],
    ]) {
      if (!value) continue
      doc.text(`${label}: ${value}`, margin, y)
      y += 13
    }
  }

  return doc
}

export function pdfToBase64(doc: jsPDF): string {
  return doc.output('datauristring').split(',')[1]
}
