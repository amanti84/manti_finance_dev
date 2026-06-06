import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
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
  kindergartenTransactions: { inserted: number; skipped: number; errors: string[] }
  transactions:            { inserted: number; skipped: number; errors: string[] }
  sales:                   { inserted: number; skipped: number; errors: string[] }
  validation: {
    adultTotalInvested_legacy:        number
    adultTotalInvested_new:           number
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
  // Fix: il Firestore di manti-finance è in eur3, occorre forzare il host corretto
  legacyDb.settings({ host: 'europe-west3-firestore.googleapis.com', ssl: true })
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
    pacs:                    { inserted: 0, skipped: 0, errors: [] },
    investments:             { inserted: 0, skipped: 0, errors: [] },
    kindergartenPacs:        { inserted: 0, skipped: 0, errors: [] },
    kindergartenTransactions: { inserted: 0, skipped: 0, errors: [] },
    transactions:            { inserted: 0, skipped: 0, errors: [] },
    sales:                   { inserted: 0, skipped: 0, errors: [] },
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

  // 1. Leggi dal legacy (tutte le collections sono alla root, non sotto users/{uid}/)
  const [
    pacsLegacySnap,
    investmentsLegacySnap,
    kgPacsLegacySnap,
    kgTransactionsLegacySnap,
    transactionsLegacySnap,
    salesLegacySnap
  ] = await Promise.all([
    legacyDb.collection('pacs').get(),
    legacyDb.collection('investments').get(),
    legacyDb.collection('kindergarten_pacs').get(),
    legacyDb.collection('kindergarten_transactions').get(),
    legacyDb.collection('transactions').get(),
    legacyDb.collection('sales').get()
  ])

  const pacsLegacy           = pacsLegacySnap.docs.map(d => ({ id: d.id, ...d.data() }) as LegacyPAC)
  const investmentsLegacy    = investmentsLegacySnap.docs.map(d => ({ id: d.id, ...d.data() }) as LegacyInvestment)
  const kgPacsLegacy         = kgPacsLegacySnap.docs.map(d => ({ id: d.id, ...d.data() }) as LegacyPAC)
  const kgTransactionsLegacy = kgTransactionsLegacySnap.docs.map(d => ({ id: d.id, ...d.data() }) as LegacyKindergartenInvestment)
  const transactionsLegacy   = transactionsLegacySnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const salesLegacy          = salesLegacySnap.docs.map(d => ({ id: d.id, ...d.data() }))

  // Calcolo totali legacy per validazione
  const getLegacyInvestmentCost = (i: LegacyInvestment | LegacyKindergartenInvestment) => {
    if ('amountInvested' in i && i.amountInvested > 0) return i.amountInvested
    return (i.avgCost || 0) * ((i as any).shares ?? (i as any).quantity ?? 0)
  }

  report.validation.adultTotalInvested_legacy =
    pacsLegacy.reduce((sum, p) => sum + ((p.avgCost || 0) * (p.shares || 0)), 0) +
    investmentsLegacy.reduce((sum, i) => sum + getLegacyInvestmentCost(i), 0)

  report.validation.kindergartenTotalInvested_legacy =
    kgPacsLegacy.reduce((sum, p) => sum + ((p.avgCost || 0) * (p.shares || 0)), 0) +
    kgTransactionsLegacy.reduce((sum, i) => sum + getLegacyInvestmentCost(i), 0)

  // Migrazione
  const collectionsToMigrate = [
    { legacyData: pacsLegacy,           reportKey: 'pacs' as const,                    destPath: `users/${uid}/pacs` },
    { legacyData: investmentsLegacy,    reportKey: 'investments' as const,             destPath: `users/${uid}/investments` },
    { legacyData: kgPacsLegacy,         reportKey: 'kindergartenPacs' as const,        destPath: `users/${uid}/kindergarten_pacs` },
    { legacyData: kgTransactionsLegacy, reportKey: 'kindergartenTransactions' as const, destPath: `users/${uid}/kindergarten_transactions` },
    { legacyData: transactionsLegacy,   reportKey: 'transactions' as const,            destPath: `users/${uid}/transactions` },
    { legacyData: salesLegacy,          reportKey: 'sales' as const,                   destPath: `users/${uid}/sales` },
  ]

  for (const coll of collectionsToMigrate) {
    for (const item of coll.legacyData as any[]) {
      try {
        const legacyId = item.id
        const docRef = newDb.collection(coll.destPath).doc(legacyId)
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
          ...item,
          uid,
          legacyId,
          createdAt: now,
          updatedAt: now,
        }
        delete docData.id

        // Normalizzazione specifica per pacs/kindergarten_pacs
        if (coll.reportKey === 'pacs' || coll.reportKey === 'kindergartenPacs') {
          const p = item as LegacyPAC
          docData = {
            ...docData,
            monthlyAmount: Number(p.monthlyAmount),
            shares: Number(p.shares || 0),
            avgCost: Number(p.avgCost || 0),
            currentPrice: Number((p as any).lastPrice || 0),
            active: !!p.active,
            autoUpdate: !!p.autoUpdate,
          }
        }

        // Normalizzazione specifica per investments
        if (coll.reportKey === 'investments' || coll.reportKey === 'kindergartenTransactions') {
          const i = item as LegacyInvestment | LegacyKindergartenInvestment
          const quantity = Number((i as any).shares ?? (i as any).quantity ?? 0)
          let avgCost = Number((i as any).avgCost || 0)
          if (avgCost === 0 && (i as any).amountInvested > 0 && quantity > 0) {
            avgCost = (i as any).amountInvested / quantity
          }
          const currentPrice = Number((i as any).lastPrice || 0)
          docData = {
            ...docData,
            assetClass: mapAssetClass((i as any).type || (i as any).assetClass),
            broker: mapBroker(i.platform),
            quantity,
            avgCost,
            currentPrice,
            currentValue: currentPrice * quantity,
            currency: (i as any).currency || 'EUR',
          }
        }

        await docRef.set(docData)
        report[coll.reportKey].inserted++

      } catch (err) {
        report[coll.reportKey].errors.push(`ID ${item.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  // Validazione finale
  const calculateTotal = (docs: any[]) =>
    docs.reduce((sum, d) => sum + (Number(d.avgCost || 0) * Number(d.shares || d.quantity || 0)), 0)

  if (dryRun) {
    report.validation.adultTotalInvested_new = calculateTotal(pacsLegacy) + calculateTotal(investmentsLegacy)
    report.validation.kindergartenTotalInvested_new = calculateTotal(kgPacsLegacy) + calculateTotal(kgTransactionsLegacy)
  } else {
    const [pacsNewSnap, invNewSnap, kgPacsNewSnap, kgTransNewSnap] = await Promise.all([
      newDb.collection(`users/${uid}/pacs`).get(),
      newDb.collection(`users/${uid}/investments`).get(),
      newDb.collection(`users/${uid}/kindergarten_pacs`).get(),
      newDb.collection(`users/${uid}/kindergarten_transactions`).get()
    ])
    report.validation.adultTotalInvested_new = calculateTotal(pacsNewSnap.docs.map(d => d.data())) + calculateTotal(invNewSnap.docs.map(d => d.data()))
    report.validation.kindergartenTotalInvested_new = calculateTotal(kgPacsNewSnap.docs.map(d => d.data())) + calculateTotal(kgTransNewSnap.docs.map(d => d.data()))
  }

  const adultDiff = Math.abs(report.validation.adultTotalInvested_legacy - report.validation.adultTotalInvested_new)
  const kgDiff    = Math.abs(report.validation.kindergartenTotalInvested_legacy - report.validation.kindergartenTotalInvested_new)
  report.validation.passed = adultDiff < 0.01 && kgDiff < 0.01

  if (!report.validation.passed) {
    const errorMsg = `Mismatch: adulti legacy=${report.validation.adultTotalInvested_legacy.toFixed(2)} new=${report.validation.adultTotalInvested_new.toFixed(2)} | kg legacy=${report.validation.kindergartenTotalInvested_legacy.toFixed(2)} new=${report.validation.kindergartenTotalInvested_new.toFixed(2)}`
    report.validation.mismatchDetails.push(errorMsg)
    // In dryRun non throware — mostra solo il report
    if (!dryRun) {
      throw new HttpsError('internal', errorMsg)
    }
  }

  // Audit log
  if (!dryRun && Object.values(report).some((v: any) => v.inserted > 0)) {
    await newDb.collection(`users/${uid}/audit`).add({
      action: 'LEGACY_MIGRATION',
      entityType: 'migration',
      entityId: 'migrateFromLegacy_' + now.toMillis(),
      uid,
      userEmail: email,
      source: 'system',
      newValue: { report },
      createdAt: now,
      updatedAt: now
    })
  }

  return { success: true, data: report }
})
