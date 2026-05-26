/**
 * decision-engine.ts
 * Decision Engine v1 — suggerimento allocazione surplus mensile
 * Issue #12 — M2 Core Modules
 */
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import type { ApiResult } from '../types';
import { logAuditEvent } from './audit';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------
export interface DecisionRule {
  id: string;
  condition: string;
  action: string;
  priority: number;
  enabled: boolean;
}

export interface DecisionContext {
  uid: string;
  surplusMensile: number;
  sogliaInvestimento: number; // default 500
  debitoResiduoMutuo: number;
  anniResiduiMutuo: number;
  sogliaAnniMutuo: number; // default 5
  saldoPensione: number;
  targetPensionePct: number; // 0-100
  redditoAnnuo: number;
  saldoConto: number;
  bufferSicurezza: number; // default 3000
}

export interface DecisionResult {
  recommendation: string;
  motivation: string;
  amount: number | null;
  ruleTriggered: string;
  priority: number;
}

export interface DecisionRecord {
  id?: string;
  uid: string;
  context: DecisionContext;
  results: DecisionResult[];
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// REGOLE DI ALLOCAZIONE
// ---------------------------------------------------------------------------

/**
 * Regola 1: Conto < buffer sicurezza → no investimento, ricostituire liquidità
 */
export function ruleBufferSicurezza(ctx: DecisionContext): DecisionResult | null {
  if (ctx.saldoConto < ctx.bufferSicurezza) {
    const importo = Math.min(ctx.surplusMensile, ctx.bufferSicurezza - ctx.saldoConto);
    return {
      recommendation: 'Ricostituire buffer di liquidità',
      motivation: `Saldo conto (${ctx.saldoConto}€) sotto il buffer di sicurezza (${ctx.bufferSicurezza}€). Priorità massima: ricostituire la liquidità prima di investire.`,
      amount: importo,
      ruleTriggered: 'BUFFER_SICUREZZA',
      priority: 1,
    };
  }
  return null;
}

/**
 * Regola 2: Fondo pensione < target → aumentare versamento previdenziale
 */
export function rulePensioneSottoTarget(ctx: DecisionContext): DecisionResult | null {
  const targetAssoluto = (ctx.redditoAnnuo * ctx.targetPensionePct) / 100;
  if (ctx.saldoPensione < targetAssoluto) {
    const gapAnnuo = targetAssoluto - ctx.saldoPensione;
    const suggerimentoMensile = Math.min(ctx.surplusMensile * 0.3, gapAnnuo / 12);
    return {
      recommendation: 'Aumentare versamento fondo pensione',
      motivation: `Saldo fondo pensione (${ctx.saldoPensione}€) sotto il target del ${ctx.targetPensionePct}% del reddito (${targetAssoluto.toFixed(0)}€). Aumentare versamento mensile.`,
      amount: Math.round(suggerimentoMensile),
      ruleTriggered: 'PENSIONE_SOTTO_TARGET',
      priority: 2,
    };
  }
  return null;
}

/**
 * Regola 3: Mutuo residuo > soglia anni → valutare estinzione parziale
 */
export function ruleMutuoEsposizione(ctx: DecisionContext): DecisionResult | null {
  if (ctx.debitoResiduoMutuo > 0 && ctx.anniResiduiMutuo > ctx.sogliaAnniMutuo && ctx.surplusMensile > 0) {
    const suggerimento = Math.min(ctx.surplusMensile * 0.4, ctx.debitoResiduoMutuo * 0.01);
    return {
      recommendation: 'Valutare pagamento extra sul mutuo',
      motivation: `Mutuo con ancora ${ctx.anniResiduiMutuo} anni residui (soglia: ${ctx.sogliaAnniMutuo} anni). Un pagamento extra riduce gli interessi totali.`,
      amount: Math.round(suggerimento),
      ruleTriggered: 'MUTUO_ESPOSIZIONE',
      priority: 3,
    };
  }
  return null;
}

/**
 * Regola 4: Surplus > soglia → investire in ETF
 */
export function ruleSurplusInvestimento(ctx: DecisionContext): DecisionResult | null {
  if (ctx.surplusMensile >= ctx.sogliaInvestimento) {
    return {
      recommendation: 'Investire surplus in ETF diversificato',
      motivation: `Surplus mensile (${ctx.surplusMensile}€) supera la soglia di investimento (${ctx.sogliaInvestimento}€). Ottimo momento per investire in ETF azionario mondiale.`,
      amount: Math.round(ctx.surplusMensile * 0.6),
      ruleTriggered: 'SURPLUS_INVESTIMENTO',
      priority: 4,
    };
  }
  return null;
}

/**
 * Regola 5: Surplus basso ma positivo → PAC minimo
 */
export function rulePacMinimo(ctx: DecisionContext): DecisionResult | null {
  if (ctx.surplusMensile > 0 && ctx.surplusMensile < ctx.sogliaInvestimento) {
    return {
      recommendation: 'Avviare PAC con importo minimo',
      motivation: `Surplus (${ctx.surplusMensile}€) sotto la soglia di investimento pieno. Anche un piccolo PAC mensile costruisce patrimonio nel tempo.`,
      amount: ctx.surplusMensile,
      ruleTriggered: 'PAC_MINIMO',
      priority: 5,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// MOTORE DECISIONALE
// ---------------------------------------------------------------------------

/**
 * Esegue tutte le regole in ordine di priorità e restituisce le raccomandazioni attive.
 */
export function runDecisionEngine(ctx: DecisionContext): ApiResult<DecisionResult[]> {
  try {
    if (!ctx.uid) {
      return { success: false, error: 'UID obbligatorio' };
    }
    const results: DecisionResult[] = [];
    const rules = [
      ruleBufferSicurezza,
      rulePensioneSottoTarget,
      ruleMutuoEsposizione,
      ruleSurplusInvestimento,
      rulePacMinimo,
    ];
    for (const rule of rules) {
      const result = rule(ctx);
      if (result) results.push(result);
    }
    results.sort((a, b) => a.priority - b.priority);
    return { success: true, data: results };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Restituisce la raccomandazione principale (priorità più alta).
 */
export function getTopRecommendation(ctx: DecisionContext): ApiResult<DecisionResult | null> {
  const result = runDecisionEngine(ctx);
  if (!result.success) return result as ApiResult<DecisionResult | null>;
  const top = result.data && result.data.length > 0 ? result.data[0] : null;
  return { success: true, data: top };
}

// ---------------------------------------------------------------------------
// PERSISTENZA FIRESTORE
// ---------------------------------------------------------------------------

/**
 * Salva una sessione decisionale in Firestore.
 */
export async function saveDecisionRecord(
  uid: string,
  ctx: DecisionContext,
  results: DecisionResult[]
): Promise<ApiResult<string>> {
  try {
    const db = getFirestore();
    const ref = await addDoc(collection(db, 'users', uid, 'decisions'), {
      context: ctx,
      results,
      createdAt: Timestamp.now(),
    });
    await logAuditEvent(uid, 'decision_saved', { recordId: ref.id, rulesTriggered: results.length });
    return { success: true, data: ref.id };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Recupera lo storico delle decisioni.
 */
export async function getDecisionHistory(uid: string): Promise<ApiResult<DecisionRecord[]>> {
  try {
    const db = getFirestore();
    const q = query(
      collection(db, 'users', uid, 'decisions'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const records: DecisionRecord[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<DecisionRecord, 'id'>),
      createdAt: d.data().createdAt.toDate(),
    }));
    return { success: true, data: records };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
