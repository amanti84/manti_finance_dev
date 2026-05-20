/**
 * firebase.ts
 * Inizializzazione Firebase App e servizi (Firestore, Auth, Storage)
 * Configurazione caricata da variabili d'ambiente Vite
 */
import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
}

// Evita re-inizializzazione in hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const db: Firestore = getFirestore(app)
export const auth: Auth = getAuth(app)
export const storage: FirebaseStorage = getStorage(app)
export default app
