/**
 * mutuo.ts
 * Mutuo Service — tracking mutuo immobiliare con calcolo ammortamento francese,
 * piano rate dettagliato, simulazione estinzione anticipata, tracking debito residuo.
 * Issue #13 — M2 Core Modules
 */
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import type { MutuoConfig, ApiResult } from '../types'
import { logAuditEvent } from './audit'

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface RataDettaglio {
  numero: number
  data: Date
  rataTotale: number
  quotaCapitale: number
  quotaInteressi: number
  debitoResiduo: number
}

export interface PianoAmmortamento {
  config: MutuoConfig
  rate: RataDettaglio[]
  totaleInteressi: number
  totaleCapitale: number
  numeroRateRimanenti: number
  percentualeRimborso: number
}

export interface SimulazioneEstinzione {
  dataEstinzione: Date
  debitoResiduoAttuale: number
  interessiRisparmiati: number
  rateRisparmiate: number
  risparmioTotale: number
  costoEstinzioneAnticipata: number
  convenienza: boolean
}

export interface MutuoSummary {
  debitoResiduo: number
  importoPagato: number
  interessiPagati: number
  percentualeRimborso: number
  rateRimanenti: number
  ratePagate: number
  rataTotale: number
  prossimaRata: Date | null
  scadenza: Date
}

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------

const COLLECTION = (uid: string) => `users/${uid}/mutuo`
const MUTUO_DOC_ID = 'config'

/**
 * Calcola il numero di rate mensili tra due date.
 */
function calcolaNumeroRate(dataInizio: Date, dataFine: Date): number {
  const mesi =
    (dataFine.getFullYear() - dataInizio.getFullYear()) * 12 +
    (dataFine.getMonth() - dataInizio.getMonth())
  return mesi
}

/**
 * Calcola la rata mensile con formula ammortamento francese:
 * R = C * [i * (1+i)^n] / [(1+i)^n - 1]
 * dove C = capitale, i = tasso mensile, n = numero rate
 */
function calcolaRataMensile(
  capitale: number,
  tassoAnnuo: number,
  numeroRate: number
): number {
  if (tassoAnnuo === 0) {
    return capitale / numeroRate
  }
  const tassoMensile = tassoAnnuo / 100 / 12
  const fattore = Math.pow(1 + tassoMensile, numeroRate)
  const rata = (capitale * tassoMensile * fattore) / (fattore - 1)
  return Math.round(rata * 100) / 100
}

// ---------------------------------------------------------------------------
// CRUD OPERATIONS
// ---------------------------------------------------------------------------

/**
 * Salva o aggiorna la configurazione del mutuo.
 * Usa un singolo documento con ID fisso 'config' per semplicità.
 */
export async function saveMutuoConfig(
  uid: string,
  config: MutuoConfig
): Promise<ApiResult<void>> {
  try {
    const db = getFirestore()
    const docRef = doc(db, COLLECTION(uid), MUTUO_DOC_ID)

    const existing = await getDoc(docRef)
    const isUpdate = existing.exists()

    await setDoc(docRef, config, { merge: true })

    // Audit trail
    await logAuditEvent(uid, {
      action: isUpdate ? 'mutuo.updated' : 'mutuo.created',
      entityType: 'Mutuo',
      entityId: MUTUO_DOC_ID,
      metadata: { debitoResiduo: config.debitoResiduo, tasso: config.tasso },
    })

    return { success: true, data: undefined }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Recupera la configurazione del mutuo.
 */
export async function getMutuoConfig(uid: string): Promise<ApiResult<MutuoConfig>> {
  try {
    const db = getFirestore()
    const docRef = doc(db, COLLECTION(uid), MUTUO_DOC_ID)
    const snap = await getDoc(docRef)

    if (!snap.exists()) {
      return { success: false, error: 'Configurazione mutuo non trovata' }
    }

    return { success: true, data: snap.data() as MutuoConfig }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Aggiorna il debito residuo del mutuo.
 * Utile per allineare dopo pagamenti extra o ricalcoli.
 */
export async function updateDebitoResiduo(
  uid: string,
  nuovoDebito: number
): Promise<ApiResult<void>> {
  try {
    const db = getFirestore()
    const docRef = doc(db, COLLECTION(uid), MUTUO_DOC_ID)

    await updateDoc(docRef, { debitoResiduo: nuovoDebito })

    // Audit trail
    await logAuditEvent(uid, {
      action: 'mutuo.debito_updated',
      entityType: 'Mutuo',
      entityId: MUTUO_DOC_ID,
      metadata: { nuovoDebito },
    })

    return { success: true, data: undefined }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

// ---------------------------------------------------------------------------
// CALCOLI AMMORTAMENTO
// ---------------------------------------------------------------------------

/**
 * Genera il piano di ammortamento completo con dettaglio di ogni rata.
 * Usa ammortamento francese (rata costante, quota capitale crescente).
 */
export function getPianoAmmortamento(config: MutuoConfig): ApiResult<PianoAmmortamento> {
  try {
    const dataInizio = config.dataInizio.toDate()
    const dataFine = config.dataFine.toDate()
    const numeroRate = calcolaNumeroRate(dataInizio, dataFine)

    if (numeroRate <= 0) {
      return { success: false, error: 'Date mutuo non valide' }
    }

    const rataMensile = config.rataMensile
    const tassoMensile = config.tasso / 100 / 12
    let debitoResiduo = config.importoOriginale

    const rate: RataDettaglio[] = []
    let totaleInteressi = 0

    for (let i = 1; i <= numeroRate; i++) {
      const dataRata = new Date(dataInizio)
      dataRata.setMonth(dataRata.getMonth() + i)

      const quotaInteressi = Math.round(debitoResiduo * tassoMensile * 100) / 100
      const quotaCapitale = Math.round((rataMensile - quotaInteressi) * 100) / 100
      debitoResiduo = Math.max(0, Math.round((debitoResiduo - quotaCapitale) * 100) / 100)

      totaleInteressi += quotaInteressi

      rate.push({
        numero: i,
        data: dataRata,
        rataTotale: rataMensile,
        quotaCapitale,
        quotaInteressi,
        debitoResiduo,
      })

      if (debitoResiduo === 0) break
    }

    const debitoResiduoAttuale = config.debitoResiduo
    const ratePagate = rate.findIndex((r) => r.debitoResiduo <= debitoResiduoAttuale)
    const numeroRateRimanenti = numeroRate - (ratePagate >= 0 ? ratePagate : 0)
    const percentualeRimborso =
      config.importoOriginale > 0
        ? Math.round(
            ((config.importoOriginale - debitoResiduoAttuale) / config.importoOriginale) *
              10000
          ) / 100
        : 0

    return {
      success: true,
      data: {
        config,
        rate,
        totaleInteressi: Math.round(totaleInteressi * 100) / 100,
        totaleCapitale: config.importoOriginale,
        numeroRateRimanenti,
        percentualeRimborso,
      },
    }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Calcola il debito residuo a una data specifica.
 */
export function getDebitoResiduoAllaData(
  config: MutuoConfig,
  data: Date
): ApiResult<number> {
  const pianoResult = getPianoAmmortamento(config)
  if (!pianoResult.success) {
    return pianoResult
  }

  const piano = pianoResult.data!
  const rataTarget = piano.rate.find((r) => r.data >= data)

  if (!rataTarget) {
    return { success: true, data: 0 }
  }

  return { success: true, data: rataTarget.debitoResiduo }
}

/**
 * Genera un summary sintetico del mutuo con i dati principali.
 */
export function getMutuoSummary(config: MutuoConfig): ApiResult<MutuoSummary> {
  try {
    const dataInizio = config.dataInizio.toDate()
    const dataFine = config.dataFine.toDate()
    const numeroRateTotali = calcolaNumeroRate(dataInizio, dataFine)

    const pianoResult = getPianoAmmortamento(config)
    if (!pianoResult.success) {
      return pianoResult
    }

    const piano = pianoResult.data!
    const importoPagato = config.importoOriginale - config.debitoResiduo
    const ratePagate = piano.rate.findIndex((r) => r.debitoResiduo <= config.debitoResiduo)
    const rateRimanenti = numeroRateTotali - (ratePagate >= 0 ? ratePagate : 0)

    const interessiPagati = piano.rate
      .slice(0, ratePagate >= 0 ? ratePagate : 0)
      .reduce((sum, r) => sum + r.quotaInteressi, 0)

    const oggi = new Date()
    const prossimaRata = piano.rate.find((r) => r.data > oggi)

    return {
      success: true,
      data: {
        debitoResiduo: config.debitoResiduo,
        importoPagato: Math.round(importoPagato * 100) / 100,
        interessiPagati: Math.round(interessiPagati * 100) / 100,
        percentualeRimborso: piano.percentualeRimborso,
        rateRimanenti,
        ratePagate: ratePagate >= 0 ? ratePagate : 0,
        rataTotale: config.rataMensile,
        prossimaRata: prossimaRata ? prossimaRata.data : null,
        scadenza: dataFine,
      },
    }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

// ---------------------------------------------------------------------------
// SIMULAZIONI
// ---------------------------------------------------------------------------

/**
 * Simula l'estinzione anticipata del mutuo a una data specifica.
 */
export function simulateAnticipatedExtinction(
  config: MutuoConfig,
  dataEstinzione: Date,
  penalePercentuale = 0
): ApiResult<SimulazioneEstinzione> {
  try {
    const pianoResult = getPianoAmmortamento(config)
    if (!pianoResult.success || !pianoResult.data) {
      return { success: false, error: pianoResult.error }
    }

    const piano = pianoResult.data

    const rataEstinzione = piano.rate.find((r) => r.data >= dataEstinzione)
    if (!rataEstinzione) {
      return { success: false, error: 'Data estinzione oltre la scadenza del mutuo' }
    }

    const debitoResiduoAttuale = rataEstinzione.debitoResiduo

    const interessiRimanenti = piano.rate
      .filter((r) => r.numero >= rataEstinzione.numero)
      .reduce((sum, r) => sum + r.quotaInteressi, 0)

    const rateRisparmiate = piano.rate.filter(
      (r) => r.numero >= rataEstinzione.numero
    ).length

    const costoEstinzione = Math.round(debitoResiduoAttuale * (penalePercentuale / 100) * 100) / 100
    const risparmioLordo = Math.round(interessiRimanenti * 100) / 100
    const risparmioNetto = Math.round((risparmioLordo - costoEstinzione) * 100) / 100

    return {
      success: true,
      data: {
        dataEstinzione,
        debitoResiduoAttuale: Math.round(debitoResiduoAttuale * 100) / 100,
        interessiRisparmiati: risparmioLordo,
        rateRisparmiate,
        risparmioTotale: risparmioNetto,
        costoEstinzioneAnticipata: costoEstinzione,
        convenienza: risparmioNetto > 0,
      },
    }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Calcola quanto si risparmierebbe facendo un pagamento extra (capitale aggiuntivo)
 * senza estinguere completamente il mutuo.
 */
export function simulateExtraPayment(
  config: MutuoConfig,
  importoExtra: number
): ApiResult<{ rateRisparmiate: number; interessiRisparmiati: number; nuovaScadenza: Date }> {
  try {
    const nuovoDebito = Math.max(0, config.debitoResiduo - importoExtra)
    const configRidotto: MutuoConfig = {
      ...config,
      debitoResiduo: nuovoDebito,
      importoOriginale: nuovoDebito,
    }

    const pianoOriginale = getPianoAmmortamento(config)
    const pianoRidotto = getPianoAmmortamento(configRidotto)

    if (pianoOriginale.error || pianoRidotto.error) {
      return { success: false, error: 'Errore nel calcolo dei piani' }
    }

    const interessiOriginali = pianoOriginale.data!.totaleInteressi
    const interessiRidotti = pianoRidotto.data!.totaleInteressi
    const interessiRisparmiati = Math.round((interessiOriginali - interessiRidotti) * 100) / 100

    const rateOriginali = pianoOriginale.data!.rate.length
    const rateRidotte = pianoRidotto.data!.rate.length
    const rateRisparmiate = rateOriginali - rateRidotte

    const ultimaRata = pianoRidotto.data!.rate[pianoRidotto.data!.rate.length - 1]

    return {
      success: true,
      data: {
        rateRisparmiate,
        interessiRisparmiati,
        nuovaScadenza: ultimaRata.data,
      },
    }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}
