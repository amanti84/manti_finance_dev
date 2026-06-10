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
  updateMutuo,
  deleteMutuo,
  applyPartialRepayment,
  simulateOverpayment,
} from './mutuo';
import type { MutuoConfig, ApiResult } from '../types';
import type { Timestamp } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  Timestamp: {
    now: vi.fn(() => makeTimestamp(new Date())),
    fromDate: vi.fn((d: Date) => makeTimestamp(d)),
  },
}));

vi.mock('./audit', () => ({
  logAudit: vi.fn().mockResolvedValue({ success: true, data: {} }).mockResolvedValue({ success: true, data: undefined }),
}));

const makeTimestamp = (d: Date): Timestamp =>
  ({
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
    toMillis: () => d.getTime(),
    isEqual: () => false,
  }) as unknown as Timestamp;

// MutuoConfig è plain interface (no BaseDocument) — no id/createdAt/updatedAt
const makeMutuoConfig = (overrides: Partial<MutuoConfig> = {}): MutuoConfig => {
  const base: MutuoConfig = {
    importoOriginale: 200000,
    debitoResiduo: 200000,
    rataMensile: 1004.52,
    tasso: 3.5,
    dataInizio: makeTimestamp(new Date('2023-01-01')),
    dataFine: makeTimestamp(new Date('2048-01-01')),
    isMutuoVariabile: false,
    banca: 'Banca Intesa',
  }
  return { ...base, ...overrides }
}

describe('Mutuo Service', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('getMutuoSummary', () => {
    it('restituisce summary con rate rimanenti', () => {
      const config = makeMutuoConfig({ debitoResiduo: 180000 });
      const result = getMutuoSummary(config);
      expect(result.success).toBe(true);
      expect(result.data?.rateRimanenti).toBeGreaterThan(0);
      expect(result.data?.debitoResiduo).toBe(180000);
    });
  });

  describe('simulateAnticipatedExtinction', () => {
    it('calcola risparmio interessi per estinzione anticipata', () => {
      const config = makeMutuoConfig({ debitoResiduo: 180000 });
      const result = simulateAnticipatedExtinction(config, new Date('2028-01-01'));
      expect(result.success).toBe(true);
      expect(result.data?.interessiRisparmiati).toBeGreaterThan(0);
      expect(result.data?.debitoResiduoAttuale).toBeGreaterThan(0);
    });
  });

  describe('simulateExtraPayment', () => {
    it('pagamento extra riduce le rate rimanenti', () => {
      const config = makeMutuoConfig({ debitoResiduo: 180000 });
      const result = simulateExtraPayment(config, 10000);
      expect(result.success).toBe(true);
      expect(result.data?.rateRisparmiate).toBeGreaterThan(0);
      expect(result.data?.interessiRisparmiati).toBeGreaterThan(0);
    });
  });

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

  describe('updateDebitoResiduo', () => {
    it('aggiorna debito residuo e ritorna successo', async () => {
      const { updateDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      const result = await updateDebitoResiduo('user-123', 150000);
      expect(result.success).toBe(true);
    });
  });

  describe('updateMutuo', () => {
    it('aggiorna parametri mutuo e logga audit', async () => {
      const { updateDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      const updates = { tasso: 4.0, banca: 'Nuova Banca' };
      const result = await updateMutuo('user-123', 'config', updates);
      expect(result.success).toBe(true);
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), updates);
    });

    it('gestisce errore aggiornamento', async () => {
      const { updateDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (updateDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Update failed'));
      const result = await updateMutuo('user-123', 'config', { tasso: 4.0 });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('deleteMutuo', () => {
    it('elimina configurazione mutuo', async () => {
      const { deleteDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (deleteDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      const result = await deleteMutuo('user-123', 'config');
      expect(result.success).toBe(true);
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('gestisce errore eliminazione', async () => {
      const { deleteDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (deleteDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Delete failed'));
      const result = await deleteMutuo('user-123', 'config');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });

  describe('applyPartialRepayment', () => {
    it('applica rimborso parziale e aggiorna debito residuo', async () => {
      const { getDoc, updateDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        exists: () => true,
        data: () => makeMutuoConfig({ debitoResiduo: 100000 }),
      });
      (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

      const result = await applyPartialRepayment('user-123', 'config', 10000);
      expect(result.success).toBe(true);
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { debitoResiduo: 90000 });
    });

    it('non va sotto zero nel debito residuo', async () => {
      const { getDoc, updateDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        exists: () => true,
        data: () => makeMutuoConfig({ debitoResiduo: 5000 }),
      });
      (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

      const result = await applyPartialRepayment('user-123', 'config', 10000);
      expect(result.success).toBe(true);
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { debitoResiduo: 0 });
    });

    it('gestisce errore se configurazione non trovata', async () => {
      const { getDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ exists: () => false });

      const result = await applyPartialRepayment('user-123', 'config', 10000);
      expect(result.success).toBe(false);
      expect(result.error).toContain('non trovata');
    });
  });

  describe('simulateOverpayment', () => {
    it('restituisce lo stesso risultato di simulateExtraPayment', () => {
      const config = makeMutuoConfig({ debitoResiduo: 180000 });
      const result = simulateOverpayment(config, 10000);
      const expected = simulateExtraPayment(config, 10000);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expected.data);
    });
  });

});
