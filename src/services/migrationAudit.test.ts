import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMigrationAuditReport } from './migrationAudit'
import { httpsCallable, type HttpsCallable } from 'firebase/functions'

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
  getFunctions: vi.fn(),
}))

vi.mock('../firebase', () => ({
  functions: {},
}))

describe('migrationAudit service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success and data when Cloud Function succeeds', async () => {
    const mockReport = { overallPassed: true }
    const mockHttpsCallable = vi.fn().mockResolvedValue({
      data: { success: true, data: mockReport }
    })
    vi.mocked(httpsCallable).mockReturnValue(mockHttpsCallable as unknown as HttpsCallable<unknown, unknown>)

    const result = await getMigrationAuditReport('test-uid')

    expect(result.success).toBe(true)
    expect(result.data).toEqual(mockReport)
    expect(mockHttpsCallable).toHaveBeenCalledWith({ targetUid: 'test-uid' })
  })

  it('returns error when Cloud Function returns success: false', async () => {
    const mockHttpsCallable = vi.fn().mockResolvedValue({
      data: { success: false }
    })
    vi.mocked(httpsCallable).mockReturnValue(mockHttpsCallable as unknown as HttpsCallable<unknown, unknown>)

    const result = await getMigrationAuditReport()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Errore durante il recupero del report di audit')
  })

  it('returns error when Cloud Function throws', async () => {
    const mockHttpsCallable = vi.fn().mockRejectedValue(new Error('Network Error'))
    vi.mocked(httpsCallable).mockReturnValue(mockHttpsCallable as unknown as HttpsCallable<unknown, unknown>)

    const result = await getMigrationAuditReport()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Network Error')
  })
})
