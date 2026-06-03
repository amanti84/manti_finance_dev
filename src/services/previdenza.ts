/**
 * previdenza.ts
 * Servizio per gestione previdenza complementare e TFR
 * - Calcolo TFR maturato cumulativo da cedolini
 * - Tracking versamenti Fon.Te (quota dipendente + datore + TFR)
 * - Proiezione montante a 67 anni
 * Issue #14 — M2 Core Modules
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import type {
  Payslip,
  TFRData,
  FonteData,
  PensionFund,
  PensionContribution,
  ApiResult,
} from '../types'
import { logAudit } from './audit'

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const TFR_DIVISOR = 13.5
const TFR_RIVALUTAZIONE_FISSA = 0.015
const TFR_RIVALUTAZIONE_ISTAT_PERCENT = 0.75
const FONTE_DEDUCIBILITA_ANNUA = 5164.57
const ETA_PENSIONE_DEFAULT = 67

// ---------------------------------------------------------------------------
// COLLECTION PATHS
// ---------------------------------------------------------------------------

const FUNDS_COLLECTION = (uid: string) => `users/${uid}/pension_funds`
const CONTRIBUTIONS_COLLECTION = (uid: string) => `users/${uid}/pension_contributions`

// ---------------------------------------------------------------------------
// TFR CALCULATION
// ---------------------------------------------------------------------------

/**
 * Calcola la quota TFR annuale dalla retribuzione lorda annua.
 * Formula: Retribuzione annuale / 13.5
 */
export function calculateTFRQuotaAnnuale(retribuzioneAnnuale: number): number {
  if (retribuzioneAnnuale <= 0) return 0
  return Math.round((retribuzioneAnnuale / TFR_DIVISOR) * 100) / 100
}

/**
 * Calcola la rivalutazione TFR per un anno.
 * Formula: TFR accumulato * (1.5% fisso + 75% * inflazione ISTAT)
 */
export function calculateTFRRivalutazione(
  tfrAccumulato: number,
  inflazioneIstat: number
): number {
  if (tfrAccumulato <= 0) return 0
  const tassoRivalutazione = TFR_RIVALUTAZIONE_FISSA + (TFR_RIVALUTAZIONE_ISTAT_PERCENT * inflazioneIstat)
  return Math.round(tfrAccumulato * tassoRivalutazione * 100) / 100
}

/**
 * Calcola il TFR maturato cumulativo dai cedolini per un dato anno.
 */
export function calculateTFRFromPayslips(
  payslips: Payslip[],
  anno: number
): ApiResult<TFRData> {
  const payslipsAnno = payslips.filter(p => p.year === anno)
  if (payslipsAnno.length === 0) {
    return { success: false, error: `Nessun cedolino trovato per l'anno ${anno}` }
  }

  const retribuzioneLordaAnnuale = payslipsAnno.reduce((sum, p) => sum + p.grossSalary, 0)
  const tfrDaCedolini = payslipsAnno.reduce((sum, p) => sum + (p.tfr ?? 0), 0)
  const quotaCalcolata = calculateTFRQuotaAnnuale(retribuzioneLordaAnnuale)
  const quota = tfrDaCedolini > 0 ? tfrDaCedolini : quotaCalcolata

  return {
    success: true,
    data: {
      annoCompetenza: anno,
      retribuzioneAnnuale: Math.round(retribuzioneLordaAnnuale * 100) / 100,
      quota: Math.round(quota * 100) / 100,
      rivalutazione: 0,
      totale: Math.round(quota * 100) / 100,
    },
  }
}

/**
 * Calcola il TFR cumulativo multi-anno con rivalutazione.
 * @param annualData Array di dati TFR annuali ordinati per anno crescente
 * @param inflazionePerAnno Mappa anno -> tasso inflazione ISTAT (es. { 2025: 0.02 })
 */
export function calculateTFRCumulativo(
  annualData: TFRData[],
  inflazionePerAnno: Record<number, number>
): ApiResult<TFRData[]> {
  if (annualData.length === 0) {
    return { success: false, error: 'Nessun dato TFR fornito' }
  }

  // type-guard filter (main): skip entries without annoCompetenza
  const sorted = [...annualData]
    .filter((d): d is TFRData & { annoCompetenza: number } => d.annoCompetenza !== undefined)
    .sort((a, b) => a.annoCompetenza - b.annoCompetenza)
  const result: TFRData[] = []
  let tfrAccumulato = 0

  for (const data of sorted) {
    const inflazione = inflazionePerAnno[data.annoCompetenza] ?? 0
    const rivalutazione = calculateTFRRivalutazione(tfrAccumulato, inflazione)
    tfrAccumulato += rivalutazione + (data.quota ?? 0)
    result.push({
      ...data,
      annoCompetenza: data.annoCompetenza,
      retribuzioneAnnuale: data.retribuzioneAnnuale ?? 0,
      quota: data.quota ?? 0,
      rivalutazione: Math.round(rivalutazione * 100) / 100,
      totale: Math.round(tfrAccumulato * 100) / 100,
    })
  }

  return { success: true, data: result }
}

// ---------------------------------------------------------------------------
// FON.TE / PENSION FUND CONTRIBUTIONS
// ---------------------------------------------------------------------------

/**
 * Calcola il totale versamenti Fon.Te per un anno dai cedolini.
 * Returns full FonteData with id/nome/codice/tipologia/timestamps (main version).
 */
export function calculateFonteFromPayslips(
  payslips: Payslip[],
  anno: number,
  tfrConferito = 0
): ApiResult<FonteData> {
  const payslipsAnno = payslips.filter(p => p.year === anno)
  if (payslipsAnno.length === 0) {
    return { success: false, error: `Nessun cedolino trovato per l'anno ${anno}` }
  }

  const quotaDipendente = payslipsAnno.reduce((sum, p) => sum + (p.fondoPensione ?? 0), 0)
  const quotaDatore = Math.round(quotaDipendente * 100) / 100
  const totale = quotaDipendente + quotaDatore + tfrConferito

  return {
    success: true,
    data: {
      id: `fonte-${anno}`,
      nome: 'Fon.Te',
      codice: 'FONTE',
      tipologia: 'chiuso',
      anno,
      quotaDipendente: Math.round(quotaDipendente * 100) / 100,
      quotaDatore: Math.round(quotaDatore * 100) / 100,
      tfr: Math.round(tfrConferito * 100) / 100,
      totale: Math.round(totale * 100) / 100,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
  }
}

/**
 * Verifica se il totale versamenti annui supera il tetto di deducibilità fiscale.
 * Tetto annuo: €5.164,57
 */
export function checkDeducibilitaFonte(totaleVersamenti: number): {
  deducibile: number
  eccedenza: number
  superaTetto: boolean
} {
  const deducibile = Math.min(totaleVersamenti, FONTE_DEDUCIBILITA_ANNUA)
  const eccedenza = Math.max(0, totaleVersamenti - FONTE_DEDUCIBILITA_ANNUA)
  return {
    deducibile: Math.round(deducibile * 100) / 100,
    eccedenza: Math.round(eccedenza * 100) / 100,
    superaTetto: eccedenza > 0,
  }
}

// ---------------------------------------------------------------------------
// PENSION PROJECTION
// ---------------------------------------------------------------------------

export interface PensionProjection {
  etaAttuale: number
  etaPensione: number
  anniAlPensionamento: number
  montanteAttuale: number
  contribuzioneAnnuaStimata: number
  tassoRendimentoAtteso: number
  montanteProiettato: number
  rendimentoTotale: number
}

/**
 * Proiezione montante pensionistico a 67 anni.
 * Usa interesse composto: M = P * (1 + r)^n + C * [(1 + r)^n - 1] / r
 */
export function calculatePensionProjection(
  montanteAttuale: number,
  contribuzioneAnnua: number,
  etaAttuale: number,
  tassoRendimentoAnnuo: number,
  etaPensione = ETA_PENSIONE_DEFAULT
): ApiResult<PensionProjection> {
  if (etaAttuale >= etaPensione) {
    return { success: false, error: 'Età attuale deve essere inferiore all\'età pensione' }
  }
  if (etaAttuale < 18 || etaAttuale > 100) {
    return { success: false, error: 'Età attuale non valida (range: 18-100)' }
  }
  if (tassoRendimentoAnnuo < -0.2 || tassoRendimentoAnnuo > 0.3) {
    return { success: false, error: 'Tasso rendimento fuori range (-20% / +30%)' }
  }

  const anniAlPensionamento = etaPensione - etaAttuale
  const r = tassoRendimentoAnnuo

  let montanteProiettato: number
  if (r === 0) {
    montanteProiettato = montanteAttuale + contribuzioneAnnua * anniAlPensionamento
  } else {
    const fattoreCrescita = Math.pow(1 + r, anniAlPensionamento)
    const montanteCapitalizzato = montanteAttuale * fattoreCrescita
    const contributiCapitalizzati = contribuzioneAnnua * ((fattoreCrescita - 1) / r)
    montanteProiettato = montanteCapitalizzato + contributiCapitalizzati
  }

  const contributiTotali = montanteAttuale + contribuzioneAnnua * anniAlPensionamento
  const rendimentoTotale = montanteProiettato - contributiTotali

  return {
    success: true,
    data: {
      etaAttuale,
      etaPensione,
      anniAlPensionamento,
      montanteAttuale: Math.round(montanteAttuale * 100) / 100,
      contribuzioneAnnuaStimata: Math.round(contribuzioneAnnua * 100) / 100,
      tassoRendimentoAtteso: tassoRendimentoAnnuo,
      montanteProiettato: Math.round(montanteProiettato * 100) / 100,
      rendimentoTotale: Math.round(rendimentoTotale * 100) / 100,
    },
  }
}

// ---------------------------------------------------------------------------
// TFR COMPARISON: AZIENDA vs FONDO PENSIONE
// ---------------------------------------------------------------------------

export interface TFRComparison {
  anniSimulazione: number
  tfrAzienda: {
    montanteFinale: number
    rivalutazioneTotale: number
  }
  tfrFondo: {
    montanteFinale: number
    rendimentoTotale: number
  }
  differenza: number
  convenienza: 'azienda' | 'fondo' | 'pari'
}

export function compareTFRAziendaVsFondo(
  quotaTfrAnnua: number,
  anni: number,
  inflazioneMedia: number,
  rendimentoFondo: number
): ApiResult<TFRComparison> {
  if (quotaTfrAnnua <= 0) {
    return { success: false, error: 'Quota TFR annua deve essere positiva' }
  }
  if (anni <= 0 || anni > 50) {
    return { success: false, error: 'Anni simulazione deve essere tra 1 e 50' }
  }

  let tfrAzienda = 0
  let rivalutazioneTotaleAzienda = 0
  for (let i = 0; i < anni; i++) {
    const rivalutazione = calculateTFRRivalutazione(tfrAzienda, inflazioneMedia)
    rivalutazioneTotaleAzienda += rivalutazione
    tfrAzienda += rivalutazione + quotaTfrAnnua
  }

  let tfrFondo = 0
  for (let i = 0; i < anni; i++) {
    tfrFondo = (tfrFondo + quotaTfrAnnua) * (1 + rendimentoFondo)
  }
  const contributiTotaliFondo = quotaTfrAnnua * anni
  const rendimentoTotaleFondo = tfrFondo - contributiTotaliFondo

  const differenza = tfrFondo - tfrAzienda
  let convenienza: 'azienda' | 'fondo' | 'pari' = 'pari'
  if (Math.abs(differenza) > 100) {
    convenienza = differenza > 0 ? 'fondo' : 'azienda'
  }

  return {
    success: true,
    data: {
      anniSimulazione: anni,
      tfrAzienda: {
        montanteFinale: Math.round(tfrAzienda * 100) / 100,
        rivalutazioneTotale: Math.round(rivalutazioneTotaleAzienda * 100) / 100,
      },
      tfrFondo: {
        montanteFinale: Math.round(tfrFondo * 100) / 100,
        rendimentoTotale: Math.round(rendimentoTotaleFondo * 100) / 100,
      },
      differenza: Math.round(differenza * 100) / 100,
      convenienza,
    },
  }
}

// ---------------------------------------------------------------------------
// CRUD: PENSION FUNDS
// ---------------------------------------------------------------------------

export async function createPensionFund(
  uid: string,
  data: Omit<PensionFund, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResult<string>> {
  try {
    await logAudit({ uid, action: 'create', entityType: 'investment', entityId: 'pending' })
    const colRef = collection(db, FUNDS_COLLECTION(uid))
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    return { success: true, data: docRef.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function updatePensionFund(
  uid: string,
  fundId: string,
  updates: Partial<Omit<PensionFund, 'id' | 'createdAt'>>
): Promise<ApiResult<undefined>> {
  try {
    await logAudit({ uid, action: 'update', entityType: 'investment', entityId: fundId })
    const docRef = doc(db, FUNDS_COLLECTION(uid), fundId)
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    })
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function deletePensionFund(
  uid: string,
  fundId: string
): Promise<ApiResult<undefined>> {
  try {
    await logAudit({ uid, action: 'delete', entityType: 'investment', entityId: fundId })
    const docRef = doc(db, FUNDS_COLLECTION(uid), fundId)
    await deleteDoc(docRef)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getPensionFund(
  uid: string,
  fundId: string
): Promise<ApiResult<PensionFund>> {
  try {
    const docRef = doc(db, FUNDS_COLLECTION(uid), fundId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) {
      return { success: false, error: 'Fondo pensione non trovato' }
    }
    return { success: true, data: { id: snap.id, ...snap.data() } as PensionFund }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getAllPensionFunds(uid: string): Promise<ApiResult<PensionFund[]>> {
  try {
    const q = query(collection(db, FUNDS_COLLECTION(uid)), orderBy('nome', 'asc'))
    const snap = await getDocs(q)
    const funds: PensionFund[] = []
    snap.forEach((d) => { funds.push({ id: d.id, ...d.data() } as PensionFund) })
    return { success: true, data: funds }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// ---------------------------------------------------------------------------
// CRUD: PENSION CONTRIBUTIONS
// ---------------------------------------------------------------------------

export async function recordContribution(
  uid: string,
  data: Omit<PensionContribution, 'id' | 'totale' | 'createdAt' | 'updatedAt'>
): Promise<ApiResult<string>> {
  try {
    // optional chaining (main): handles undefined quotaDipendente/quotaDatore/tfrConferito
    const totale = (data.quotaDipendente ?? 0) + (data.quotaDatore ?? 0) + (data.tfrConferito ?? 0)
    await logAudit({ uid, action: 'create', entityType: 'investment', entityId: 'pending' })
    const colRef = collection(db, CONTRIBUTIONS_COLLECTION(uid))
    const docRef = await addDoc(colRef, {
      ...data,
      totale: Math.round(totale * 100) / 100,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    return { success: true, data: docRef.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getContributionsByFund(
  uid: string,
  fundId: string
): Promise<ApiResult<PensionContribution[]>> {
  try {
    const q = query(
      collection(db, CONTRIBUTIONS_COLLECTION(uid)),
      orderBy('anno', 'desc')
    )
    const snap = await getDocs(q)
    const contributions: PensionContribution[] = []
    snap.forEach((d) => {
      const contrib = { id: d.id, ...d.data() } as PensionContribution
      if (contrib.fundId === fundId) {
        contributions.push(contrib)
      }
    })
    return { success: true, data: contributions }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
