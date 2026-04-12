import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'cl.ricconductor.app',
  appName: 'RIC Conductor',
  webDir: 'out',
  server: {
    // En desarrollo, apuntar al servidor Next.js local
    ...(process.env.NODE_ENV === 'development' && {
      url: 'http://localhost:3001',
      cleartext: true,
    }),
  },
  plugins: {
    // Capacitor Preferences (secure key-value storage)
    Preferences: {
      // Usa almacenamiento seguro del SO (Keychain iOS / EncryptedSharedPreferences Android)
    },
  },
  // Configuración iOS
  ios: {
    scheme: 'RIC Conductor',
    contentInset: 'automatic',
  },
  // Configuración Android
  android: {
    allowMixedContent: false,
    backgroundColor: '#0d1117',
  },
}

export default config
