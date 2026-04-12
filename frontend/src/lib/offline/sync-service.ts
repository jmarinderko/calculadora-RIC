/**
 * Servicio de sincronización offline → backend.
 *
 * Cuando se recupera la conexión, lee los cálculos no sincronizados de
 * IndexedDB y los envía al backend. Si falla, incrementa el retry counter
 * y lo reintenta en la siguiente oportunidad.
 */

import {
  getUnsyncedCalculations,
  markCalculationSynced,
  getSyncQueue,
  removeSyncItem,
  enqueueSyncItem,
  type OfflineCalculation,
  type SyncQueueItem,
} from './db'
import { saveCalculation as saveCalcApi } from '@/lib/api'

// ── Estado ──────────────────────────────────────────────────────────────────

let syncing = false
const MAX_RETRIES = 5
const listeners: Set<(status: SyncStatus) => void> = new Set()

export interface SyncStatus {
  syncing: boolean
  pending: number
  lastError?: string
}

// ── Listener API ────────────────────────────────────────────────────────────

export function onSyncStatus(cb: (status: SyncStatus) => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function notify(status: SyncStatus) {
  listeners.forEach((cb) => cb(status))
}

// ── Sync calculations ───────────────────────────────────────────────────────

async function syncCalculation(calc: OfflineCalculation): Promise<boolean> {
  try {
    const saved = await saveCalcApi(
      calc.project_id,
      calc.name || 'Cálculo offline',
      calc.input_data as any,
    )
    await markCalculationSynced(calc.id, saved.id)
    return true
  } catch {
    return false
  }
}

// ── Sync queue items (project creation, etc.) ───────────────────────────────

async function processSyncQueue(): Promise<number> {
  const queue = await getSyncQueue()
  let synced = 0

  for (const item of queue) {
    if (item.retries >= MAX_RETRIES) {
      await removeSyncItem(item.id)
      continue
    }

    try {
      // Extensible: handle different action types
      if (item.action === 'create_calculation') {
        const payload = item.payload as any
        await saveCalcApi(payload.project_id, payload.name, payload.input_data)
      }
      // create_project could be handled similarly

      await removeSyncItem(item.id)
      synced++
    } catch {
      // Increment retry count
      await enqueueSyncItem({ ...item, retries: item.retries + 1 })
    }
  }

  return synced
}

// ── Main sync ───────────────────────────────────────────────────────────────

export async function syncAll(): Promise<SyncStatus> {
  if (syncing) return { syncing: true, pending: -1 }

  syncing = true
  let pending = 0
  let lastError: string | undefined

  try {
    // 1. Sync unsynced calculations
    const unsynced = await getUnsyncedCalculations()
    pending = unsynced.length

    notify({ syncing: true, pending })

    for (const calc of unsynced) {
      const ok = await syncCalculation(calc)
      if (ok) {
        pending--
        notify({ syncing: true, pending })
      } else {
        lastError = `Error sincronizando cálculo ${calc.name || calc.id}`
      }
    }

    // 2. Process queued items
    await processSyncQueue()
  } catch (err) {
    lastError = err instanceof Error ? err.message : 'Error de sincronización'
  } finally {
    syncing = false
  }

  const status: SyncStatus = { syncing: false, pending, lastError }
  notify(status)
  return status
}

// ── Auto-sync on reconnect ──────────────────────────────────────────────────

let registered = false

export function registerAutoSync(): () => void {
  if (registered) return () => {}

  const handler = () => {
    if (navigator.onLine) syncAll()
  }

  window.addEventListener('online', handler)
  registered = true

  return () => {
    window.removeEventListener('online', handler)
    registered = false
  }
}
