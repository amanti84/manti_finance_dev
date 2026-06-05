/**
 * investment.test.ts
 * Test suite per Investment Core Service
 * Issue #10 — M2 Core Modules
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createInvestment,
  deleteInvestment,
  getInvestment,
  getInvestmentsByBroker,
  getInvestmentsByAssetClass,
  calculateUnrealizedPnL,
  calculatePortfolioPnL,
  getPortfolioSummary,
  aggregateByBroker,
  aggregateByAssetClass,
} from './investment';
import type { Investment, ApiResult } from '../types';
import type { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// MOCK FIREBASE
// ---------------------------------------------------------------------------
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
  Timestamp: {
    now: vi.fn(() => makeTimestamp(new Date())),
    fromDate: vi.fn((d: Date) => makeTimestamp(d)),
  },
}));

vi.mock('./audit', () => ({
  logAudit: vi.fn().mockResolvedValue({ success: true, data: {} }).mockResolvedValue({ success: true, data: undefined }),
}));

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
const makeTimestamp = (d: Date): Timestamp =>
  ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0, toDate: () => d, toMillis: () => d.getTime(), isEqual: () => false }) as unknown as Timestamp;

const makeInvestment = (overrides: Partial<Investment> = {}): Investment => ({
  id: 'inv-001',
  name: 'Fondo Azionario ETF',
  ticker: 'VWCE',
  assetClass: 'etf',
  broker: 'degiro',
  quantity: 10,
  avgCost: 90,
  currentPrice: 100,
  currentValue: 1000,
  currency: 'EUR',
  isPac: false,
  lastPriceUpdate: makeTimestamp(new Date('2025-01-01')),
  createdAt: makeTimestamp(new Date('2025-01-01')),
  updatedAt: makeTimestamp(new Date('2025-01-01')),
  ...overrides,
});

// ---------------------------------------------------------------------------
// TEST SUITE
// ---------------------------------------------------------------------------
describe('Investment Core Service', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateUnrealizedPnL', () => {
    it('calcola correttamente il P&L non realizzato positivo', () => {
      const inv = makeInvestment({ quantity: 10, avgCost: 90, currentPrice: 100 });
      const result = calculateUnrealizedPnL(inv);
      expect(result.success).toBe(true);
      expect(result.data?.pnl).toBeCloseTo(100);
      expect(result.data?.pnlPct).toBeCloseTo(11.11, 1);
    });

    it('calcola P&L negativo (perdita)', () => {
      const inv = makeInvestment({ quantity: 10, avgCost: 100, currentPrice: 80 });
      const result = calculateUnrealizedPnL(inv);
      expect(result.success).toBe(true);
      expect(result.data?.pnl).toBeCloseTo(-200);
    });

    it('restituisce errore se avgCost è zero', () => {
      const inv = makeInvestment({ avgCost: 0 });
      const result = calculateUnrealizedPnL(inv);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('calculatePortfolioPnL', () => {
    it('aggrega P&L su lista di investimenti', () => {
      const list = [
        makeInvestment({ avgCost: 90, currentPrice: 100, quantity: 10 }),
        makeInvestment({ id: 'inv-002', avgCost: 110, currentPrice: 100, quantity: 5 }),
      ];
      const result = calculatePortfolioPnL(list);
      expect(result.success).toBe(true);
      expect(typeof result.data?.totalPnL).toBe('number');
    });

    it('ritorna P&L zero su lista vuota', () => {
      const result = calculatePortfolioPnL([]);
      expect(result.success).toBe(true);
      expect(result.data?.totalPnL).toBe(0);
    });
  });

  describe('getPortfolioSummary', () => {
    it('calcola totalValue e totalCostBasis correttamente', () => {
      const list = [
        makeInvestment({ currentValue: 1000, currentPrice: 100, quantity: 10, avgCost: 90 }),
        makeInvestment({ id: 'inv-002', currentValue: 500, currentPrice: 50, quantity: 10, avgCost: 60 }),
      ];
      const result = getPortfolioSummary(list);
      expect(result.success).toBe(true);
      expect(result.data?.totalValue).toBeCloseTo(1500);
      expect(result.data?.totalCostBasis).toBeCloseTo(1500);
    });
  });

  describe('aggregateByBroker', () => {
    it('raggruppa investimenti per broker', () => {
      const list = [
        makeInvestment({ broker: 'degiro', currentPrice: 100, quantity: 10 }),
        makeInvestment({ id: 'inv-002', broker: 'fineco', currentPrice: 200, quantity: 10 }),
        makeInvestment({ id: 'inv-003', broker: 'degiro', currentPrice: 50, quantity: 10 }),
      ];
      const result = aggregateByBroker(list);
      expect(result.success).toBe(true);
      const degiro = result.data?.find(b => b.broker === 'degiro');
      expect(degiro?.totalValue).toBeCloseTo(1500);
    });
  });

  describe('aggregateByAssetClass', () => {
    it('raggruppa per asset class con allocazione percentuale', () => {
      const list = [
        makeInvestment({ assetClass: 'etf', currentPrice: 80, quantity: 10 }),
        makeInvestment({ id: 'inv-002', assetClass: 'azioni', currentPrice: 20, quantity: 10 }),
      ];
      const result = aggregateByAssetClass(list);
      expect(result.success).toBe(true);
      const etf = result.data?.find(a => a.assetClass === 'etf');
      expect(etf?.allocationPct).toBeCloseTo(80);
    });
  });

  describe('createInvestment', () => {
    it('restituisce ApiResult con successo su creazione valida', async () => {
      const { addDoc } = await import('firebase/firestore');
      (addDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'new-inv-id' });
      const payload = makeInvestment();
      const { id: _id, createdAt: _c, updatedAt: _u, currentValue: _v, ...data } = payload;
      const result: ApiResult<string> = await createInvestment('user-123', data);
      expect(result.success).toBe(true);
      expect(result.data).toBe('new-inv-id');
    });

    it('restituisce errore su failure Firebase', async () => {
      const { addDoc } = await import('firebase/firestore');
      (addDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'));
      const payload = makeInvestment();
      const { id: _id, createdAt: _c, updatedAt: _u, currentValue: _v, ...data } = payload;
      const result = await createInvestment('user-123', data);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Firebase error');
    });
  });

  describe('getInvestment', () => {
    it('ritorna investimento esistente', async () => {
      const { getDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        exists: () => true,
        id: 'inv-001',
        data: () => makeInvestment(),
      });
      const result = await getInvestment('user-123', 'inv-001');
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('inv-001');
    });

    it('ritorna errore se documento non esiste', async () => {
      const { getDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ exists: () => false });
      const result = await getInvestment('user-123', 'inv-999');
      expect(result.success).toBe(false);
    });
  });

  describe('deleteInvestment', () => {
    it('elimina investimento e ritorna successo', async () => {
      const { deleteDoc, doc, getDoc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ exists: () => true, data: () => makeInvestment() });
      (deleteDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      const result = await deleteInvestment('user-123', 'inv-001');
      expect(result.success).toBe(true);
    });
  });

  describe('getInvestmentsByBroker', () => {
    it('filtra investimenti per broker', async () => {
      const { getDocs, query, collection, where, orderBy } = await import('firebase/firestore');
      (collection as ReturnType<typeof vi.fn>).mockReturnValue({});
      (where as ReturnType<typeof vi.fn>).mockReturnValue({});
      (orderBy as ReturnType<typeof vi.fn>).mockReturnValue({});
      (query as ReturnType<typeof vi.fn>).mockReturnValue({});
      const mockDocs = [{ id: 'inv-001', data: () => makeInvestment({ broker: 'degiro' }) }];
      (getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        docs: mockDocs,
        forEach: (cb: (d: { id: string; data: () => Investment }) => void) => { mockDocs.forEach(cb); },
      });
      const result = await getInvestmentsByBroker('user-123', 'degiro');
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].broker).toBe('degiro');
    });
  });

  describe('getInvestmentsByAssetClass', () => {
    it('filtra investimenti per asset class', async () => {
      const { getDocs, query, collection, where, orderBy } = await import('firebase/firestore');
      (collection as ReturnType<typeof vi.fn>).mockReturnValue({});
      (where as ReturnType<typeof vi.fn>).mockReturnValue({});
      (orderBy as ReturnType<typeof vi.fn>).mockReturnValue({});
      (query as ReturnType<typeof vi.fn>).mockReturnValue({});
      const mockDocs = [{ id: 'inv-001', data: () => makeInvestment({ assetClass: 'etf' }) }];
      (getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        docs: mockDocs,
        forEach: (cb: (d: { id: string; data: () => Investment }) => void) => { mockDocs.forEach(cb); },
      });
      const result = await getInvestmentsByAssetClass('user-123', 'etf');
      expect(result.success).toBe(true);
      expect(result.data?.[0].assetClass).toBe('etf');
    });
  });

});
