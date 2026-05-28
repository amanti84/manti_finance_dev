import { describe, it, expect, vi, beforeEach } from 'vitest'
import { simulateScenario, saveScenario } from './whatIf'
import * as mutuoService from './mutuo'
import * as snapshotService from './snapshot'
import * as payrollService from './payroll'
import { logAudit } from './audit'
import * as firestore from 'firebase/firestore'

vi.mock('./audit', () => ({
  logAudit: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-id' })),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  deleteDoc: vi.fn(() => Promise.resolve()),
  query: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() })),
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
  },
  serverTimestamp: vi.fn(),
}))

vi.mock('../firebase', () => ({
  db: {},
}))

describe('whatIf service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('simulateScenario', () => {
    it('should simulate ESTINZIONE_MUTUO correctly', async () => {
      const uid = 'user123'
      const input = {
        type: 'ESTINZIONE_MUTUO' as const,
        params: { importoEstinzione: 10000 },
      }

      vi.spyOn(snapshotService, 'listSnapshots').mockResolvedValue([
        { patrimonioNetto: 50000 } as any,
      ])
      vi.spyOn(mutuoService, 'getMutuoConfig').mockResolvedValue({
        success: true,
        data: { rataMensile: 500, importoOriginale: 100000, debitoResiduo: 80000, tasso: 2, dataInizio: { toDate: () => new Date() }, dataFine: { toDate: () => new Date() } } as any,
      })
      vi.spyOn(mutuoService, 'simulateAnticipatedExtinction').mockReturnValue({
        success: true,
        data: { interessiRisparmiati: 5000 } as any,
      })

      const result = await simulateScenario(uid, input)

      expect(result.success).toBe(true)
      // quotaEstinta = 10000 / 80000 = 0.125
      // risparmioInteressi = 5000 * 0.125 = 625
      // nuovoSurplus = 500 * 0.125 = 62.5 -> Math.round -> 63
      expect(result.data?.risparmioInteressi).toBe(625)
      expect(result.data?.surplusMensileProiettato).toBe(63)
      // patrimonioAttuale (50000) + risparmioInteressi (625) + (nuovoSurplus (62.5) * 12 * 5) = 50000 + 625 + 3750 = 54375
      expect(result.data?.patrimonioProiettato).toBe(54375)
    })

    it('should simulate INVESTIMENTO_ETF correctly', async () => {
      const uid = 'user123'
      const input = {
        type: 'INVESTIMENTO_ETF' as const,
        params: { importoInvestimento: 10000, anni: 10, rendimentoAnnuo: 7 },
      }

      vi.spyOn(snapshotService, 'listSnapshots').mockResolvedValue([
        { patrimonioNetto: 50000 } as any,
      ])

      const result = await simulateScenario(uid, input)

      expect(result.success).toBe(true)
      // montante = 10000 * (1.07^10) ≈ 19671.5
      // patrimonioProiettato = 50000 - 10000 + 19672 = 59672
      expect(result.data?.patrimonioProiettato).toBeCloseTo(59672, -1)
    })

    it('should simulate AUMENTO_PAC correctly', async () => {
      const uid = 'user123'
      const input = {
        type: 'AUMENTO_PAC' as const,
        params: { incrementoMensile: 200, anni: 5 },
      }

      vi.spyOn(snapshotService, 'listSnapshots').mockResolvedValue([
        { patrimonioNetto: 50000 } as any,
      ])

      const result = await simulateScenario(uid, input)

      expect(result.success).toBe(true)
      expect(result.data?.surplusMensileProiettato).toBe(-200)
      expect(result.data?.patrimonioProiettato).toBeGreaterThan(50000)
    })

    it('should simulate VARIAZIONE_RAL correctly', async () => {
      const uid = 'user123'
      const input = {
        type: 'VARIAZIONE_RAL' as const,
        params: { nuovaRal: 40000 },
      }

      vi.spyOn(snapshotService, 'listSnapshots').mockResolvedValue([
        { patrimonioNetto: 50000 } as any,
      ])
      vi.spyOn(payrollService, 'getPayslipsByYear').mockResolvedValue({
        success: true,
        data: [{ netSalary: 2000 }] as any,
      })

      const result = await simulateScenario(uid, input)

      expect(result.success).toBe(true)
      // nuovoNettoMensile = (40000 * 0.65) / 12 = 2166.67
      // deltaNetto = 2166.67 - 2000 = 166.67
      expect(result.data?.surplusMensileProiettato).toBe(167)
    })

    it('should return error for unsupported scenario type', async () => {
      const uid = 'user123'
      const input = {
        type: 'INVALID' as any,
        params: {},
      }

      const result = await simulateScenario(uid, input)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Tipo scenario non supportato')
    })

    it('should NOT perform any Firestore writes during simulation', async () => {
      const uid = 'user123'
      const input = {
        type: 'INVESTIMENTO_ETF' as const,
        params: { importoInvestimento: 10000, anni: 10, rendimentoAnnuo: 7 },
      }

      vi.spyOn(snapshotService, 'listSnapshots').mockResolvedValue([
        { patrimonioNetto: 50000 } as any,
      ])

      await simulateScenario(uid, input)

      expect(firestore.addDoc).not.toHaveBeenCalled()
      expect(firestore.setDoc).not.toHaveBeenCalled()
      expect(firestore.updateDoc).not.toHaveBeenCalled()
      expect(firestore.deleteDoc).not.toHaveBeenCalled()
    })
  })

  describe('saveScenario', () => {
    it('should save scenario and log audit', async () => {
      const uid = 'user123'
      const name = 'Test Scenario'
      const input = { type: 'INVESTIMENTO_ETF' as const, params: { importoInvestimento: 1000 } }
      const output = { patrimonioProiettato: 60000, surplusMensileProiettato: 0, costoOpportunita: 100, descrizione: 'Test' }
      const baselineId = '2026-05'

      const result = await saveScenario(uid, name, input, output, baselineId)

      expect(result.success).toBe(true)
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'create',
        entityType: 'scenario',
        newValue: expect.objectContaining({ name }),
      }))
    })
  })
})
