/**
 * firebase.ts
 * Inizializzazione Firebase App e servizi (Firestore, Auth, Storage)
 * Configurazione caricata da variabili d'ambiente Vite via utility di validazione
 */
import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth, GoogleAuthProvider } from 'firebase/auth'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { getFirebaseConfig } from './utils/config'

// Ottieni e valida la configurazione
const firebaseConfig = getFirebaseConfig() as unknown as FirebaseOptions

// Evita re-inizializzazione in hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const db: Firestore = getFirestore(app)
export const auth: Auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
export const storage: FirebaseStorage = getStorage(app)
export default app
