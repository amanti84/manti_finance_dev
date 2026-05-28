/**
 * whatIf.ts
 * What-if Engine — simulazioni scenari finanziari.
 * Calcola l'impatto di diverse decisioni (estinzione mutuo, investimenti, PAC, RAL)
 * senza modificare i dati reali.
 * Issue #27 — M2 Core Modules
 */
import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import type {
  Scenario,
  ScenarioInput,
  ScenarioOutput,
  ApiResult,
} from '../types'
import { logAudit } from './audit'
import { getMutuoConfig, simulateAnticipatedExtinction } from './mutuo'
import { listSnapshots } from './snapshot'
import { getPayslipsByYear } from './payroll'

const COLLECTION = (uid: string) => `users/${uid}/scenarios`

// ---------------------------------------------------------------------------
// CRUD OPERATIONS
// ---------------------------------------------------------------------------

/**
 * Salva uno scenario simulato nel database.
 */
export async function saveScenario(
  uid: string,
  name: string,
  input: ScenarioInput,
  output: ScenarioOutput,
  baselineSnapshotId: string
): Promise<ApiResult<Scenario>> {
  try {
    const colRef = collection(db, COLLECTION(uid))
    const scenarioData = {
      name,
      input,
      output,
      baselineSnapshotId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(colRef, scenarioData)

    await logAudit({
      uid,
      action: 'create',
      entityType: 'scenario',
      entityId: docRef.id,
      newValue: { name, type: input.type },
    })

    const savedScenario: Scenario = {
      id: docRef.id,
      ...scenarioData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as Scenario

    return { success: true, data: savedScenario }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Recupera la lista degli scenari salvati per l'utente.
 */
export async function getSavedScenarios(uid: string): Promise<ApiResult<Scenario[]>> {
  try {
    const q = query(collection(db, COLLECTION(uid)), orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    const scenarios = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Scenario)
    )
    return { success: true, data: scenarios }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Elimina uno scenario salvato.
 */
export async function deleteScenario(
  uid: string,
  scenarioId: string
): Promise<ApiResult<void>> {
  try {
    const docRef = doc(db, COLLECTION(uid), scenarioId)
    await deleteDoc(docRef)

    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// ---------------------------------------------------------------------------
// SIMULATION ENGINE
// ---------------------------------------------------------------------------

/**
 * Calcola l'output di uno scenario (funzione pura, no Firestore write).
 */
export async function simulateScenario(
  uid: string,
  input: ScenarioInput
): Promise<ApiResult<ScenarioOutput>> {
  try {
    const snapshots = await listSnapshots(uid, 1)
    const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null
    const patrimonioAttuale = latestSnapshot?.patrimonioNetto ?? 0

    switch (input.type) {
      case 'ESTINZIONE_MUTUO':
        return await simulateEstinzioneMutuo(uid, input.params, patrimonioAttuale)
      case 'INVESTIMENTO_ETF':
        return simulateInvestimentoEtf(input.params, patrimonioAttuale)
      case 'AUMENTO_PAC':
        return await simulateAumentoPac(input.params, patrimonioAttuale)
      case 'VARIAZIONE_RAL':
        return await simulateVariazioneRal(uid, input.params, patrimonioAttuale)
      default:
        return { success: false, error: 'Tipo scenario non supportato' }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// ---------------------------------------------------------------------------
// SCENARIO LOGICS
// ---------------------------------------------------------------------------

async function simulateEstinzioneMutuo(
  uid: string,
  params: Record<string, number>,
  patrimonioAttuale: number
): Promise<ApiResult<ScenarioOutput>> {
  const { importoEstinzione } = params
  if (!importoEstinzione || importoEstinzione <= 0) {
    return { success: false, error: 'Importo estinzione non valido' }
  }

  const mutuoResult = await getMutuoConfig(uid)
  if (!mutuoResult.success) return { success: false, error: mutuoResult.error }
  const config = mutuoResult.data

  // Se l'importo di estinzione copre almeno il 95% del debito residuo, simuliamo estinzione totale
  const isTotal = importoEstinzione >= config.debitoResiduo * 0.95

  // Simuliamo l'estinzione alla data odierna
  const simResult = simulateAnticipatedExtinction(config, new Date(), 0)
  if (!simResult.success) return { success: false, error: simResult.error }
  const sim = simResult.data

  let risparmioInteressi = 0
  let nuovoSurplus = 0
  let descrizione = ''

  if (isTotal) {
    risparmioInteressi = sim.interessiRisparmiati
    nuovoSurplus = config.rataMensile
    descrizione = `Estinguendo totalmente il mutuo risparmieresti ${Math.round(risparmioInteressi)}€ di interessi e libereresti ${Math.round(nuovoSurplus)}€ di surplus mensile.`
  } else {
    // Estinzione parziale: stima proporzionale del risparmio interessi
    const quotaEstinta = importoEstinzione / config.debitoResiduo
    risparmioInteressi = sim.interessiRisparmiati * quotaEstinta
    // Supponendo di mantenere la stessa durata, la rata si riduce proporzionalmente
    nuovoSurplus = config.rataMensile * quotaEstinta
    descrizione = `Con un'estinzione parziale di ${importoEstinzione}€, risparmieresti circa ${Math.round(risparmioInteressi)}€ di interessi e ridurresti la rata di ${Math.round(nuovoSurplus)}€.`
  }

  // Patrimonio proiettato a 5 anni: tiene conto del risparmio interessi e del surplus liberato
  const patrimonioProiettato = patrimonioAttuale + risparmioInteressi + (nuovoSurplus * 12 * 5)

  return {
    success: true,
    data: {
      patrimonioProiettato: Math.round(patrimonioProiettato),
      surplusMensileProiettato: Math.round(nuovoSurplus),
      risparmioInteressi: Math.round(risparmioInteressi),
      costoOpportunita: Math.round(importoEstinzione * 0.04 * 5), // Stima 4% rendimento perso su 5 anni
      descrizione,
    },
  }
}

function simulateInvestimentoEtf(
  params: Record<string, number>,
  patrimonioAttuale: number
): ApiResult<ScenarioOutput> {
  const { importoInvestimento, anni = 10, rendimentoAnnuo = 7 } = params
  if (!importoInvestimento || importoInvestimento <= 0) {
    return { success: false, error: 'Importo investimento non valido' }
  }

  const r = rendimentoAnnuo / 100
  const montante = importoInvestimento * Math.pow(1 + r, anni)
  const patrimonioProiettato = patrimonioAttuale - importoInvestimento + montante

  return {
    success: true,
    data: {
      patrimonioProiettato: Math.round(patrimonioProiettato),
      surplusMensileProiettato: 0,
      costoOpportunita: Math.round(importoInvestimento * 0.01 * anni), // Stima inflazione/costi
      descrizione: `Investendo ${importoInvestimento}€ per ${anni} anni con un rendimento del ${rendimentoAnnuo}%, il capitale diventerebbe ${Math.round(montante)}€.`,
    },
  }
}

async function simulateAumentoPac(
  params: Record<string, number>,
  patrimonioAttuale: number
): Promise<ApiResult<ScenarioOutput>> {
  const { incrementoMensile, anni = 5 } = params
  if (!incrementoMensile || incrementoMensile <= 0) {
    return { success: false, error: 'Incremento mensile non valido' }
  }

  // Stima rendimento PAC 6%
  const rMensile = 0.06 / 12
  const mesi = anni * 12
  const montante = incrementoMensile * ((Math.pow(1 + rMensile, mesi) - 1) / rMensile)

  const patrimonioProiettato = patrimonioAttuale + montante

  return {
    success: true,
    data: {
      patrimonioProiettato: Math.round(patrimonioProiettato),
      surplusMensileProiettato: -incrementoMensile, // Il surplus libero diminuisce
      costoOpportunita: 0,
      descrizione: `Aumentando il PAC di ${incrementoMensile}€ al mese, tra ${anni} anni avresti accumulato circa ${Math.round(montante)}€ extra.`,
    },
  }
}

async function simulateVariazioneRal(
  uid: string,
  params: Record<string, number>,
  patrimonioAttuale: number
): Promise<ApiResult<ScenarioOutput>> {
  const { nuovaRal } = params
  if (!nuovaRal || nuovaRal <= 0) {
    return { success: false, error: 'Nuova RAL non valida' }
  }

  // Stima grossolana netto da RAL (coefficiente 0.65 - 0.70)
  const nuovoNettoMensile = (nuovaRal * 0.65) / 12

  // Recuperiamo ultimo cedolino per confronto
  const currentYear = new Date().getFullYear()
  const payslipsResult = await getPayslipsByYear(uid, currentYear)
  let vecchioNetto = 0
  if (payslipsResult.success && payslipsResult.data.length > 0) {
    vecchioNetto = payslipsResult.data[payslipsResult.data.length - 1].netSalary
  } else {
    vecchioNetto = nuovoNettoMensile * 0.9 // fallback se non ci sono dati
  }

  const deltaNetto = nuovoNettoMensile - vecchioNetto
  const patrimonioProiettato = patrimonioAttuale + (deltaNetto * 12 * 5)

  return {
    success: true,
    data: {
      patrimonioProiettato: Math.round(patrimonioProiettato),
      surplusMensileProiettato: Math.round(deltaNetto),
      costoOpportunita: 0,
      descrizione: `Con una RAL di ${nuovaRal}€, il tuo netto mensile stimato sarebbe di ${Math.round(nuovoNettoMensile)}€ (+${Math.round(deltaNetto)}€ rispetto ad ora).`,
    },
  }
}
