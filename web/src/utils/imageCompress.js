export async function compressImage(file) {
  const img = await createImageBitmap(file)
  let { width, height } = img
  const maxSide = 1024
  if (Math.max(width, height) > maxSide) {
    const ratio = maxSide / Math.max(width, height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (blob.size > 1024 * 1024) {
    const blob2 = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.6))
    img.close()
    return { blob: blob2, width, height }
  }
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  img.close()
  return { blob, dataUrl, width, height }
}
