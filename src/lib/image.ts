export interface ProcessedImage {
  blob: Blob
  base64: string
  mimeType: string
}

/**
 * Downscales a photo client-side before it's uploaded or sent for scanning —
 * a full-resolution phone photo is unnecessary for reading a receipt and
 * just costs upload time and edge-function payload size.
 */
export async function downscaleImage(file: File, maxDimension = 1600, quality = 0.82): Promise<ProcessedImage> {
  const bitmap = await loadBitmap(file)
  const sourceWidth = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width
  const sourceHeight = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height

  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight))
  const width = Math.round(sourceWidth * scale)
  const height = Math.round(sourceHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(bitmap, 0, 0, width, height)

  const mimeType = 'image/jpeg'
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to encode image'))), mimeType, quality)
  })
  const base64 = await blobToBase64(blob)

  return { blob, base64, mimeType }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // fall through to the <img> based path below
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
