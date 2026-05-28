import { describe, it, expect, vi, beforeEach } from 'vitest'
import { simulateScenario, saveScenario } from './whatIf'
import * as mutuoService from './mutuo'
import * as snapshotService from './snapshot'
import * as payrollService from './payroll'
import { logAudit } from './audit'
import * as firestore from 'firebase/firestore'
import type { PatrimonioSnapshot, Payslip, ScenarioType } from '../types'
import type { Timestamp } from 'firebase/firestore'

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

const fakeTimestamp = { toDate: () => new Date() } as unknown as Timestamp

const makeSnapshot = (patrimonioNetto: number): PatrimonioSnapshot => ({
  id: 'snap-1',
  patrimonioNetto,
  year: 2026,
  month: 5,
  contiCorrenti: 0,
  investimenti: 0,
  immobili: 0,
  fondoPensione: 0,
  tfr: 0,
  mutuo: 0,
  altriDebiti: 0,
  createdAt: fakeTimestamp,
  updatedAt: fakeTimestamp,
})

const makeMutuoConfig = () => ({
  success: true as const,
  data: {
    rataMensile: 500,
    importoOriginale: 100000,
    debitoResiduo: 80000,
    tasso: 2,
    isMutuoVariabile: false,
    dataInizio: fakeTimestamp,
    dataFine: fakeTimestamp,
  },
})

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

      vi.spyOn(snapshotService, 'listSnapshots').mockResolvedValue([makeSnapshot(50000)])
      vi.spyOn(mutuoService, 'getMutuoConfig').mockResolvedValue(makeMutuoConfig())
      vi.spyOn(mutuoService, 'simulateAnticipatedExtinction').mockReturnValue({
        success: true,
        data: { interessiRisparmiati: 5000 } as ReturnType<typeof mutuoService.simulateAnticipatedExtinction>['data'] & object,
      })

      const result = await simulateScenario(uid, input)

      expect(result.success).toBe(true)
      expect(result.data?.risparmioInteressi).toBe(625)
      expect(result.data?.surplusMensileProiettato).toBe(63)
      expect(result.data?.patrimonioProiettato).toBe(54375)
    })

    it('should simulate INVESTIMENTO_ETF correctly', async () => {
      const uid = 'user123'
      const input = {
        type: 'INVESTIMENTO_ETF' as const,
        params: { importoInvestimento: 10000, anni: 10, rendimentoAnnuo: 7 },
      }

      vi.spyOn(snapshotService, 'listSnapshots').mockResolvedValue([makeSnapshot(50000)])

      const result = await simulateScenario(uid, input)

      expect(result.success).toBe(true)
      expect(result.data?.patrimonioProiettato).toBeCloseTo(59672, -1)
    })

    it('should simulate AUMENTO_PAC correctly', async () => {
      const uid = 'user123'
      const input = {
        type: 'AUMENTO_PAC' as const,
        params: { incrementoMensile: 200, anni: 5 },
      }

      vi.spyOn(snapshotService, 'listSnapshots').mockResolvedValue([makeSnapshot(50000)])

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

      vi.spyOn(snapshotService, 'listSnapshots').mockResolvedValue([makeSnapshot(50000)])
      vi.spyOn(payrollService, 'getPayslipsByYear').mockResolvedValue({
        success: true,
        data: [{ netSalary: 2000 }] as Payslip[],
      })

      const result = await simulateScenario(uid, input)

      expect(result.success).toBe(true)
      expect(result.data?.surplusMensileProiettato).toBe(167)
    })

    it('should return error for unsupported scenario type', async () => {
      const uid = 'user123'
      const input = {
        type: 'INVALID' as unknown as ScenarioType,
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

      vi.spyOn(snapshotService, 'listSnapshots').mockResolvedValue([makeSnapshot(50000)])

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

      await expect(
        saveScenario(uid, name, input, output, baselineId)
      ).resolves.toMatchObject({ success: true })

      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'create',
        entityType: 'scenario',
        newValue: expect.objectContaining({ name }),
      }))
    })
  })
})
