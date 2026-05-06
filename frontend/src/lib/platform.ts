/**
 * Helpers para operaciones que difieren entre browser y Capacitor (Android/iOS).
 *
 * - copyToClipboard: usa Capacitor Clipboard en mobile, navigator.clipboard en browser,
 *   y devuelve `false` si ninguno está disponible (caller debe mostrar fallback UI).
 * - saveBlobAsFile: en browser usa el patrón <a download>, en Capacitor escribe a
 *   Documents con Filesystem y devuelve la ruta resultante.
 */

import { Capacitor } from '@capacitor/core'
import { Clipboard } from '@capacitor/clipboard'
import { Filesystem, Directory } from '@capacitor/filesystem'

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

/**
 * Copia texto al portapapeles. Devuelve true si tuvo éxito, false si no.
 * El caller decide qué hacer en caso de fallo (ej. mostrar el texto en un modal).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Capacitor mobile: usa el plugin nativo
  if (isNativePlatform()) {
    try {
      await Clipboard.write({ string: text })
      return true
    } catch {
      return false
    }
  }
  // Browser: navigator.clipboard (HTTPS o localhost)
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* sigue al fallback */
  }
  // Fallback legacy (deprecated pero aún funciona en muchos browsers)
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/**
 * Convierte un Blob a base64 (sin data: prefix).
 */
async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  // Usar chunks para evitar stack overflow con archivos grandes
  let binary = ''
  const bytes = new Uint8Array(buf)
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, Array.from(chunk))
  }
  return btoa(binary)
}

/**
 * Guarda un blob como archivo descargable.
 * - Browser: dispara la descarga vía <a download>.
 * - Capacitor mobile: lo escribe a Documents/ y devuelve la ruta absoluta.
 *
 * Devuelve null si fue exitoso en browser, o la ruta del archivo en mobile.
 */
export async function saveBlobAsFile(blob: Blob, filename: string): Promise<string | null> {
  if (isNativePlatform()) {
    const data = await blobToBase64(blob)
    const result = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Documents,
      recursive: true,
    })
    return result.uri
  }

  // Browser
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return null
}
