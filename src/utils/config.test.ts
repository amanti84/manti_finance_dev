import { describe, it, expect } from 'vitest'
import { getFirebaseConfig } from './config'

describe('getFirebaseConfig', () => {
  it('should return the config when all variables are present (happy path)', () => {
    const mockEnv = {
      VITE_FIREBASE_API_KEY: 'test-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'test-auth-domain',
      VITE_FIREBASE_PROJECT_ID: 'test-project-id',
      VITE_FIREBASE_STORAGE_BUCKET: 'test-storage-bucket',
      VITE_FIREBASE_MESSAGING_SENDER_ID: 'test-sender-id',
      VITE_FIREBASE_APP_ID: 'test-app-id',
    }

    const config = getFirebaseConfig(mockEnv)

    expect(config).toEqual({
      apiKey: 'test-api-key',
      authDomain: 'test-auth-domain',
      projectId: 'test-project-id',
      storageBucket: 'test-storage-bucket',
      messagingSenderId: 'test-sender-id',
      appId: 'test-app-id',
    })
  })

  it('should throw an error when mandatory variables are missing (error path)', () => {
    const mockEnv = {
      VITE_FIREBASE_API_KEY: 'test-api-key',
      // missing VITE_FIREBASE_PROJECT_ID
    }

    expect(() => getFirebaseConfig(mockEnv)).toThrow(/Mancano le seguenti variabili d'ambiente Firebase/)
    expect(() => getFirebaseConfig(mockEnv)).toThrow(/VITE_FIREBASE_PROJECT_ID/)
  })

  it('should throw an error when all mandatory variables are missing (edge case)', () => {
    expect(() => getFirebaseConfig({})).toThrow(/Mancano le seguenti variabili d'ambiente Firebase/)
    expect(() => getFirebaseConfig({})).toThrow(/VITE_FIREBASE_API_KEY/)
    expect(() => getFirebaseConfig({})).toThrow(/VITE_FIREBASE_APP_ID/)
  })
})
