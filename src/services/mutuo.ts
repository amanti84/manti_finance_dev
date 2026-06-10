/**
 * mutuo.ts
 * Mutuo Service — tracking mutuo immobiliare con calcolo ammortamento francese,
 * piano rate dettagliato, simulazione estinzione anticipata, tracking debito residuo.
 * Issue #13 — M2 Core Modules
 */
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import type { Timestamp } from 'firebase/firestore'
import type { MutuoConfig, ApiResult, OverpaymentSimulation } from '../types'
import { logAudit } from './audit'

export interface RataDettaglio {
  numero: number
  data: Timestamp | Date
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
  dataEstinzione: Timestamp | Date
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
  prossimaRata: Timestamp | Date | null
  scadenza: Timestamp | Date
}

const COLLECTION = (uid: string) => `users/${uid}/mutuo`
const MUTUO_DOC_ID = 'config'

function calcolaNumeroRate(dataInizio: Date, dataFine: Date): number {
  const mesi =
    (dataFine.getFullYear() - dataInizio.getFullYear()) * 12 +
    (dataFine.getMonth() - dataInizio.getMonth())
  return mesi
}

function toDateSafe(value: Timestamp | string): Date {
  return typeof value === 'string' ? new Date(value) : value.toDate()
}

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

    await logAudit({
      uid,
      action: isUpdate ? 'update' : 'create',
      entityType: 'config',
      entityId: MUTUO_DOC_ID,
      newValue: { debitoResiduo: config.debitoResiduo, tasso: config.tasso },
    })

    return { success: true, data: undefined }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

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

export async function updateDebitoResiduo(
  uid: string,
  nuovoDebito: number
): Promise<ApiResult<void>> {
  try {
    const db = getFirestore()
    const docRef = doc(db, COLLECTION(uid), MUTUO_DOC_ID)

    await updateDoc(docRef, { debitoResiduo: nuovoDebito })

    await logAudit({
      uid,
      action: 'update',
      entityType: 'config',
      entityId: MUTUO_DOC_ID,
      newValue: { nuovoDebito },
    })

    return { success: true, data: undefined }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export function getPianoAmmortamento(config: MutuoConfig): ApiResult<PianoAmmortamento> {
  try {
    const dataInizio = toDateSafe(config.dataInizio)
    const dataFine = toDateSafe(config.dataFine)
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
      const dataRata = new Date(dataInizio.getTime())
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

export function getDebitoResiduoAllaData(
  config: MutuoConfig,
  data: Date
): ApiResult<number> {
  const pianoResult = getPianoAmmortamento(config)
  if (!pianoResult.success) {
    return pianoResult
  }

  const piano = pianoResult.data
  const rataTarget = piano.rate.find((r) => r.data >= data)

  if (!rataTarget) {
    return { success: true, data: 0 }
  }

  return { success: true, data: rataTarget.debitoResiduo }
}

export function getMutuoSummary(config: MutuoConfig): ApiResult<MutuoSummary> {
  try {
    const dataInizio = toDateSafe(config.dataInizio)
    const dataFine = toDateSafe(config.dataFine)
    const numeroRateTotali = calcolaNumeroRate(dataInizio, dataFine)

    const pianoResult = getPianoAmmortamento(config)
    if (!pianoResult.success) {
      return pianoResult
    }

    const piano = pianoResult.data
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

export function simulateAnticipatedExtinction(
  config: MutuoConfig,
  dataEstinzione: Date,
  penalePercentuale = 0
): ApiResult<SimulazioneEstinzione> {
  try {
    const pianoResult = getPianoAmmortamento(config)
    if (!pianoResult.success) {
      return pianoResult
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

export function simulateExtraPayment(
  config: MutuoConfig,
  importoExtra: number
): ApiResult<OverpaymentSimulation> {
  try {
    const nuovoDebito = Math.max(0, config.debitoResiduo - importoExtra)
    const configRidotto: MutuoConfig = {
      ...config,
      debitoResiduo: nuovoDebito,
      importoOriginale: nuovoDebito,
    }

    const pianoOriginale = getPianoAmmortamento(config)
    const pianoRidotto = getPianoAmmortamento(configRidotto)

    if (!pianoOriginale.success) {
      return { success: false, error: pianoOriginale.error }
    }
    if (!pianoRidotto.success) {
      return { success: false, error: pianoRidotto.error }
    }

    const interessiOriginali = pianoOriginale.data.totaleInteressi
    const interessiRidotti = pianoRidotto.data.totaleInteressi
    const interessiRisparmiati = Math.round((interessiOriginali - interessiRidotti) * 100) / 100

    const rateOriginali = pianoOriginale.data.rate.length
    const rateRidotte = pianoRidotto.data.rate.length
    const rateRisparmiate = rateOriginali - rateRidotte

    const ultimaRata = pianoRidotto.data.rate[pianoRidotto.data.rate.length - 1]
    if (!ultimaRata) {
      return { success: false, error: 'Piano ammortamento ridotto vuoto' }
    }

    return {
      success: true,
      data: {
        rateRisparmiate,
        interessiRisparmiati,
        nuovaScadenza: ultimaRata.data,
        risparmioTotale: interessiRisparmiati,
      },
    }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Alias per simulateExtraPayment allineato a issue #153
 */
export function simulateOverpayment(
  config: MutuoConfig,
  extraAmount: number
): ApiResult<OverpaymentSimulation> {
  return simulateExtraPayment(config, extraAmount)
}

/**
 * Aggiorna la configurazione del mutuo (surroga/rinegoziazione)
 */
export async function updateMutuo(
  uid: string,
  _mutuoId: string,
  updates: Partial<MutuoConfig>
): Promise<ApiResult<void>> {
  try {
    const db = getFirestore()
    const docRef = doc(db, COLLECTION(uid), MUTUO_DOC_ID)

    await updateDoc(docRef, updates)

    await logAudit({
      uid,
      action: 'update',
      entityType: 'config',
      entityId: MUTUO_DOC_ID,
      newValue: updates,
    })

    return { success: true, data: undefined }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Elimina la configurazione del mutuo
 */
export async function deleteMutuo(
  uid: string,
  _mutuoId: string
): Promise<ApiResult<void>> {
  try {
    const db = getFirestore()
    const docRef = doc(db, COLLECTION(uid), MUTUO_DOC_ID)

    await deleteDoc(docRef)

    await logAudit({
      uid,
      action: 'delete',
      entityType: 'config',
      entityId: MUTUO_DOC_ID,
    })

    return { success: true, data: undefined }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Registra un pagamento anticipato parziale
 */
export async function applyPartialRepayment(
  uid: string,
  mutuoId: string,
  amount: number
): Promise<ApiResult<void>> {
  try {
    const configRes = await getMutuoConfig(uid)
    if (!configRes.success) return configRes

    const config = configRes.data
    const nuovoDebito = Math.max(0, Math.round((config.debitoResiduo - amount) * 100) / 100)

    return updateMutuo(uid, mutuoId, { debitoResiduo: nuovoDebito })
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}
