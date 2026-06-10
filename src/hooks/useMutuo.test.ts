
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
  auth: {},
  storage: {},
  default: {},
}))

import { renderHook, waitFor } from '@testing-library/react'
import { useMutuo } from './useMutuo'
import * as mutuoService from '../services/mutuo'
import * as authHook from './useAuth'
import type { UseAuthReturn } from './useAuth'
import type { MutuoConfig } from '../types'
import { Timestamp } from 'firebase/firestore'
import type { PianoAmmortamento, MutuoSummary } from '../services/mutuo'

vi.mock('../services/mutuo')
vi.mock('./useAuth')

describe('useMutuo', () => {
  const mockUser = { uid: 'user123' }
  const mockConfig: MutuoConfig = {
    importoOriginale: 200000,
    debitoResiduo: 150000,
    rataMensile: 1000,
    tasso: 2.5,
    dataInizio: Timestamp.fromDate(new Date('2020-01-01')),
    dataFine: Timestamp.fromDate(new Date('2040-01-01')),
    isMutuoVariabile: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authHook.useAuth).mockReturnValue({ user: mockUser } as unknown as UseAuthReturn)
  })

  it('should fetch mutuo config on mount (happy path)', async () => {
    vi.mocked(mutuoService.getMutuoConfig).mockResolvedValue({
      success: true,
      data: mockConfig
    })

    vi.mocked(mutuoService.getPianoAmmortamento).mockReturnValue({
      success: true,
      data: { rate: [], config: mockConfig } as unknown as PianoAmmortamento
    })

    vi.mocked(mutuoService.getMutuoSummary).mockReturnValue({
      success: true,
      data: { debitoResiduo: 150000 } as unknown as MutuoSummary
    })

    const { result } = renderHook(() => useMutuo())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.config).toEqual(mockConfig)
    expect(mutuoService.getMutuoConfig).toHaveBeenCalledWith('user123')
  })

  it('should handle missing config (edge case)', async () => {
    vi.mocked(mutuoService.getMutuoConfig).mockResolvedValue({
      success: false,
      error: 'Configurazione mutuo non trovata'
    })

    const { result } = renderHook(() => useMutuo())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.config).toBeNull()
    expect(result.current.error).toBeNull() // We decided not to show this as error
  })

  it('should handle generic fetch errors (error handling)', async () => {
    vi.mocked(mutuoService.getMutuoConfig).mockResolvedValue({
      success: false,
      error: 'Database connection failed'
    })

    const { result } = renderHook(() => useMutuo())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 15000 })

    expect(result.current.error).toContain('Database connection failed')
  })

  it('should call saveMutuoConfig and refresh', async () => {
    vi.mocked(mutuoService.getMutuoConfig).mockResolvedValue({
      success: true,
      data: mockConfig
    })
    vi.mocked(mutuoService.saveMutuoConfig).mockResolvedValue({
      success: true,
      data: undefined
    })

    const { result } = renderHook(() => useMutuo())

    await result.current.saveConfig(mockConfig)

    expect(mutuoService.saveMutuoConfig).toHaveBeenCalledWith('user123', mockConfig)
    expect(mutuoService.getMutuoConfig).toHaveBeenCalledTimes(2)
  })
})
