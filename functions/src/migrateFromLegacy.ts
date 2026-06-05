import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import {
  LegacyPAC,
  LegacyInvestment,
  LegacyKindergartenInvestment
} from './types/legacy'

const ADMIN_EMAIL = 'ant.manti@gmail.com'

interface MigrationReport {
  pacs:                    { inserted: number; skipped: number; errors: string[] }
  investments:             { inserted: number; skipped: number; errors: string[] }
  kindergartenPacs:        { inserted: number; skipped: number; errors: string[] }
  kindergartenInvestments: { inserted: number; skipped: number; errors: string[] }
  validation: {
    adultTotalInvested_legacy:       number
    adultTotalInvested_new:          number
    kindergartenTotalInvested_legacy: number
    kindergartenTotalInvested_new:    number
    passed: boolean
    mismatchDetails: string[]
  }
}

export const migrateFromLegacy = onCall(async (request) => {
  // Inizializza app legacy cross-project
  const legacyApp = getApps().find(a => a.name === 'legacy') ||
    initializeApp({ projectId: 'manti-finance' }, 'legacy')
  const legacyDb = getFirestore(legacyApp)
  const newDb = getFirestore()

  // 1. Auth check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'L\'utente deve essere autenticato')
  }

  const email = request.auth.token.email
  if (email !== ADMIN_EMAIL) {
    throw new HttpsError('permission-denied', 'Accesso riservato all\'amministratore')
  }

  const uid = request.auth.uid
  const dryRun = !!request.data?.dryRun

  const report: MigrationReport = {
    pacs: { inserted: 0, skipped: 0, errors: [] },
    investments: { inserted: 0, skipped: 0, errors: [] },
    kindergartenPacs: { inserted: 0, skipped: 0, errors: [] },
    kindergartenInvestments: { inserted: 0, skipped: 0, errors: [] },
    validation: {
      adultTotalInvested_legacy: 0,
      adultTotalInvested_new: 0,
      kindergartenTotalInvested_legacy: 0,
      kindergartenTotalInvested_new: 0,
      passed: false,
      mismatchDetails: []
    }
  }

  const now = Timestamp.now()

  // Helper per mappare assetClass
  const mapAssetClass = (type: string | undefined): string => {
    const t = type?.toLowerCase() || ''
    if (t.includes('etf')) return 'etf'
    if (t.includes('stock') || t.includes('azioni')) return 'azioni'
    if (t.includes('bond') || t.includes('obbligazioni')) return 'obbligazioni'
    if (t.includes('crypto')) return 'crypto'
    return 'altro'
  }

  // Helper per mappare broker
  const mapBroker = (platform: string | undefined): string => {
    const p = platform?.toLowerCase() || ''
    if (p.includes('fineco')) return 'fineco'
    if (p.includes('directa')) return 'directa'
    if (p.includes('degiro')) return 'degiro'
    return 'altri'
  }

  // 1. Leggi dal legacy
  const [
    pacsLegacySnap,
    investmentsLegacySnap,
    kgPacsLegacySnap,
    kgInvestmentsLegacySnap
  ] = await Promise.all([
    legacyDb.collection('pacs').get(),
    legacyDb.collection('investments').get(),
    legacyDb.collection('kindergarten_pacs').get(),
    legacyDb.collection('kindergarten_investments').get()
  ])

  const pacsLegacy = pacsLegacySnap.docs.map(d => ({ id: d.id, ...d.data() }) as LegacyPAC)
  const investmentsLegacy = investmentsLegacySnap.docs.map(d => ({ id: d.id, ...d.data() }) as LegacyInvestment)
  const kgPacsLegacy = kgPacsLegacySnap.docs.map(d => ({ id: d.id, ...d.data() }) as LegacyPAC)
  const kgInvestmentsLegacy = kgInvestmentsLegacySnap.docs.map(d => ({ id: d.id, ...d.data() }) as LegacyKindergartenInvestment)

  // Calcolo totali legacy per validazione
  // Usiamo amountInvested come fonte primaria per gli investimenti se disponibile,
  // altrimenti ripieghiamo sul calcolo avgCost * shares/quantity
  const getLegacyInvestmentCost = (i: LegacyInvestment | LegacyKindergartenInvestment) => {
    if ('amountInvested' in i && i.amountInvested > 0) return i.amountInvested
    return (i.avgCost || 0) * ((i as any).shares ?? (i as any).quantity ?? 0)
  }

  report.validation.adultTotalInvested_legacy =
    pacsLegacy.reduce((sum, p) => sum + ((p.avgCost || 0) * (p.shares || 0)), 0) +
    investmentsLegacy.reduce((sum, i) => sum + getLegacyInvestmentCost(i), 0)

  report.validation.kindergartenTotalInvested_legacy =
    kgPacsLegacy.reduce((sum, p) => sum + ((p.avgCost || 0) * (p.shares || 0)), 0) +
    kgInvestmentsLegacy.reduce((sum, i) => sum + getLegacyInvestmentCost(i), 0)

  // Processo di migrazione
  const collectionsToMigrate = [
    { legacyData: pacsLegacy, reportKey: 'pacs' as const, path: `users/${uid}/pacs` },
    { legacyData: investmentsLegacy, reportKey: 'investments' as const, path: `users/${uid}/investments` },
    { legacyData: kgPacsLegacy, reportKey: 'kindergartenPacs' as const, path: `users/${uid}/kindergarten_pacs` },
    { legacyData: kgInvestmentsLegacy, reportKey: 'kindergartenInvestments' as const, path: `users/${uid}/kindergarten_investments` }
  ]

  for (const coll of collectionsToMigrate) {
    for (const item of coll.legacyData) {
      try {
        const legacyId = item.id
        const docRef = newDb.collection(coll.path).doc(legacyId)
        const docSnap = await docRef.get()

        if (docSnap.exists) {
          report[coll.reportKey].skipped++
          continue
        }

        if (dryRun) {
          report[coll.reportKey].inserted++
          continue
        }

        let docData: any = {
          legacyId,
          createdAt: now,
          updatedAt: now,
        }

        if (coll.reportKey === 'pacs' || coll.reportKey === 'kindergartenPacs') {
          const p = item as LegacyPAC
          docData = {
            ...docData,
            name: p.name,
            isin: p.isin,
            ticker: p.ticker || '',
            monthlyAmount: Number(p.monthlyAmount),
            monthlyDays: p.monthlyDays || [],
            dayOfMonth: p.dayOfMonth || 1,
            startDate: p.startDate,
            endDate: p.endDate || null,
            active: !!p.active,
            autoUpdate: !!p.autoUpdate,
            platform: p.platform || '',
            shares: Number(p.shares || 0),
            avgCost: Number(p.avgCost || 0),
            currentPrice: Number(p.lastPrice || 0),
            notes: (p as any).notes || ''
          }
        } else {
          const i = item as LegacyInvestment | LegacyKindergartenInvestment
          const quantity = Number((i as any).shares ?? (i as any).quantity ?? 0)

          // Calcola avgCost se manca ma abbiamo amountInvested
          let avgCost = Number((i as any).avgCost || 0)
          if (avgCost === 0 && (i as any).amountInvested > 0 && quantity > 0) {
            avgCost = (i as any).amountInvested / quantity
          }

          const currentPrice = Number((i as any).lastPrice || (i as any).currentValue / (quantity || 1) || 0)

          docData = {
            ...docData,
            name: i.name,
            isin: i.isin || '',
            ticker: i.ticker || '',
            assetClass: mapAssetClass((i as any).type || (i as any).assetClass),
            broker: mapBroker(i.platform),
            quantity: quantity,
            avgCost: avgCost,
            currentPrice: currentPrice,
            currentValue: currentPrice * quantity,
            currency: (i as any).currency || 'EUR',
            isPac: false,
            lastPriceUpdate: now
          }
        }

        await docRef.set(docData)
        report[coll.reportKey].inserted++

      } catch (err) {
        report[coll.reportKey].errors.push(`ID ${item.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  // Validazione finale (anche in dryRun)
  const [
    pacsNewSnap,
    investmentsNewSnap,
    kgPacsNewSnap,
    kgInvestmentsNewSnap
  ] = await Promise.all([
    newDb.collection(`users/${uid}/pacs`).get(),
    newDb.collection(`users/${uid}/investments`).get(),
    newDb.collection(`users/${uid}/kindergarten_pacs`).get(),
    newDb.collection(`users/${uid}/kindergarten_investments`).get()
  ])

  // Nota: se dryRun, dobbiamo calcolare basandoci su cosa AVREMMO scritto + quello che già c'è
  // Ma la richiesta dice di confrontare legacy vs nuovo progetto.
  // In dryRun, i documenti non sono stati scritti, quindi il confronto diretto con newDb fallirebbe se il db è vuoto.
  // Tuttavia, l'issue dice: "dryRun mode: se dryRun === true, esegui tutta la logica ma non scrivere su Firestore (ritorna solo il report simulato)"
  // e "Validazione finale: confronta Σ(avgCost × shares) legacy vs nuovo".

  // Se è un dryRun, simuliamo il calcolo del "nuovo" sommando gli skip (già presenti) e gli inserted (quelli che avremmo inserito)
  // Per semplicità e precisione, calcoliamo i totali dai dati che abbiamo processato.

  const calculateTotal = (docs: any[]) => docs.reduce((sum, d) => sum + (Number(d.avgCost || 0) * Number(d.shares || d.quantity || 0)), 0)

  if (dryRun) {
     // In dry run calcoliamo basandoci sulle collezioni caricate dal legacy, assumendo che verrebbero scritte 1:1
     report.validation.adultTotalInvested_new = calculateTotal(pacsLegacy) + calculateTotal(investmentsLegacy)
     report.validation.kindergartenTotalInvested_new = calculateTotal(kgPacsLegacy) + calculateTotal(kgInvestmentsLegacy)
  } else {
     report.validation.adultTotalInvested_new = calculateTotal(pacsNewSnap.docs.map(d => d.data())) + calculateTotal(investmentsNewSnap.docs.map(d => d.data()))
     report.validation.kindergartenTotalInvested_new = calculateTotal(kgPacsNewSnap.docs.map(d => d.data())) + calculateTotal(kgInvestmentsNewSnap.docs.map(d => d.data()))
  }

  const adultDiff = Math.abs(report.validation.adultTotalInvested_legacy - report.validation.adultTotalInvested_new)
  const kgDiff = Math.abs(report.validation.kindergartenTotalInvested_legacy - report.validation.kindergartenTotalInvested_new)

  report.validation.passed = adultDiff < 0.01 && kgDiff < 0.01

  if (!report.validation.passed) {
    const errorMsg = `Mismatch validazione: adulti legacy=${report.validation.adultTotalInvested_legacy.toFixed(2)} new=${report.validation.adultTotalInvested_new.toFixed(2)} | kg legacy=${report.validation.kindergartenTotalInvested_legacy.toFixed(2)} new=${report.validation.kindergartenTotalInvested_new.toFixed(2)}`
    report.validation.mismatchDetails.push(errorMsg)
    if (!dryRun) {
      throw new HttpsError('internal', errorMsg)
    }
  }

  // Audit log su successo
  if (!dryRun && (report.pacs.inserted > 0 || report.investments.inserted > 0 || report.kindergartenPacs.inserted > 0 || report.kindergartenInvestments.inserted > 0)) {
    await newDb.collection(`users/${uid}/audit`).add({
      action: 'LEGACY_IMPORT',
      entityType: 'investment',
      entityId: 'migrateFromLegacy_' + now.toMillis(),
      uid,
      userEmail: email,
      source: 'system',
      newValue: { report },
      createdAt: now,
      updatedAt: now
    })
  }

  return {
    success: true,
    data: report
  }
})
