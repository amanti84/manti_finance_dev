/**
 * pacFrequency.ts
 * Shared flexible frequency model for adult PAC and KG PAC.
 * Covers all scheduling patterns: interval, specific days of month, weekday-based.
 *
 * Examples:
 *   Monthly on the 5th:         { type: 'interval', intervalValue: 1, intervalUnit: 'month', daysOfMonth: [5] }
 *   1st and 15th each month:    { type: 'specific_days', daysOfMonth: [1, 15] }
 *   Every 14 days:              { type: 'interval', intervalValue: 14, intervalUnit: 'day' }
 *   Every Monday and Thursday:  { type: 'weekdays', weekdays: [1, 4] }
 *   Daily:                      { type: 'interval', intervalValue: 1, intervalUnit: 'day' }
 *   Quarterly:                  { type: 'interval', intervalValue: 3, intervalUnit: 'month' }
 */

export type IntervalUnit = 'day' | 'week' | 'month'

/**
 * PACSchedule — unica struttura condivisa tra PAC adulti e PAC KG.
 *
 * type = 'interval':
 *   Ripete ogni `intervalValue` unità di `intervalUnit`.
 *   Se intervalUnit = 'month' e daysOfMonth è valorizzato,
 *   il versamento avviene in quei giorni specifici del mese.
 *
 * type = 'specific_days':
 *   Versamento nei giorni `daysOfMonth` di ogni mese (es. [1, 15]).
 *   Equivale a intervalUnit='month' ma più esplicito.
 *
 * type = 'weekdays':
 *   Versamento nei giorni della settimana indicati in `weekdays`
 *   (0=dom, 1=lun, ..., 6=sab), opzionalmente ogni `intervalWeeks` settimane.
 */
export type PACScheduleType = 'interval' | 'specific_days' | 'weekdays'

export interface PACSchedule {
  type: PACScheduleType

  // --- interval ---
  intervalValue?: number      // es. 1, 2, 14
  intervalUnit?: IntervalUnit // 'day' | 'week' | 'month'

  // --- specific_days / interval mensile ---
  daysOfMonth?: number[]      // es. [1], [1, 15], [5, 10, 20]

  // --- weekdays ---
  weekdays?: number[]         // 0=dom ... 6=sab, es. [1, 4] = lun+gio
  intervalWeeks?: number      // es. 2 = ogni 2 settimane nei giorni indicati
}

// ---------------------------------------------------------------------------
// UTILS
// ---------------------------------------------------------------------------

/**
 * Data un PACSchedule e una data di riferimento (ultimo versamento o startDate),
 * restituisce la prossima data di versamento >= today.
 */
export function calcNextScheduledDate(
  schedule: PACSchedule,
  from: string,          // ISO date 'YYYY-MM-DD'
  today: string = new Date().toISOString().slice(0, 10)
): string {
  const candidates = getNextCandidates(schedule, from, 5)
  // Restituisce il primo candidato > from e >= today
  return candidates.find(d => d > from && d >= today) ?? candidates[candidates.length - 1]
}

/**
 * Restituisce tutte le date di versamento scadute e non ancora registrate.
 * from = lastPaymentDate (esclusa) — today (inclusa)
 */
export function getPendingDates(
  schedule: PACSchedule,
  from: string,          // ISO date — lastPaymentDate o startDate
  today: string = new Date().toISOString().slice(0, 10)
): string[] {
  const pending: string[] = []
  let cursor = from
  // Avanziamo di 1 giorno per escludere `from` stesso
  cursor = addDays(cursor, 1)

  let safetyCount = 0
  while (cursor <= today && safetyCount < 10000) {
    if (matchesSchedule(schedule, cursor, from)) {
      pending.push(cursor)
    }
    cursor = addDays(cursor, 1)
    safetyCount++
  }
  return pending
}

// ---------------------------------------------------------------------------
// HELPERS (internal)
// ---------------------------------------------------------------------------

function addDays(date: string, n: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function addMonths(date: string, n: number): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

function weeksBetween(a: string, b: string): number {
  return Math.floor(daysBetween(a, b) / 7)
}

function matchesSchedule(schedule: PACSchedule, date: string, origin: string): boolean {
  const d = new Date(date)
  const dom = d.getDate()
  const dow = d.getDay()

  switch (schedule.type) {
    case 'specific_days': {
      return (schedule.daysOfMonth ?? []).includes(dom)
    }

    case 'interval': {
      const unit = schedule.intervalUnit ?? 'month'
      const val = schedule.intervalValue ?? 1

      if (unit === 'day') {
        return daysBetween(origin, date) % val === 0
      }
      if (unit === 'week') {
        return daysBetween(origin, date) % (val * 7) === 0
      }
      if (unit === 'month') {
        // Stessa logica: ogni val mesi, opzionalmente in daysOfMonth specifici
        if (schedule.daysOfMonth && schedule.daysOfMonth.length > 0) {
          // Il giorno deve essere in daysOfMonth
          if (!schedule.daysOfMonth.includes(dom)) return false
          // Il mese deve essere un multiplo di val dall'origin
          const originDate = new Date(origin)
          const monthDiff =
            (d.getFullYear() - originDate.getFullYear()) * 12 +
            (d.getMonth() - originDate.getMonth())
          return monthDiff > 0 && monthDiff % val === 0
        } else {
          // Stesso giorno del mese dell'origin, ogni val mesi
          const originDate = new Date(origin)
          const monthDiff =
            (d.getFullYear() - originDate.getFullYear()) * 12 +
            (d.getMonth() - originDate.getMonth())
          return monthDiff > 0 && monthDiff % val === 0 && dom === originDate.getDate()
        }
      }
      return false
    }

    case 'weekdays': {
      if (!(schedule.weekdays ?? []).includes(dow)) return false
      const iw = schedule.intervalWeeks ?? 1
      if (iw <= 1) return true
      return weeksBetween(origin, date) % iw === 0
    }
  }
}

function getNextCandidates(schedule: PACSchedule, from: string, n: number): string[] {
  const results: string[] = []
  let cursor = addDays(from, 1)
  let safety = 0
  while (results.length < n && safety < 400) {
    if (matchesSchedule(schedule, cursor, from)) results.push(cursor)
    cursor = addDays(cursor, 1)
    safety++
  }
  return results
}

// ---------------------------------------------------------------------------
// LABEL HELPERS
// ---------------------------------------------------------------------------

const DOW_LABELS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

export function scheduleSummary(s: PACSchedule): string {
  switch (s.type) {
    case 'specific_days':
      return `Giorni ${(s.daysOfMonth ?? []).join(' e ')} di ogni mese`
    case 'interval': {
      const val = s.intervalValue ?? 1
      const unit = s.intervalUnit ?? 'month'
      const unitLabel = unit === 'day' ? (val === 1 ? 'giorno' : 'giorni')
        : unit === 'week' ? (val === 1 ? 'settimana' : 'settimane')
        : val === 1 ? 'mese' : 'mesi'
      const base = `Ogni ${val === 1 ? '' : val + ' '}${unitLabel}`.trim()
      if (unit === 'month' && s.daysOfMonth?.length) {
        return `${base} (giorno ${s.daysOfMonth.join('/')})`
      }
      return base
    }
    case 'weekdays': {
      const days = (s.weekdays ?? []).map(d => DOW_LABELS[d]).join(', ')
      const iw = s.intervalWeeks ?? 1
      return iw > 1 ? `${days} ogni ${iw} settimane` : `Ogni ${days}`
    }
  }
}
