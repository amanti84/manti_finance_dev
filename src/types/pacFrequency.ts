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
 * Data un PACSchedule e una data di riferimento, restituisce la prossima
 * data di versamento >= today. Garantisce sempre una stringa valida.
 */
export function calcNextScheduledDate(
  schedule: PACSchedule,
  from: string,
  today: string = new Date().toISOString().slice(0, 10)
): string {
  const candidates = getNextCandidates(schedule, from, 10)
  if (candidates.length === 0) {
    // fallback: +1 giorno (schedule malformato)
    return addDays(from, 1)
  }
  return candidates.find(d => d > from && d >= today) ?? candidates[candidates.length - 1]
}

/**
 * Restituisce tutte le date di versamento scadute non ancora registrate.
 * from = lastPaymentDate (esclusa) — today (inclusa)
 */
export function getPendingDates(
  schedule: PACSchedule,
  from: string,
  today: string = new Date().toISOString().slice(0, 10)
): string[] {
  const pending: string[] = []
  let cursor = addDays(from, 1)
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

      // unit === 'month'
      const originDate = new Date(origin)
      const monthDiff =
        (d.getFullYear() - originDate.getFullYear()) * 12 +
        (d.getMonth() - originDate.getMonth())

      if (monthDiff <= 0 || monthDiff % val !== 0) return false

      if (schedule.daysOfMonth && schedule.daysOfMonth.length > 0) {
        return schedule.daysOfMonth.includes(dom)
      }
      return dom === originDate.getDate()
    }

    case 'weekdays': {
      if (!(schedule.weekdays ?? []).includes(dow)) return false
      const iw = schedule.intervalWeeks ?? 1
      if (iw <= 1) return true
      return weeksBetween(origin, date) % iw === 0
    }

    default: {
      // exhaustive guard — TypeScript never reach here
      const _exhaustive: never = schedule.type
      void _exhaustive
      return false
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
      const unitLabel =
        unit === 'day'   ? (val === 1 ? 'giorno' : 'giorni') :
        unit === 'week'  ? (val === 1 ? 'settimana' : 'settimane') :
                           (val === 1 ? 'mese' : 'mesi')
      const base = val === 1 ? `Ogni ${unitLabel}` : `Ogni ${val} ${unitLabel}`
      if (unit === 'month' && (s.daysOfMonth?.length ?? 0) > 0) {
        return `${base} (giorno ${(s.daysOfMonth ?? []).join('/')})`
      }
      return base
    }
    case 'weekdays': {
      const days = (s.weekdays ?? []).map(d => DOW_LABELS[d]).join(', ')
      const iw = s.intervalWeeks ?? 1
      return iw > 1 ? `${days} ogni ${iw} settimane` : `Ogni ${days}`
    }
    default: {
      const _exhaustive: never = s.type
      void _exhaustive
      return ''
    }
  }
}
