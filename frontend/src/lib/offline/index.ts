export {
  saveProjects,
  getOfflineProjects,
  saveCalculation,
  getCalculationsForProject,
  getUnsyncedCalculations,
  markCalculationSynced,
  enqueueSyncItem,
  getSyncQueue,
  removeSyncItem,
  clearOfflineData,
} from './db'

export type {
  OfflineProject,
  OfflineCalculation,
  SyncQueueItem,
} from './db'

export {
  syncAll,
  onSyncStatus,
  registerAutoSync,
} from './sync-service'

export type { SyncStatus } from './sync-service'

export {
  useOnlineStatus,
  useSyncStatus,
  useOfflineCalculation,
} from './use-offline'

export { useNetworkStatus } from './capacitor-network'
export type { NetworkStatus, ConnectionType } from './capacitor-network'
