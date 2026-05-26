/**
 * decision-engine.test.ts
 * Test suite per Decision Engine v1
 * Issue #12 — M2 Core Modules
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ruleBufferSicurezza,
  rulePensioneSottoTarget,
  ruleMutuoEsposizione,
  ruleSurplusInvestimento,
  rulePacMinimo,
  runDecisionEngine,
  getTopRecommendation,
  saveDecisionRecord,
  getDecisionHistory,
} from './decision-engine';
import type { DecisionContext } from './decision-engine';

// ---------------------------------------------------------------------------
// MOCK FIREBASE
// ---------------------------------------------------------------------------
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: { now: vi.fn(() => ({ toDate: () => new Date() })) },
}));

// fix: service chiama logAudit, non logAuditEvent
vi.mock('./audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// FIXTURE
// ---------------------------------------------------------------------------
const makeCtx = (overrides: Partial<DecisionContext> = {}): DecisionContext => ({
  uid: 'user-123',
  surplusMensile: 800,
  sogliaInvestimento: 500,
  debitoResiduoMutuo: 150000,
  anniResiduiMutuo: 20,
  sogliaAnniMutuo: 5,
  saldoPensione: 5000,
  targetPensionePct: 20,
  redditoAnnuo: 50000,
  saldoConto: 8000,
  bufferSicurezza: 3000,
  ...overrides,
});

// ---------------------------------------------------------------------------
// TEST SUITE
// ---------------------------------------------------------------------------
describe('Decision Engine', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Regola 1: Buffer Sicurezza ---
  describe('ruleBufferSicurezza', () => {
    it('si attiva quando saldo < buffer', () => {
      const ctx = makeCtx({ saldoConto: 1500, bufferSicurezza: 3000 });
      const result = ruleBufferSicurezza(ctx);
      expect(result).not.toBeNull();
      expect(result?.ruleTriggered).toBe('BUFFER_SICUREZZA');
      expect(result?.priority).toBe(1);
      expect(result?.amount).toBeGreaterThan(0);
    });

    it('non si attiva quando saldo >= buffer', () => {
      const ctx = makeCtx({ saldoConto: 5000, bufferSicurezza: 3000 });
      expect(ruleBufferSicurezza(ctx)).toBeNull();
    });

    it('importo suggerito non supera il surplus mensile', () => {
      const ctx = makeCtx({ saldoConto: 500, bufferSicurezza: 3000, surplusMensile: 200 });
      const result = ruleBufferSicurezza(ctx);
      expect(result?.amount).toBeLessThanOrEqual(200);
    });
  });

  // --- Regola 2: Pensione sotto target ---
  describe('rulePensioneSottoTarget', () => {
    it('si attiva quando saldo pensione < target', () => {
      const ctx = makeCtx({ saldoPensione: 5000, targetPensionePct: 20, redditoAnnuo: 50000 });
      const result = rulePensioneSottoTarget(ctx);
      expect(result).not.toBeNull();
      expect(result?.ruleTriggered).toBe('PENSIONE_SOTTO_TARGET');
      expect(result?.priority).toBe(2);
    });

    it('non si attiva quando saldo pensione >= target', () => {
      const ctx = makeCtx({ saldoPensione: 20000, targetPensionePct: 20, redditoAnnuo: 50000 });
      expect(rulePensioneSottoTarget(ctx)).toBeNull();
    });
  });

  // --- Regola 3: Mutuo esposizione ---
  describe('ruleMutuoEsposizione', () => {
    it('si attiva con mutuo residuo e anni > soglia', () => {
      const ctx = makeCtx({ debitoResiduoMutuo: 150000, anniResiduiMutuo: 20, sogliaAnniMutuo: 5 });
      const result = ruleMutuoEsposizione(ctx);
      expect(result).not.toBeNull();
      expect(result?.ruleTriggered).toBe('MUTUO_ESPOSIZIONE');
      expect(result?.priority).toBe(3);
    });

    it('non si attiva se mutuo < soglia anni', () => {
      const ctx = makeCtx({ debitoResiduoMutuo: 5000, anniResiduiMutuo: 2, sogliaAnniMutuo: 5 });
      expect(ruleMutuoEsposizione(ctx)).toBeNull();
    });

    it('non si attiva se debito mutuo è zero', () => {
      const ctx = makeCtx({ debitoResiduoMutuo: 0 });
      expect(ruleMutuoEsposizione(ctx)).toBeNull();
    });
  });

  // --- Regola 4: Surplus investimento ---
  describe('ruleSurplusInvestimento', () => {
    it('si attiva quando surplus >= soglia', () => {
      const ctx = makeCtx({ surplusMensile: 800, sogliaInvestimento: 500 });
      const result = ruleSurplusInvestimento(ctx);
      expect(result).not.toBeNull();
      expect(result?.ruleTriggered).toBe('SURPLUS_INVESTIMENTO');
      expect(result?.amount).toBe(480);
    });

    it('non si attiva quando surplus < soglia', () => {
      const ctx = makeCtx({ surplusMensile: 300, sogliaInvestimento: 500 });
      expect(ruleSurplusInvestimento(ctx)).toBeNull();
    });
  });

  // --- Regola 5: PAC minimo ---
  describe('rulePacMinimo', () => {
    it('si attiva con surplus positivo ma sotto soglia', () => {
      const ctx = makeCtx({ surplusMensile: 200, sogliaInvestimento: 500 });
      const result = rulePacMinimo(ctx);
      expect(result).not.toBeNull();
      expect(result?.ruleTriggered).toBe('PAC_MINIMO');
      expect(result?.amount).toBe(200);
    });

    it('non si attiva con surplus zero', () => {
      const ctx = makeCtx({ surplusMensile: 0 });
      expect(rulePacMinimo(ctx)).toBeNull();
    });

    it('non si attiva con surplus >= soglia', () => {
      const ctx = makeCtx({ surplusMensile: 600, sogliaInvestimento: 500 });
      expect(rulePacMinimo(ctx)).toBeNull();
    });
  });

  // --- runDecisionEngine ---
  describe('runDecisionEngine', () => {
    it('restituisce risultati ordinati per priorità', () => {
      const ctx = makeCtx({
        saldoConto: 1000,
        saldoPensione: 1000,
        surplusMensile: 800,
      });
      const result = runDecisionEngine(ctx);
      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThanOrEqual(2);
      expect(result.data![0].priority).toBeLessThan(result.data![1].priority);
    });

    it('restituisce errore senza UID', () => {
      const ctx = makeCtx({ uid: '' });
      const result = runDecisionEngine(ctx);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('restituisce lista vuota se nessuna regola si attiva', () => {
      const ctx = makeCtx({
        saldoConto: 10000,
        saldoPensione: 20000,
        debitoResiduoMutuo: 0,
        surplusMensile: 0,
      });
      const result = runDecisionEngine(ctx);
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(0);
    });
  });

  // --- getTopRecommendation ---
  describe('getTopRecommendation', () => {
    it('restituisce raccomandazione con priorità più alta', () => {
      const ctx = makeCtx({ saldoConto: 500 });
      const result = getTopRecommendation(ctx);
      expect(result.success).toBe(true);
      expect(result.data?.ruleTriggered).toBe('BUFFER_SICUREZZA');
    });

    it('restituisce null se nessuna regola attiva', () => {
      const ctx = makeCtx({ saldoConto: 10000, saldoPensione: 20000, debitoResiduoMutuo: 0, surplusMensile: 0 });
      const result = getTopRecommendation(ctx);
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  // --- saveDecisionRecord ---
  describe('saveDecisionRecord', () => {
    it('salva e ritorna ID', async () => {
      const { addDoc } = await import('firebase/firestore');
      (addDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'dec-001' });
      const ctx = makeCtx();
      const results = runDecisionEngine(ctx).data!;
      const result = await saveDecisionRecord('user-123', ctx, results);
      expect(result.success).toBe(true);
      expect(result.data).toBe('dec-001');
    });

    it('restituisce errore su failure Firebase', async () => {
      const { addDoc } = await import('firebase/firestore');
      (addDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'));
      const ctx = makeCtx();
      const result = await saveDecisionRecord('user-123', ctx, []);
      expect(result.success).toBe(false);
    });
  });

  // --- getDecisionHistory ---
  describe('getDecisionHistory', () => {
    it('restituisce storico decisioni', async () => {
      const { getDocs, query } = await import('firebase/firestore');
      (query as ReturnType<typeof vi.fn>).mockReturnValue({});
      (getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        docs: [{
          id: 'dec-001',
          data: () => ({
            context: makeCtx(),
            results: [],
            createdAt: { toDate: () => new Date() },
          }),
        }],
      });
      const result = await getDecisionHistory('user-123');
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].id).toBe('dec-001');
    });
  });

});
