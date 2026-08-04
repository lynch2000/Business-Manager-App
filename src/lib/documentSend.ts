import type { jsPDF } from 'jspdf'
import { sendEmail, buildMailto } from './email'

export type SendResult = { method: 'email' | 'share' | 'download'; error?: string }

/**
 * Tries, in order: the Resend edge function (silent, in-app "sent" status),
 * then the iOS/Safari Web Share sheet (pick Mail/WhatsApp/etc with the PDF
 * attached), then a plain download + mailto as a last resort.
 */
export async function sendPdfDocument(opts: {
  doc: jsPDF
  filename: string
  to: string | null
  subject: string
  emailHtml: string
  mailtoBody: string
}): Promise<SendResult> {
  const { doc, filename, to, subject, emailHtml, mailtoBody } = opts

  if (to) {
    try {
      const base64 = doc.output('datauristring').split(',')[1]
      await sendEmail({ to, subject, html: emailHtml, attachment: { filename, base64 } })
      return { method: 'email' }
    } catch {
      // fall through to share/download
    }
  }

  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: subject, text: subject })
      return { method: 'share' }
    } catch {
      // user cancelled or share failed — fall through to download
    }
  }

  doc.save(filename)
  if (to) window.open(buildMailto(to, subject, mailtoBody), '_blank')
  return { method: 'download' }
}
