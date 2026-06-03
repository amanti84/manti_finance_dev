/**
 * mutuo.test.ts
 * Test suite per Mutuo Service
 * Issue #13 — M2 Core Modules
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
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
import type { Timestamp } from 'firebase/firestore';

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
  Timestamp: {
    now: vi.fn(() => makeTimestamp(new Date())),
    fromDate: vi.fn((d: Date) => makeTimestamp(d)),
  },
}));

// fix: service chiama logAudit, non logAuditEvent
vi.mock('./audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// MOCK FIXTURES
// ---------------------------------------------------------------------------
const makeTimestamp = (d: Date): Timestamp =>
  ({
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
    toMillis: () => d.getTime(),
    isEqual: () => false,
  }) as unknown as Timestamp;

const makeMutuoConfig = (overrides: Partial<MutuoConfig> = {}): MutuoConfig => {
  const base: MutuoConfig = {
    id: 'mutuo-001',
    createdAt: makeTimestamp(new Date()),
    updatedAt: makeTimestamp(new Date()),
    importoIniziale: 200000,
    saldoResiduo: 200000,
    rata: 1004.52,
    tassoAnnuo: 3.5,
    durataAnni: 25,
    banca: 'Banca Intesa',
    tipoTasso: 'fisso',
    importoOriginale: 200000,
    debitoResiduo: 200000,
    rataMensile: 1004.52,
    tasso: 3.5,
    dataInizio: makeTimestamp(new Date('2023-01-01')),
    dataFine: makeTimestamp(new Date('2048-01-01')),
    isMutuoVariabile: false,
  }
  return { ...base, ...overrides }
}

// ---------------------------------------------------------------------------
// TEST SUITE
// ---------------------------------------------------------------------------
describe('Mutuo Service', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- getPianoAmmortamento ---
  describe('getPianoAmmortamento', () => {
    it('genera piano ammortamento con numero corretto di rate', () => {
      const config = makeMutuoConfig({
        dataInizio: makeTimestamp(new Date('2023-01-01')),
        dataFine: makeTimestamp(new Date('2025-01-01')),
      });
      const result = getPianoAmmortamento(config);
      expect(result.success).toBe(true);
      expect(result.data?.rate.length).toBe(24);
    });

    it('ultima rata ha debito residuo prossimo a zero', () => {
      const config = makeMutuoConfig({
        importoOriginale: 24000,
        debitoResiduo: 24000,
        rataMensile: 1000,
        tasso: 0,
        dataInizio: makeTimestamp(new Date('2023-01-01')),
        dataFine: makeTimestamp(new Date('2025-01-01')),
      });
      const result = getPianoAmmortamento(config);
      expect(result.success).toBe(true);
      const ultimaRata = result.data?.rate[result.data.rate.length - 1];
      expect(ultimaRata?.debitoResiduo).toBeCloseTo(0, 0);
    });

    it('totale interessi è positivo con tasso positivo', () => {
      const config = makeMutuoConfig({
        dataInizio: makeTimestamp(new Date('2023-01-01')),
        dataFine: makeTimestamp(new Date('2025-01-01')),
      });
      const result = getPianoAmmortamento(config);
      expect(result.data?.totaleInteressi).toBeGreaterThan(0);
    });
  });

  // --- getDebitoResiduoAllaData ---
  describe('getDebitoResiduoAllaData', () => {
    it('calcola debito residuo dopo 12 mesi', () => {
      const config = makeMutuoConfig({
        dataInizio: makeTimestamp(new Date('2023-01-01')),
        dataFine: makeTimestamp(new Date('2048-01-01')),
      });
      const result = getDebitoResiduoAllaData(config, new Date('2024-01-15'));
      expect(result.success).toBe(true);
      expect(result.data).toBeLessThan(200000);
      expect(result.data).toBeGreaterThan(0);
    });
  });

  // --- getMutuoSummary ---
  describe('getMutuoSummary', () => {
    it('restituisce summary con rate rimanenti', () => {
      const config = makeMutuoConfig({
        debitoResiduo: 180000,
      });
      const result = getMutuoSummary(config);
      expect(result.success).toBe(true);
      expect(result.data?.rateRimanenti).toBeGreaterThan(0);
      expect(result.data?.debitoResiduo).toBe(180000);
    });
  });

  // --- simulateAnticipatedExtinction ---
  describe('simulateAnticipatedExtinction', () => {
    it('calcola risparmio interessi per estinzione anticipata', () => {
      const config = makeMutuoConfig({
        debitoResiduo: 180000,
      });
      const result = simulateAnticipatedExtinction(config, new Date('2028-01-01'));
      expect(result.success).toBe(true);
      expect(result.data?.interessiRisparmiati).toBeGreaterThan(0);
      expect(result.data?.debitoResiduoAttuale).toBeGreaterThan(0);
    });
  });

  // --- simulateExtraPayment ---
  describe('simulateExtraPayment', () => {
    it('pagamento extra riduce le rate rimanenti', () => {
      const config = makeMutuoConfig({
        debitoResiduo: 180000,
      });
      const result = simulateExtraPayment(config, 10000);
      expect(result.success).toBe(true);
      expect(result.data?.rateRisparmiate).toBeGreaterThan(0);
      expect(result.data?.interessiRisparmiati).toBeGreaterThan(0);
    });
  });

  // --- saveMutuoConfig (Firebase) ---
  describe('saveMutuoConfig', () => {
    it('salva configurazione e ritorna successo', async () => {
      const { setDoc, doc, getDoc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ exists: () => false });
      (setDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      const config = makeMutuoConfig();
      const result: ApiResult<void> = await saveMutuoConfig('user-123', config);
      expect(result.success).toBe(true);
    });

    it('restituisce errore su failure Firebase', async () => {
      const { setDoc, doc, getDoc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ exists: () => false });
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
        data: () => makeMutuoConfig(),
      });
      const result = await getMutuoConfig('user-123');
      expect(result.success).toBe(true);
      expect(result.data?.importoOriginale).toBe(200000);
    });

    it('ritorna errore se configurazione non esiste', async () => {
      const { getDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ exists: () => false });
      const result = await getMutuoConfig('user-999');
      expect(result.success).toBe(false);
    });
  });

  // --- updateDebitoResiduo (Firebase) ---
  describe('updateDebitoResiduo', () => {
    it('aggiorna debito residuo e ritorna successo', async () => {
      const { updateDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      const result = await updateDebitoResiduo('user-123', 150000);
      expect(result.success).toBe(true);
    });
  });

});
