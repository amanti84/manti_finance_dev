/**
 * mutuo.test.ts
 * Test suite per Mutuo Service
 * Issue #13 — M2 Core Modules
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calcolaNumeroRate,
  calcolaRataMensile,
  saveMutuoConfig,
  getMutuoConfig,
  updateDebitoResiduo,
  getPianoAmmortamento,
  getDebitoResiduoAllaData,
  getMutuoSummary,
  simulateAnticipatedExtinction,
  simulateExtraPayment,
} from './mutuo';
import type { MutuoConfig, ApiResult } from '../types';

// ---------------------------------------------------------------------------
// MOCK FIREBASE
// ---------------------------------------------------------------------------
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  Timestamp: { now: vi.fn(() => ({ toDate: () => new Date() })) },
}));

vi.mock('./audit', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// MOCK FIXTURES
// ---------------------------------------------------------------------------
const makeMutuoConfig = (overrides: Partial<MutuoConfig> = {}): MutuoConfig => ({
  id: 'mutuo-001',
  uid: 'user-123',
  importoMutuo: 200000,
  tassoAnnuo: 3.5,
  durataAnni: 25,
  dataInizio: new Date('2023-01-01'),
  debitoResiduo: 200000,
  ratePagate: 0,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  ...overrides,
});

// ---------------------------------------------------------------------------
// TEST SUITE
// ---------------------------------------------------------------------------
describe('Mutuo Service', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- calcolaNumeroRate ---
  describe('calcolaNumeroRate', () => {
    it('calcola correttamente il numero di rate per 25 anni', () => {
      const result = calcolaNumeroRate(25);
      expect(result.success).toBe(true);
      expect(result.data).toBe(300);
    });

    it('calcola correttamente il numero di rate per 20 anni', () => {
      const result = calcolaNumeroRate(20);
      expect(result.success).toBe(true);
      expect(result.data).toBe(240);
    });

    it('restituisce errore per durata zero o negativa', () => {
      const result = calcolaNumeroRate(0);
      expect(result.success).toBe(false);
    });
  });

  // --- calcolaRataMensile ---
  describe('calcolaRataMensile', () => {
    it('calcola rata mensile ammortamento francese', () => {
      const result = calcolaRataMensile(200000, 3.5, 300);
      expect(result.success).toBe(true);
      expect(result.data).toBeGreaterThan(900);
      expect(result.data).toBeLessThan(1100);
    });

    it('restituisce errore per tasso negativo', () => {
      const result = calcolaRataMensile(200000, -1, 300);
      expect(result.success).toBe(false);
    });

    it('gestisce correttamente tasso zero (prestito infruttifero)', () => {
      const result = calcolaRataMensile(120000, 0, 120);
      expect(result.success).toBe(true);
      expect(result.data).toBeCloseTo(1000);
    });
  });

  // --- getPianoAmmortamento ---
  describe('getPianoAmmortamento', () => {
    it('genera piano ammortamento con numero corretto di rate', () => {
      const config = makeMutuoConfig({ durataAnni: 2 });
      const result = getPianoAmmortamento(config);
      expect(result.success).toBe(true);
      expect(result.data?.rate.length).toBe(24);
    });

    it('ultima rata ha debito residuo prossimo a zero', () => {
      const config = makeMutuoConfig({ durataAnni: 2 });
      const result = getPianoAmmortamento(config);
      expect(result.success).toBe(true);
      const ultimaRata = result.data?.rate[result.data.rate.length - 1];
      expect(ultimaRata?.debitoResiduo).toBeCloseTo(0, 0);
    });

    it('totale interessi è positivo', () => {
      const config = makeMutuoConfig({ durataAnni: 2 });
      const result = getPianoAmmortamento(config);
      expect(result.data?.totaleInteressi).toBeGreaterThan(0);
    });
  });

  // --- getDebitoResiduoAllaData ---
  describe('getDebitoResiduoAllaData', () => {
    it('calcola debito residuo dopo 12 rate pagate', () => {
      const config = makeMutuoConfig({ durataAnni: 25, ratePagate: 12 });
      const result = getDebitoResiduoAllaData(config, 12);
      expect(result.success).toBe(true);
      expect(result.data).toBeLessThan(200000);
      expect(result.data).toBeGreaterThan(0);
    });
  });

  // --- getMutuoSummary ---
  describe('getMutuoSummary', () => {
    it('restituisce prossima rata e rate rimanenti', () => {
      const config = makeMutuoConfig({ ratePagate: 12 });
      const result = getMutuoSummary(config);
      expect(result.success).toBe(true);
      expect(result.data?.rateRimanenti).toBe(288);
      expect(result.data?.prossimaNumerata).toBeGreaterThan(0);
    });
  });

  // --- simulateAnticipatedExtinction ---
  describe('simulateAnticipatedExtinction', () => {
    it('calcola risparmio interessi per estinzione anticipata', () => {
      const config = makeMutuoConfig({ ratePagate: 60 });
      const result = simulateAnticipatedExtinction(config, new Date('2028-01-01'));
      expect(result.success).toBe(true);
      expect(result.data?.risparmioInteressi).toBeGreaterThan(0);
      expect(result.data?.importoEstinzione).toBeGreaterThan(0);
    });
  });

  // --- simulateExtraPayment ---
  describe('simulateExtraPayment', () => {
    it('pagamento extra riduce le rate rimanenti', () => {
      const config = makeMutuoConfig({ ratePagate: 12 });
      const result = simulateExtraPayment(config, 10000);
      expect(result.success).toBe(true);
      expect(result.data?.nuoveRateRimanenti).toBeLessThan(288);
      expect(result.data?.risparmioInteressi).toBeGreaterThan(0);
    });

    it('restituisce errore per pagamento extra negativo', () => {
      const config = makeMutuoConfig();
      const result = simulateExtraPayment(config, -5000);
      expect(result.success).toBe(false);
    });
  });

  // --- saveMutuoConfig (Firebase) ---
  describe('saveMutuoConfig', () => {
    it('salva configurazione e ritorna successo', async () => {
      const { setDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (setDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      const config = makeMutuoConfig();
      const result: ApiResult<void> = await saveMutuoConfig('user-123', config);
      expect(result.success).toBe(true);
    });

    it('restituisce errore su failure Firebase', async () => {
      const { setDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (setDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'));
      const result = await saveMutuoConfig('user-123', makeMutuoConfig());
      expect(result.success).toBe(false);
    });
  });

  // --- getMutuoConfig (Firebase) ---
  describe('getMutuoConfig', () => {
    it('ritorna configurazione esistente', async () => {
      const { getDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        exists: () => true,
        id: 'mutuo-001',
        data: () => makeMutuoConfig(),
      });
      const result = await getMutuoConfig('user-123');
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('mutuo-001');
    });

    it('ritorna errore se configurazione non esiste', async () => {
      const { getDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ exists: () => false });
      const result = await getMutuoConfig('user-999');
      expect(result.success).toBe(false);
    });
  });

});
