/**
 * useAuth.ts
 * Hook React per gestione autenticazione Firebase
 */
import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

export interface UseAuthReturn {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS as string || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())

    try {
      const result = await signInWithPopup(auth, googleProvider)
      const email = result.user.email?.toLowerCase() ?? ''
      if (!ALLOWED_EMAILS.includes(email)) {
        await signOut(auth)
        return { success: false, error: 'unauthorized' }
      }
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  const logout = async () => {
    await signOut(auth)
  }

  return { user, loading, signInWithGoogle, logout }
}
