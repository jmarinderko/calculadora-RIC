import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'cl.ricconductor.app',
  appName: 'RIC Conductor',
  webDir: 'out',
  server: {
    // En desarrollo, apuntar al servidor Next.js local
    // 10.0.2.2 = alias del emulador Android para acceder al localhost del host
    // Para dispositivo físico: reemplazar por la IP LAN del PC (ej: 192.168.1.20)
    ...(process.env.NODE_ENV === 'development' && {
      url: 'http://10.0.2.2:3000',
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
