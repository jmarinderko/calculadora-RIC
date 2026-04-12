/**
 * Capa de almacenamiento offline con IndexedDB.
 *
 * Guarda proyectos, cálculos y una cola de sync para cuando se recupere la
 * conexión. Usa la API IndexedDB nativa con helpers async para evitar
 * dependencias externas pesadas (Dexie, etc.).
 */

const DB_NAME = 'ric_offline'
const DB_VERSION = 1

// ── Tipos ────────��───────────────────────────────────────────────────────────

export interface OfflineProject {
  id: string
  name: string
  description?: string
  location?: string
  created_at: string
  calculation_count: number
}

export interface OfflineCalculation {
  id: string                    // UUID local (crypto.randomUUID)
  project_id: string
  name?: string
  input_data: Record<string, unknown>
  result_data: Record<string, unknown>
  sistema: string
  tension_v: number
  potencia_kw: number
  seccion_mm2: number
  cumple_ric: boolean
  created_at: string
  synced: boolean               // false = pendiente de sync
  server_id?: string            // ID del backend una vez sincronizado
}

export interface SyncQueueItem {
  id: string
  action: 'create_calculation' | 'create_project'
  payload: Record<string, unknown>
  created_at: string
  retries: number
}

// ── Open/Init ────────────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result

      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('calculations')) {
        const calcStore = db.createObjectStore('calculations', { keyPath: 'id' })
        calcStore.createIndex('by_project', 'project_id', { unique: false })
        calcStore.createIndex('by_synced', 'synced', { unique: false })
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ── Generic helpers ──────────────────────────────────────────────────────────

async function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const req = fn(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    transaction.oncomplete = () => db.close()
  })
}

async function getAll<T>(storeName: string): Promise<T[]> {
  return tx(storeName, 'readonly', (s) => s.getAll() as IDBRequest<T[]>)
}

async function put<T>(storeName: string, item: T): Promise<void> {
  await tx(storeName, 'readwrite', (s) => s.put(item))
}

async function del(storeName: string, key: string): Promise<void> {
  await tx(storeName, 'readwrite', (s) => s.delete(key))
}

// ── Proyectos ────────────────────────────────────────────────────────────────

export async function saveProjects(projects: OfflineProject[]): Promise<void> {
  const db = await openDB()
  const transaction = db.transaction('projects', 'readwrite')
  const store = transaction.objectStore('projects')
  for (const p of projects) store.put(p)
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => { db.close(); resolve() }
    transaction.onerror = () => { db.close(); reject(transaction.error) }
  })
}

export async function getOfflineProjects(): Promise<OfflineProject[]> {
  return getAll<OfflineProject>('projects')
}

// ── Cálculos ─────────────────────────────────────────────────────────────────

export async function saveCalculation(calc: OfflineCalculation): Promise<void> {
  await put('calculations', calc)
}

export async function getCalculationsForProject(projectId: string): Promise<OfflineCalculation[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('calculations', 'readonly')
    const store = transaction.objectStore('calculations')
    const index = store.index('by_project')
    const req = index.getAll(projectId)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    transaction.oncomplete = () => db.close()
  })
}

export async function getUnsyncedCalculations(): Promise<OfflineCalculation[]> {
  const all = await getAll<OfflineCalculation>('calculations')
  return all.filter((c) => !c.synced)
}

export async function markCalculationSynced(id: string, serverId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('calculations', 'readwrite')
    const store = transaction.objectStore('calculations')
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const calc = getReq.result as OfflineCalculation | undefined
      if (calc) {
        calc.synced = true
        calc.server_id = serverId
        store.put(calc)
      }
    }
    transaction.oncomplete = () => { db.close(); resolve() }
    transaction.onerror = () => { db.close(); reject(transaction.error) }
  })
}

// ── Sync queue ───────────────────────────────────────────────────────────────

export async function enqueueSyncItem(item: SyncQueueItem): Promise<void> {
  await put('sync_queue', item)
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return getAll<SyncQueueItem>('sync_queue')
}

export async function removeSyncItem(id: string): Promise<void> {
  await del('sync_queue', id)
}

// ── Clear ────────────────────────────────────────────────────────────────────

export async function clearOfflineData(): Promise<void> {
  const db = await openDB()
  const transaction = db.transaction(['projects', 'calculations', 'sync_queue'], 'readwrite')
  transaction.objectStore('projects').clear()
  transaction.objectStore('calculations').clear()
  transaction.objectStore('sync_queue').clear()
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => { db.close(); resolve() }
    transaction.onerror = () => { db.close(); reject(transaction.error) }
  })
}
