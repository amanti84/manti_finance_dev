/**
 * src/utils/config.ts
 * Utility per la gestione e validazione delle variabili d'ambiente Firebase.
 * Progetto target: mantifinance
 */

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

/**
 * Valida e restituisce la configurazione Firebase dalle variabili d'ambiente.
 * Lancia un errore se mancano variabili obbligatorie.
 *
 * @param env Oggetto contenente le variabili d'ambiente (default: import.meta.env)
 */
export function getFirebaseConfig(env: Record<string, string | undefined> = import.meta.env): FirebaseConfig {
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }

  const missingKeys = Object.entries(config)
    .filter(([_, value]) => !value)
    .map(([key]) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}`)

  if (missingKeys.length > 0) {
    throw new Error(`Mancano le seguenti variabili d'ambiente Firebase: ${missingKeys.join(', ')}`)
  }

  return config as FirebaseConfig
}
