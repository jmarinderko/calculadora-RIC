/**
 * Badge indicador de modo offline y estado de sincronización.
 *
 * Muestra un indicador flotante cuando el usuario está sin conexión
 * o hay cálculos pendientes de sincronizar.
 */

'use client'

import { useOnlineStatus, useSyncStatus } from '@/lib/offline'

export function OfflineBadge() {
  const online = useOnlineStatus()
  const { syncing, pending, triggerSync } = useSyncStatus()

  // Nada que mostrar si está online y sin pendientes
  if (online && pending === 0 && !syncing) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'flex-end',
      }}
    >
      {/* Badge offline */}
      {!online && (
        <div
          style={{
            background: '#dc2626',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#fca5a5',
              display: 'inline-block',
            }}
          />
          Sin conexion — modo offline
        </div>
      )}

      {/* Badge de sync pendiente */}
      {pending > 0 && (
        <button
          onClick={online ? triggerSync : undefined}
          disabled={!online || syncing}
          style={{
            background: syncing ? '#2563eb' : '#f59e0b',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            border: 'none',
            cursor: online && !syncing ? 'pointer' : 'default',
            opacity: syncing ? 0.8 : 1,
          }}
        >
          {syncing
            ? `Sincronizando... (${pending})`
            : `${pending} calculo${pending > 1 ? 's' : ''} pendiente${pending > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}
