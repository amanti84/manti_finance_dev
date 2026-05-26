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
import { Timestamp } from 'firebase/firestore';

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
    now: vi.fn(() => ({ seconds: 0, nanoseconds: 0, toDate: () => new Date(), toMillis: () => 0, isEqual: () => false })),
    fromDate: vi.fn((d: Date) => ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0, toDate: () => d, toMillis: () => d.getTime(), isEqual: () => false })),
  },
}));

vi.mock('./audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// MOCK FIXTURES
// ---------------------------------------------------------------------------
const makeTimestamp = (d: Date): Timestamp =>
  ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0, toDate: () => d, toMillis: () => d.getTime(), isEqual: () => false }) as unknown as Timestamp;

const makeInvestment = (overrides: Partial<Investment> = {}): Investment => ({
  id: 'inv-001',
  uid: 'user-123',
  name: 'Fondo Azionario ETF',
  ticker: 'VWCE',
  assetClass: 'etf',
  broker: 'degiro',
  quantity: 10,
  avgCost: 90,
  currentPrice: 100,
  currentValue: 1000,
  costBasis: 900,
  unrealizedPnL: 100,
  unrealizedPnLPct: 11.11,
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
        makeInvestment({ unrealizedPnL: 100 }),
        makeInvestment({ id: 'inv-002', unrealizedPnL: -50 }),
      ];
      const result = calculatePortfolioPnL(list);
      expect(result.success).toBe(true);
      expect(result.data?.totalPnL).toBeCloseTo(50);
    });

    it('ritorna P&L zero su lista vuota', () => {
      const result = calculatePortfolioPnL([]);
      expect(result.success).toBe(true);
      expect(result.data?.totalPnL).toBe(0);
    });
  });

  describe('getPortfolioSummary', () => {
    it('calcola totalValue e costBasis correttamente', () => {
      const list = [
        makeInvestment({ currentValue: 1000, costBasis: 900 }),
        makeInvestment({ id: 'inv-002', currentValue: 500, costBasis: 600 }),
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
        makeInvestment({ broker: 'degiro', currentValue: 1000 }),
        makeInvestment({ id: 'inv-002', broker: 'fineco', currentValue: 2000 }),
        makeInvestment({ id: 'inv-003', broker: 'degiro', currentValue: 500 }),
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
        makeInvestment({ assetClass: 'etf', currentValue: 800 }),
        makeInvestment({ id: 'inv-002', assetClass: 'azioni', currentValue: 200 }),
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
      const payload = makeInvestment({ id: undefined as any });
      const result: ApiResult<string> = await createInvestment('user-123', payload);
      expect(result.success).toBe(true);
      expect(result.data).toBe('new-inv-id');
    });

    it('restituisce errore su failure Firebase', async () => {
      const { addDoc } = await import('firebase/firestore');
      (addDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'));
      const result = await createInvestment('user-123', makeInvestment());
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
      const { deleteDoc, doc } = await import('firebase/firestore');
      (doc as ReturnType<typeof vi.fn>).mockReturnValue({});
      (deleteDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      const result = await deleteInvestment('user-123', 'inv-001');
      expect(result.success).toBe(true);
    });
  });

  describe('getInvestmentsByBroker', () => {
    it('filtra investimenti per broker', async () => {
      const { getDocs, query } = await import('firebase/firestore');
      (query as ReturnType<typeof vi.fn>).mockReturnValue({});
      (getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        docs: [
          { id: 'inv-001', data: () => makeInvestment({ broker: 'degiro' }) },
        ],
      });
      const result = await getInvestmentsByBroker('user-123', 'degiro');
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].broker).toBe('degiro');
    });
  });

  describe('getInvestmentsByAssetClass', () => {
    it('filtra investimenti per asset class', async () => {
      const { getDocs, query } = await import('firebase/firestore');
      (query as ReturnType<typeof vi.fn>).mockReturnValue({});
      (getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        docs: [
          { id: 'inv-001', data: () => makeInvestment({ assetClass: 'etf' }) },
        ],
      });
      const result = await getInvestmentsByAssetClass('user-123', 'etf');
      expect(result.success).toBe(true);
      expect(result.data?.[0].assetClass).toBe('etf');
    });
  });

});
