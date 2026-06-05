/**
 * alert.ts
 * Alert Engine — notifiche e soglie su eventi finanziari
 * Issue #28 — M2 Core Modules
 */
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
  Timestamp,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { logAudit } from './audit'
import { getAvailableBalance } from './cashflow'
import { getPayslipByMonth } from './payroll'
import { listSnapshots, computeDeltas } from './snapshot'
import type { FinancialAlert, ApiResult, Month } from '../types'

const COLLECTION = (uid: string) => `users/${uid}/alerts`

/**
 * Valuta tutte le regole e genera gli alert attivi.
 * Firestore: users/{uid}/alerts/{id}
 */
export async function evaluateAlerts(uid: string): Promise<ApiResult<FinancialAlert[]>> {
  try {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = (now.getMonth() + 1) as Month
    const dayOfMonth = now.getDate()

    const alertsToCreate: Omit<FinancialAlert, 'id' | 'createdAt' | 'updatedAt'>[] = []

    // 1. Saldo disponibile < 3.000€ (soglia default) -> SALDO_SOTTO_SOGLIA critical
    // FIX [Blocker 1]: explicit null check before accessing .availableBalance
    const balanceResult = await getAvailableBalance(uid)
    if (balanceResult.success && balanceResult.data !== null && balanceResult.data.availableBalance < 3000) {
      alertsToCreate.push({
        type: 'SALDO_SOTTO_SOGLIA',
        severity: 'critical',
        message: `Saldo disponibile (${balanceResult.data.availableBalance.toFixed(2)}€) sotto la soglia di 3.000€`,
        read: false,
      })
    }

    // 2. Cedolino del mese corrente mancante dopo il 10 del mese -> CEDOLINO_MANCANTE warning
    if (dayOfMonth > 10) {
      const payslipResult = await getPayslipByMonth(uid, currentYear, currentMonth)
      if (!payslipResult.success) {
        alertsToCreate.push({
          type: 'CEDOLINO_MANCANTE',
          severity: 'warning',
          message: `Cedolino di ${currentMonth}/${currentYear} non ancora inserito`,
          read: false,
        })
      }
    }

    // 3. Mese precedente non chiuso -> MESE_NON_CHIUSO info
    // FIX [Blocker 2]: check previous month closure, not current month.
    // Current month can never be "closed" while still in progress — that was a false positive.
    const prevMonth = (currentMonth === 1 ? 12 : currentMonth - 1) as Month
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const snapshotsForCloseResult = await listSnapshots(uid, 1)
    const latestSnapshot = snapshotsForCloseResult.success ? snapshotsForCloseResult.data[0] : null
    const isPrevMonthClosed =
      latestSnapshot?.year === prevYear && latestSnapshot?.month === prevMonth
    if (!isPrevMonthClosed) {
      alertsToCreate.push({
        type: 'MESE_NON_CHIUSO',
        severity: 'info',
        message: `Il mese di ${prevMonth}/${prevYear} non è ancora stato chiuso`,
        read: false,
      })
    }

    // Recuperiamo gli ultimi snapshot per le regole 4 e 5
    const snapshotsResult = await listSnapshots(uid, 4)
    const snapshots = snapshotsResult.success ? snapshotsResult.data : []

    // 4. Surplus mensile > 50% rispetto alla media degli ultimi 3 mesi -> SURPLUS_ANOMALO info
    if (snapshots.length >= 4) {
      const currentSnapshot = snapshots[0]
      const pastSnapshots = snapshots.slice(1, 4)

      const payslipResult = await getPayslipByMonth(uid, currentSnapshot.year, currentSnapshot.month)
      if (payslipResult.success && payslipResult.data?.surplus !== undefined) {
        const currentSurplus = payslipResult.data.surplus

        let sumPastSurplus = 0
        let countPastSurplus = 0
        for (const s of pastSnapshots) {
          const p = await getPayslipByMonth(uid, s.year, s.month)
          if (p.success && p.data?.surplus !== undefined) {
            sumPastSurplus += p.data.surplus
            countPastSurplus++
          }
        }

        if (countPastSurplus > 0) {
          const avgSurplus = sumPastSurplus / countPastSurplus
          if (currentSurplus > avgSurplus * 1.5) {
            alertsToCreate.push({
              type: 'SURPLUS_ANOMALO',
              severity: 'info',
              message: `Surplus mensile (${currentSurplus.toFixed(2)}€) superiore del 50% rispetto alla media (${avgSurplus.toFixed(2)}€)`,
              read: false,
            })
          }
        }
      }
    }

    // 5. Variazione patrimonio netto > 10% mese su mese -> PATRIMONIO_VARIAZIONE warning
    if (snapshots.length >= 2) {
      const deltas = computeDeltas(snapshots)
      const latestDelta = deltas[0]
      if (latestDelta?.delta !== null && latestDelta?.delta !== undefined) {
        const prevPatrimonio = snapshots[1].patrimonioNetto
        const variationPct = (latestDelta.delta / prevPatrimonio) * 100
        if (Math.abs(variationPct) > 10) {
          alertsToCreate.push({
            type: 'PATRIMONIO_VARIAZIONE',
            severity: 'warning',
            message: `Variazione patrimonio netto del ${variationPct.toFixed(1)}% rispetto al mese precedente`,
            read: false,
          })
        }
      }
    }

    // Persistenza: evita duplicati per alert non letti dello stesso tipo
    const currentAlertsResult = await getActiveAlerts(uid)
    const existingAlerts = currentAlertsResult.success ? currentAlertsResult.data : []

    const savedAlerts: FinancialAlert[] = []

    for (const alertData of alertsToCreate) {
      const existing = existingAlerts.find((a) => a.type === alertData.type && !a.read)

      if (!existing) {
        const colRef = collection(db, COLLECTION(uid))
        const docRef = await addDoc(colRef, {
          ...alertData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })

        const newAlert: FinancialAlert = {
          id: docRef.id,
          ...alertData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }

        await logAudit({
          uid,
          action: 'create',
          entityType: 'alert',
          entityId: docRef.id,
          newValue: newAlert as unknown as Record<string, unknown>,
        })

        savedAlerts.push(newAlert)
      } else {
        savedAlerts.push(existing)
      }
    }

    return { success: true, data: savedAlerts }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Segna alert come letto.
 */
export async function markAlertRead(uid: string, alertId: string): Promise<ApiResult<void>> {
  try {
    const docRef = doc(db, COLLECTION(uid), alertId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { success: false, error: 'Alert non trovato' }

    const previousValue = snap.data()
    await updateDoc(docRef, {
      read: true,
      updatedAt: serverTimestamp(),
    })

    await logAudit({
      uid,
      action: 'update',
      entityType: 'alert',
      entityId: alertId,
      previousValue: previousValue,
      newValue: { ...previousValue, read: true },
    })

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Snooze alert per N giorni.
 */
export async function snoozeAlert(uid: string, alertId: string, days: number): Promise<ApiResult<void>> {
  try {
    const docRef = doc(db, COLLECTION(uid), alertId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { success: false, error: 'Alert non trovato' }

    const snoozeDate = new Date()
    snoozeDate.setDate(snoozeDate.getDate() + days)
    const snoozedUntil = Timestamp.fromDate(snoozeDate)

    const previousValue = snap.data()
    await updateDoc(docRef, {
      snoozedUntil,
      updatedAt: serverTimestamp(),
    })

    await logAudit({
      uid,
      action: 'update',
      entityType: 'alert',
      entityId: alertId,
      previousValue: previousValue,
      newValue: { ...previousValue, snoozedUntil },
    })

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Lista alert attivi (non letti e non in snooze).
 */
export async function getActiveAlerts(uid: string): Promise<ApiResult<FinancialAlert[]>> {
  try {
    const colRef = collection(db, COLLECTION(uid))
    const q = query(colRef, where('read', '==', false))
    const snap = await getDocs(q)
    const now = Timestamp.now()

    const alerts = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as FinancialAlert)
      .filter((a) => !a.snoozedUntil || a.snoozedUntil.toMillis() < now.toMillis())

    return { success: true, data: alerts }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
