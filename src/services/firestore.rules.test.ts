import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'

const PROJECT_ID = 'demo-manti-finance-dev'

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()
  })

  const getUnauthenticatedContext = () => testEnv.unauthenticatedContext()
  const getAuthenticatedContext = (userId: string) => testEnv.authenticatedContext(userId)

  describe('User isolation', () => {
    it('should deny unauthenticated read/write to any user document', async () => {
      const db = getUnauthenticatedContext().firestore()
      const docRef = doc(db, 'users/user123')
      await assertFails(getDoc(docRef))
      await assertFails(setDoc(docRef, { email: 'test@example.com' }))
    })

    it('should allow user to read/write their own root document', async () => {
      const db = getAuthenticatedContext('user123').firestore()
      const docRef = doc(db, 'users/user123')
      await assertSucceeds(setDoc(docRef, { email: 'user123@example.com' }))
      await assertSucceeds(getDoc(docRef))
    })

    it('should deny user from reading/writing another user root document', async () => {
      const db = getAuthenticatedContext('user123').firestore()
      const docRef = doc(db, 'users/otherUser')
      await assertFails(getDoc(docRef))
      await assertFails(setDoc(docRef, { email: 'hacker@example.com' }))
    })
  })

  describe('Sub-collections protection', () => {
    const collections = [
      'snapshots',
      'transactions',
      'investments',
      'pac_payments',
      'payslips',
      'pacs',
      'config',
      'decisions',
      'funds',
      'contributions',
    ]

    collections.forEach((col) => {
      it(`should deny another user from accessing ${col}`, async () => {
        const db = getAuthenticatedContext('user123').firestore()
        const docRef = doc(db, `users/otherUser/${col}/doc123`)
        await assertFails(getDoc(docRef))
        await assertFails(setDoc(docRef, { data: 'secret' }))
      })

      it(`should allow owner to access ${col}`, async () => {
        const db = getAuthenticatedContext('user123').firestore()
        const docRef = doc(db, `users/user123/${col}/doc123`)

        // config doesn't require hasValidTimestamp helper in current rules (allow read, write: if isOwner(userId))
        const data = col === 'config' ? { theme: 'dark' } : { updatedAt: serverTimestamp(), amount: 100 }

        await assertSucceeds(setDoc(docRef, data))
        await assertSucceeds(getDoc(docRef))
      })
    })
  })

  describe('Audit Log Immutability', () => {
    it('should allow owner to create an audit log', async () => {
      const db = getAuthenticatedContext('user123').firestore()
      const docRef = doc(db, 'users/user123/audit/log123')
      await assertSucceeds(setDoc(docRef, { action: 'test', createdAt: serverTimestamp() }))
    })

    it('should deny update or delete of an audit log', async () => {
      const db = getAuthenticatedContext('user123').firestore()
      const docRef = doc(db, 'users/user123/audit/log123')

      // Setup: creation must happen as owner (or admin context, but here we use owner)
      await assertSucceeds(setDoc(docRef, { action: 'test', createdAt: serverTimestamp() }))

      // Try update
      await assertFails(updateDoc(docRef, { action: 'changed' }))

      // Try delete
      await assertFails(deleteDoc(docRef))
    })
  })
})
