/**
 * React hooks para funcionalidad offline.
 *
 * - useOnlineStatus: detecta si hay conexión
 * - useOfflineCalculation: ejecuta cálculos vía TS engine cuando offline
 * - useSyncStatus: monitorea el estado de sincronización
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { calculate } from '@/lib/engine'
import type { CalculatorInput as EngineInput } from '@/lib/engine/types'
import { saveCalculation, type OfflineCalculation } from './db'
import { syncAll, onSyncStatus, registerAutoSync, type SyncStatus } from './sync-service'

// ── useOnlineStatus ─────────────────────────────────────────────────────────

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const onOn = () => setOnline(true)
    const onOff = () => setOnline(false)
    window.addEventListener('online', onOn)
    window.addEventListener('offline', onOff)
    return () => {
      window.removeEventListener('online', onOn)
      window.removeEventListener('offline', onOff)
    }
  }, [])

  return online
}

// ── useSyncStatus ───────────────────────────────────────────────────────────

export function useSyncStatus(): SyncStatus & { triggerSync: () => void } {
  const [status, setStatus] = useState<SyncStatus>({
    syncing: false,
    pending: 0,
  })

  useEffect(() => {
    const unsubscribe = onSyncStatus(setStatus)
    const unregister = registerAutoSync()
    return () => {
      unsubscribe()
      unregister()
    }
  }, [])

  const triggerSync = useCallback(() => {
    syncAll()
  }, [])

  return { ...status, triggerSync }
}

// ── useOfflineCalculation ───────────────────────────────────────────────────

interface OfflineCalcResult {
  calculateOffline: (
    input: EngineInput,
    projectId: string,
    name?: string,
  ) => Promise<OfflineCalculation>
}

export function useOfflineCalculation(): OfflineCalcResult {
  const calculateOffline = useCallback(
    async (
      input: EngineInput,
      projectId: string,
      name?: string,
    ): Promise<OfflineCalculation> => {
      // Run the TS engine locally
      const response = calculate(input)
      const result = response.resultado

      const calc: OfflineCalculation = {
        id: crypto.randomUUID(),
        project_id: projectId,
        name,
        input_data: input as unknown as Record<string, unknown>,
        result_data: result as unknown as Record<string, unknown>,
        sistema: input.sistema,
        tension_v: input.tension_v,
        potencia_kw: input.potencia_kw,
        seccion_mm2: result.seccion_mm2,
        cumple_ric: result.cumple,
        created_at: new Date().toISOString(),
        synced: false,
      }

      await saveCalculation(calc)
      return calc
    },
    [],
  )

  return { calculateOffline }
}
