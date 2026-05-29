import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from './useAuth'
import { signInWithPopup, signOut, onAuthStateChanged, type User, type UserCredential } from 'firebase/auth'
import { auth } from '../firebase'

// Mock Firebase
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(() => vi.fn()),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({
    setCustomParameters: vi.fn(),
  })),
}))

vi.mock('../firebase', () => ({
  auth: {
    currentUser: null,
  },
  googleProvider: {},
}))

describe('useAuth — Google Sign-In', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_ALLOWED_EMAILS', 'allowed@gmail.com,wife@gmail.com')
  })

  it('should sign in successfully if email is in ALLOWED_EMAILS', async () => {
    vi.mocked(signInWithPopup).mockResolvedValueOnce({
      user: { email: 'allowed@gmail.com' } as unknown as User,
    } as unknown as UserCredential)

    const { result } = renderHook(() => useAuth())

    let loginResult: { success: boolean; error?: string } | undefined
    await act(async () => {
      loginResult = await result.current.signInWithGoogle()
    })

    if (!loginResult) throw new Error('loginResult is undefined')
    expect(loginResult.success).toBe(true)
    expect(signInWithPopup).toHaveBeenCalledWith(auth, expect.anything())
    expect(signOut).not.toHaveBeenCalled()
  })

  it('should sign out and return unauthorized error if email not in whitelist', async () => {
    vi.mocked(signInWithPopup).mockResolvedValueOnce({
      user: { email: 'hacker@gmail.com' } as unknown as User,
    } as unknown as UserCredential)

    const { result } = renderHook(() => useAuth())

    let loginResult: { success: boolean; error?: string } | undefined
    await act(async () => {
      loginResult = await result.current.signInWithGoogle()
    })

    if (!loginResult) throw new Error('loginResult is undefined')
    expect(loginResult.success).toBe(false)
    expect(loginResult.error).toBe('unauthorized')
    expect(signOut).toHaveBeenCalledWith(auth)
  })

  it('should return error message on Firebase signInWithPopup failure', async () => {
    vi.mocked(signInWithPopup).mockRejectedValueOnce(new Error('Firebase Error'))

    const { result } = renderHook(() => useAuth())

    let loginResult: { success: boolean; error?: string } | undefined
    await act(async () => {
      loginResult = await result.current.signInWithGoogle()
    })

    if (!loginResult) throw new Error('loginResult is undefined')
    expect(loginResult.success).toBe(false)
    expect(loginResult.error).toBe('Firebase Error')
  })

  it('should call signOut on logout', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.logout()
    })

    expect(signOut).toHaveBeenCalledWith(auth)
  })

  it('should update user state when auth state changes', () => {
    let authCallback: ((user: User | null) => void) | undefined
    vi.mocked(onAuthStateChanged).mockImplementationOnce((_auth, callback) => {
      authCallback = callback as (user: User | null) => void
      return vi.fn()
    })

    const { result } = renderHook(() => useAuth())

    // Initial state
    expect(result.current.loading).toBe(true)

    // Simulate auth state change
    const mockUser = { uid: '123', email: 'allowed@gmail.com' } as unknown as User
    act(() => {
      if (authCallback) {
        authCallback(mockUser)
      }
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.loading).toBe(false)
  })
})
