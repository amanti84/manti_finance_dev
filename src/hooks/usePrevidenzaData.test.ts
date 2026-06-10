/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePrevidenzaData } from './usePrevidenzaData'
import * as previdenzaService from '../services/previdenza'
import * as payrollService from '../services/payroll'
import * as authHook from './useAuth'

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
  auth: {},
  storage: {},
}))

vi.mock('../services/previdenza')
vi.mock('../services/payroll')
vi.mock('./useAuth')

describe('usePrevidenzaData', () => {
  const mockUser = { uid: 'user123' }
  const mockConfig = {
    id: 'config',
    birthYear: 1990,
    inpsStartYear: 2015,
    currentRal: 50000,
    expectedReturnPct: 4,
    retirementAgeTarget: 67
  }
  const mockFunds = [
    { id: 'fund1', nome: 'Fondo A', saldoAttuale: 10000, contribuzioneAnnua: 2000, tipologia: 'chiuso', codice: 'FA' }
  ]
  const mockContributions = [
    { id: 'c1', fundId: 'fund1', amount: 500, year: 2025, month: 1, type: 'volontario', totale: 500 }
  ]
  const mockPayslips = [
    { id: 'p1', year: 2025, month: 1, grossSalary: 4000, netSalary: 2800, tfr: 300, fondoPensione: 100 }
  ]
  const mockBaseline = {
    id: 'baseline',
    tfrAccumulato: 15000,
    montanteFondoPensione: 5000,
    anniContributiINPS: 10,
    annoInizioLavoro: 2014
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authHook.useAuth).mockReturnValue({ user: mockUser } as any)
  })

  it('should fetch all data correctly (happy path)', async () => {
    vi.mocked(previdenzaService.getPrevidenzaConfig).mockResolvedValue({ success: true, data: mockConfig } as any)
    vi.mocked(previdenzaService.getPrevidenzaBaseline).mockResolvedValue({ success: true, data: mockBaseline } as any)
    vi.mocked(previdenzaService.getAllPensionFunds).mockResolvedValue({ success: true, data: mockFunds } as any)
    vi.mocked(previdenzaService.getContributionsByFund).mockResolvedValue({ success: true, data: mockContributions } as any)
    vi.mocked(payrollService.getPayslips).mockResolvedValue({ success: true, data: mockPayslips } as any)

    // Mocking calculation results
    vi.mocked(previdenzaService.calculateTFRFromPayslips).mockReturnValue({ success: true, data: { annoCompetenza: 2025, totale: 300 } } as any)
    vi.mocked(previdenzaService.calculateTFRCumulativo).mockReturnValue({ success: true, data: [{ annoCompetenza: 2025, totale: 300 }] } as any)
    vi.mocked(previdenzaService.calculatePensionProjection).mockReturnValue({ success: true, data: { montanteProiettato: 500000 } } as any)
    vi.mocked(previdenzaService.compareTFRAziendaVsFondo).mockReturnValue({ success: true, data: { differenza: 5000 } } as any)

    const { result } = renderHook(() => usePrevidenzaData())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.config).toEqual(mockConfig)
    expect(result.current.baseline).toEqual(mockBaseline)
    expect(result.current.funds).toEqual(mockFunds)
    expect(result.current.tfrHistory.length).toBeGreaterThan(0)
    expect(result.current.pensionProjection).not.toBeNull()
  })

  it('should handle missing configuration (edge case)', async () => {
    vi.mocked(previdenzaService.getPrevidenzaConfig).mockResolvedValue({ success: false, error: 'Not found' } as any)
    vi.mocked(previdenzaService.getPrevidenzaBaseline).mockResolvedValue({ success: true, data: null } as any)
    vi.mocked(previdenzaService.getAllPensionFunds).mockResolvedValue({ success: true, data: [] } as any)
    vi.mocked(payrollService.getPayslips).mockResolvedValue({ success: true, data: [] } as any)

    const { result } = renderHook(() => usePrevidenzaData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.config).toBeNull()
    expect(result.current.pensionProjection).toBeNull()
  })

  it('should handle errors during fetch', async () => {
    vi.mocked(previdenzaService.getPrevidenzaConfig).mockResolvedValue({ success: true, data: mockConfig } as any)
    vi.mocked(previdenzaService.getPrevidenzaBaseline).mockResolvedValue({ success: true, data: null } as any)
    vi.mocked(previdenzaService.getAllPensionFunds).mockResolvedValue({ success: false, error: 'Database error' } as any)
    vi.mocked(payrollService.getPayslips).mockResolvedValue({ success: true, data: [] } as any)

    const { result } = renderHook(() => usePrevidenzaData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Database error')
  })
})
