/**
 * Network detection using Capacitor Network plugin.
 *
 * Falls back to navigator.onLine when running in browser (PWA).
 * The Capacitor plugin provides more reliable detection on native
 * (e.g., distinguishes WiFi vs cellular, detects captive portals).
 */

'use client'

import { useEffect, useState } from 'react'

let Network: typeof import('@capacitor/network').Network | null = null

// Dynamic import — only loads on native (won't fail in browser)
async function loadNetworkPlugin() {
  try {
    const mod = await import('@capacitor/network')
    Network = mod.Network
  } catch {
    // Not available (running as PWA in browser)
  }
}

export type ConnectionType = 'wifi' | 'cellular' | 'none' | 'unknown'

export interface NetworkStatus {
  connected: boolean
  connectionType: ConnectionType
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
  })

  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null

    async function init() {
      await loadNetworkPlugin()

      if (Network) {
        // Native: use Capacitor plugin
        const current = await Network.getStatus()
        setStatus({
          connected: current.connected,
          connectionType: current.connectionType as ConnectionType,
        })

        listenerHandle = await Network.addListener('networkStatusChange', (s) => {
          setStatus({
            connected: s.connected,
            connectionType: s.connectionType as ConnectionType,
          })
        })
      } else {
        // Browser: use navigator events
        const onOn = () => setStatus((prev) => ({ ...prev, connected: true }))
        const onOff = () => setStatus((prev) => ({ ...prev, connected: false }))
        window.addEventListener('online', onOn)
        window.addEventListener('offline', onOff)

        return () => {
          window.removeEventListener('online', onOn)
          window.removeEventListener('offline', onOff)
        }
      }
    }

    init()

    return () => {
      listenerHandle?.remove()
    }
  }, [])

  return status
}
