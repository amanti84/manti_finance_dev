/**
 * previdenza.test.ts
 * Test suite per Previdenza/TFR Service
 * Issue #14 — M2 Core Modules
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateTFRQuotaAnnuale,
  calculateTFRRivalutazione,
  calculateTFRFromPayslips,
  calculateTFRCumulativo,
  calculateFonteFromPayslips,
  checkDeducibilitaFonte,
  calculatePensionProjection,
  compareTFRAziendaVsFondo,
  createPensionFund,
  updatePensionFund,
  deletePensionFund,
  getPensionFund,
  getAllPensionFunds,
  recordContribution,
  getContributionsByFund,
} from './previdenza'
import type { Payslip, TFRData } from '../types'
import type { Timestamp } from 'firebase/firestore'

// -----------------------------------------------------------------------
// MOCK FIREBASE
// -----------------------------------------------------------------------
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: { now: vi.fn(() => ({ toDate: () => new Date() })) },
}))

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('./audit', () => ({ logAudit: vi.fn() }))

// -----------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------
const makeTimestamp = (d: Date): Timestamp =>
  ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0,
     toDate: () => d, toMillis: () => d.getTime(),
     isEqual: () => false }) as unknown as Timestamp

const makePayslip = (overrides: Partial<Payslip> = {}): Payslip => ({
  id: 'pay-001',
  year: 2025,
  month: 1,
  grossSalary: 4000,
  netSalary: 2800,
  irpef: 800,
  inps: 300,
  tfr: 296.30,
  fondoPensione: 80,
  bonus: 0,
  rimborsiSpese: 0,
  parsed: true,
  createdAt: makeTimestamp(new Date()),
  updatedAt: makeTimestamp(new Date()),
  ...overrides,
})

const makeAnnualPayslips = (year: number): Payslip[] => {
  return Array.from({ length: 12 }, (_, i) =>
    makePayslip({ id: `pay-${year}-${i + 1}`, year, month: (i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 })
  )
}

// -----------------------------------------------------------------------
// --- calculateTFRQuotaAnnuale ---
// -----------------------------------------------------------------------
describe('calculateTFRQuotaAnnuale', () => {
  it('calcola correttamente la quota TFR annuale (happy path)', () => {
    const retribuzioneAnnuale = 48000
    const expected = Math.round((48000 / 13.5) * 100) / 100
    expect(calculateTFRQuotaAnnuale(retribuzioneAnnuale)).toBe(expected)
    expect(calculateTFRQuotaAnnuale(retribuzioneAnnuale)).toBe(3555.56)
  })

  it('restituisce 0 per retribuzione negativa o zero', () => {
    expect(calculateTFRQuotaAnnuale(0)).toBe(0)
    expect(calculateTFRQuotaAnnuale(-1000)).toBe(0)
  })
})

// -----------------------------------------------------------------------
// --- calculateTFRRivalutazione ---
// -----------------------------------------------------------------------
describe('calculateTFRRivalutazione', () => {
  it('calcola la rivalutazione TFR correttamente (happy path)', () => {
    const tfrAccumulato = 10000
    const inflazione = 0.02
    const expected = Math.round(10000 * (0.015 + 0.75 * 0.02) * 100) / 100
    expect(calculateTFRRivalutazione(tfrAccumulato, inflazione)).toBe(expected)
  })

  it('restituisce 0 se TFR accumulato è 0 o negativo', () => {
    expect(calculateTFRRivalutazione(0, 0.02)).toBe(0)
    expect(calculateTFRRivalutazione(-5000, 0.02)).toBe(0)
  })
})

// -----------------------------------------------------------------------
// --- calculateTFRFromPayslips ---
// -----------------------------------------------------------------------
describe('calculateTFRFromPayslips', () => {
  it('calcola il TFR annuale dai cedolini (happy path)', () => {
    const payslips = makeAnnualPayslips(2025)
    const result = calculateTFRFromPayslips(payslips, 2025)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.annoCompetenza).toBe(2025)
      expect(result.data.quota).toBeGreaterThan(0)
    }
  })

  it('restituisce errore se nessun cedolino per l\'anno', () => {
    const payslips = makeAnnualPayslips(2024)
    const result = calculateTFRFromPayslips(payslips, 2025)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('2025')
    }
  })

  it('usa i valori TFR dai cedolini se presenti', () => {
    const payslips = makeAnnualPayslips(2025)
    const result = calculateTFRFromPayslips(payslips, 2025)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quota).toBe(Math.round(296.30 * 12 * 100) / 100)
    }
  })
})

// -----------------------------------------------------------------------
// --- calculateTFRCumulativo ---
// -----------------------------------------------------------------------
describe('calculateTFRCumulativo', () => {
  it('calcola il TFR cumulativo con rivalutazione (happy path)', () => {
    const annualData: TFRData[] = [
      { annoCompetenza: 2023, retribuzioneAnnuale: 48000, quota: 3555.56, rivalutazione: 0, totale: 3555.56 },
      { annoCompetenza: 2024, retribuzioneAnnuale: 49000, quota: 3629.63, rivalutazione: 0, totale: 0 },
    ]
    const inflazione = { 2023: 0.02, 2024: 0.015 }
    const result = calculateTFRCumulativo(annualData, inflazione)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.length).toBe(2)
      expect((result.data[1].totale ?? 0)).toBeGreaterThan((result.data[0].totale ?? 0))
      expect((result.data[1].rivalutazione ?? 0)).toBeGreaterThan(0)
    }
  })

  it('restituisce errore se array vuoto', () => {
    const result = calculateTFRCumulativo([], {})
    expect(result.success).toBe(false)
  })
})

// -----------------------------------------------------------------------
// --- calculateFonteFromPayslips ---
// -----------------------------------------------------------------------
describe('calculateFonteFromPayslips', () => {
  it('calcola i versamenti Fon.Te dai cedolini (happy path)', () => {
    const payslips = makeAnnualPayslips(2025)
    const result = calculateFonteFromPayslips(payslips, 2025, 1000)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.anno).toBe(2025)
      expect(result.data.quotaDipendente).toBe(Math.round(80 * 12 * 100) / 100)
      expect(result.data.tfr).toBe(1000)
    }
  })

  it('restituisce errore se nessun cedolino per l\'anno', () => {
    const result = calculateFonteFromPayslips([], 2025)
    expect(result.success).toBe(false)
  })
})

// -----------------------------------------------------------------------
// --- checkDeducibilitaFonte ---
// -----------------------------------------------------------------------
describe('checkDeducibilitaFonte', () => {
  it('non supera il tetto se versamenti sotto €5.164,57', () => {
    const result = checkDeducibilitaFonte(4000)
    expect(result.superaTetto).toBe(false)
    expect(result.deducibile).toBe(4000)
    expect(result.eccedenza).toBe(0)
  })

  it('segnala superamento tetto se versamenti sopra €5.164,57', () => {
    const result = checkDeducibilitaFonte(6000)
    expect(result.superaTetto).toBe(true)
    expect(result.deducibile).toBe(5164.57)
    expect(result.eccedenza).toBe(Math.round((6000 - 5164.57) * 100) / 100)
  })

  it('tetto esatto non genera eccedenza', () => {
    const result = checkDeducibilitaFonte(5164.57)
    expect(result.superaTetto).toBe(false)
    expect(result.eccedenza).toBe(0)
  })
})

// -----------------------------------------------------------------------
// --- calculatePensionProjection ---
// -----------------------------------------------------------------------
describe('calculatePensionProjection', () => {
  it('proietta il montante pensionistico a 67 anni (happy path)', () => {
    const result = calculatePensionProjection(20000, 3000, 40, 0.03)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.etaAttuale).toBe(40)
      expect(result.data.etaPensione).toBe(67)
      expect(result.data.anniAlPensionamento).toBe(27)
      expect(result.data.montanteProiettato).toBeGreaterThan(20000 + 3000 * 27)
    }
  })

  it('restituisce errore se età >= 67', () => {
    const result = calculatePensionProjection(50000, 3000, 67, 0.03)
    expect(result.success).toBe(false)
  })

  it('restituisce errore se età fuori range (< 18 o > 100)', () => {
    expect(calculatePensionProjection(10000, 3000, 17, 0.03).success).toBe(false)
    expect(calculatePensionProjection(10000, 3000, 101, 0.03).success).toBe(false)
  })

  it('restituisce errore se tasso rendimento fuori range', () => {
    expect(calculatePensionProjection(10000, 3000, 40, 0.5).success).toBe(false)
    expect(calculatePensionProjection(10000, 3000, 40, -0.3).success).toBe(false)
  })

  it('gestisce tasso rendimento = 0', () => {
    const result = calculatePensionProjection(10000, 2000, 60, 0)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.montanteProiettato).toBe(10000 + 2000 * 7)
      expect(result.data.rendimentoTotale).toBe(0)
    }
  })
})

// -----------------------------------------------------------------------
// --- compareTFRAziendaVsFondo ---
// -----------------------------------------------------------------------
describe('compareTFRAziendaVsFondo', () => {
  it('confronta TFR azienda vs fondo pensione (happy path)', () => {
    const result = compareTFRAziendaVsFondo(3000, 20, 0.02, 0.04)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.anniSimulazione).toBe(20)
      expect(result.data.tfrAzienda.montanteFinale).toBeGreaterThan(0)
      expect(result.data.tfrFondo.montanteFinale).toBeGreaterThan(0)
      expect(result.data.convenienza).toBe('fondo')
    }
  })

  it('restituisce errore se quota TFR <= 0', () => {
    const result = compareTFRAziendaVsFondo(0, 20, 0.02, 0.04)
    expect(result.success).toBe(false)
  })

  it('restituisce errore se anni fuori range', () => {
    expect(compareTFRAziendaVsFondo(3000, 0, 0.02, 0.04).success).toBe(false)
    expect(compareTFRAziendaVsFondo(3000, 51, 0.02, 0.04).success).toBe(false)
  })

  it('indica pari se differenza < €100', () => {
    const result = compareTFRAziendaVsFondo(1000, 1, 0.02, 0.02)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.convenienza).toBe('pari')
    }
  })
})

// -----------------------------------------------------------------------
// --- createPensionFund ---
// -----------------------------------------------------------------------
describe('createPensionFund', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('crea un fondo pensione con successo', async () => {
    const { addDoc } = await import('firebase/firestore')
    ;(addDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'fund-001' })
    const result = await createPensionFund('user-123', {
      nome: 'Fon.Te',
      codice: 'FONTE',
      tipo: 'aperto',
      contribuzioneAnnua: 2000,
      tipologia: 'aperto',
      saldoAttuale: 15000,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('fund-001')
    }
  })

  it('restituisce errore su Firebase failure', async () => {
    const { addDoc } = await import('firebase/firestore')
    ;(addDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'))
    const result = await createPensionFund('user-123', {
      nome: 'Fon.Te',
      tipo: 'fonte',
      lineaInvestimento: 'Dinamico',
      saldoAttuale: 15000,
    })
    expect(result.success).toBe(false)
  })
})

// -----------------------------------------------------------------------
// --- updatePensionFund ---
// -----------------------------------------------------------------------
describe('updatePensionFund', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('aggiorna un fondo pensione con successo', async () => {
    const { updateDoc } = await import('firebase/firestore')
    ;(updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)
    const result = await updatePensionFund('user-123', 'fund-001', { saldoAttuale: 16000 })
    expect(result.success).toBe(true)
  })

  it('restituisce errore su Firebase failure', async () => {
    const { updateDoc } = await import('firebase/firestore')
    ;(updateDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'))
    const result = await updatePensionFund('user-123', 'fund-001', { saldoAttuale: 16000 })
    expect(result.success).toBe(false)
  })
})

// -----------------------------------------------------------------------
// --- deletePensionFund ---
// -----------------------------------------------------------------------
describe('deletePensionFund', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('elimina un fondo pensione con successo', async () => {
    const { deleteDoc } = await import('firebase/firestore')
    ;(deleteDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)
    const result = await deletePensionFund('user-123', 'fund-001')
    expect(result.success).toBe(true)
  })

  it('restituisce errore su Firebase failure', async () => {
    const { deleteDoc } = await import('firebase/firestore')
    ;(deleteDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'))
    const result = await deletePensionFund('user-123', 'fund-001')
    expect(result.success).toBe(false)
  })
})

// -----------------------------------------------------------------------
// --- getPensionFund ---
// -----------------------------------------------------------------------
describe('getPensionFund', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('recupera un fondo pensione esistente', async () => {
    const { getDoc } = await import('firebase/firestore')
    ;(getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      exists: () => true,
      id: 'fund-001',
      data: () => ({ nome: 'Fon.Te', tipo: 'fonte', lineaInvestimento: 'Dinamico', saldoAttuale: 15000 }),
    })
    const result = await getPensionFund('user-123', 'fund-001')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.nome).toBe('Fon.Te')
    }
  })

  it('restituisce errore se fondo non esiste', async () => {
    const { getDoc } = await import('firebase/firestore')
    ;(getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ exists: () => false })
    const result = await getPensionFund('user-123', 'fund-001')
    expect(result.success).toBe(false)
  })
})

// -----------------------------------------------------------------------
// --- getAllPensionFunds ---
// -----------------------------------------------------------------------
describe('getAllPensionFunds', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('restituisce tutti i fondi pensione', async () => {
    const { getDocs, query } = await import('firebase/firestore')
    ;(query as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      forEach: (cb: (d: { id: string; data: () => Record<string, unknown> }) => void) => {
        cb({ id: 'fund-001', data: () => ({ nome: 'Fon.Te', tipo: 'fonte', lineaInvestimento: 'Dinamico', saldoAttuale: 15000 }) })
      },
    })
    const result = await getAllPensionFunds('user-123')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.length).toBe(1)
    }
  })

  it('restituisce errore su Firebase failure', async () => {
    const { getDocs, query } = await import('firebase/firestore')
    ;(query as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'))
    const result = await getAllPensionFunds('user-123')
    expect(result.success).toBe(false)
  })
})

// -----------------------------------------------------------------------
// --- recordContribution ---
// -----------------------------------------------------------------------
describe('recordContribution', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('registra un versamento con successo', async () => {
    const { addDoc } = await import('firebase/firestore')
    ;(addDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'contrib-001' })
    const result = await recordContribution('user-123', {
      fondoId: 'fund-001',
      year: 2025,
      month: 1,
      amount: 460,
      type: 'volontario',
      quotaDipendente: 80,
      quotaDatore: 80,
      tfrConferito: 300,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('contrib-001')
    }
  })

  it('restituisce errore su Firebase failure', async () => {
    const { addDoc } = await import('firebase/firestore')
    ;(addDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'))
    const result = await recordContribution('user-123', {
      fondoId: 'fund-001',
      year: 2025,
      month: 1,
      amount: 460,
      type: 'volontario',
      quotaDipendente: 80,
      quotaDatore: 80,
      tfrConferito: 300,
    })
    expect(result.success).toBe(false)
  })
})

// -----------------------------------------------------------------------
// --- getContributionsByFund ---
// -----------------------------------------------------------------------
describe('getContributionsByFund', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('restituisce i versamenti per un fondo specifico', async () => {
    const { getDocs, query } = await import('firebase/firestore')
    ;(query as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      forEach: (cb: (d: { id: string; data: () => Record<string, unknown> }) => void) => {
        cb({ id: 'contrib-001', data: () => ({ fundId: 'fund-001', year: 2025, month: 1, quotaDipendente: 80, quotaDatore: 80, tfrConferito: 300, totale: 460 }) })
        cb({ id: 'contrib-002', data: () => ({ fundId: 'fund-002', year: 2025, month: 1, quotaDipendente: 100, quotaDatore: 100, tfrConferito: 0, totale: 200 }) })
      },
    })
    const result = await getContributionsByFund('user-123', 'fund-001')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.length).toBe(1)
      expect(result.data[0].fundId).toBe('fund-001')
    }
  })

  it('restituisce errore su Firebase failure', async () => {
    const { getDocs, query } = await import('firebase/firestore')
    ;(query as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'))
    const result = await getContributionsByFund('user-123', 'fund-001')
    expect(result.success).toBe(false)
  })
})
