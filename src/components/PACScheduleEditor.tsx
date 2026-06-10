/**
 * PACScheduleEditor — componente condiviso per configurare PACSchedule.
 * Usato in KindergartenPACList e PacForm adulti.
 * Massima flessibilità: interval / specific_days / weekdays.
 */
import type { PACSchedule, PACScheduleType, IntervalUnit } from '../types/pacFrequency'
import { scheduleSummary } from '../types/pacFrequency'

interface Props {
  value: PACSchedule
  onChange: (s: PACSchedule) => void
}

const DOW = [
  { label: 'Dom', value: 0 },
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mer', value: 3 },
  { label: 'Gio', value: 4 },
  { label: 'Ven', value: 5 },
  { label: 'Sab', value: 6 },
]

const ALL_DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

export function PACScheduleEditor({ value, onChange }: Props) {
  const set = (patch: Partial<PACSchedule>) => onChange({ ...value, ...patch })

  const toggleDayOfMonth = (day: number) => {
    const current = value.daysOfMonth ?? []
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort((a, b) => a - b)
    set({ daysOfMonth: next })
  }

  const toggleWeekday = (dow: number) => {
    const current = value.weekdays ?? []
    const next = current.includes(dow) ? current.filter(d => d !== dow) : [...current, dow].sort((a, b) => a - b)
    set({ weekdays: next })
  }

  const showPreview =
    (value.type === 'interval' && (value.intervalValue ?? 0) > 0) ||
    (value.type === 'specific_days' && (value.daysOfMonth ?? []).length > 0) ||
    (value.type === 'weekdays' && (value.weekdays ?? []).length > 0)

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4 bg-gray-50">
      {/* Tipo */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 uppercase">Tipo di frequenza</label>
        <div className="flex gap-2 flex-wrap">
          {([
            { v: 'interval' as PACScheduleType, label: 'Intervallo' },
            { v: 'specific_days' as PACScheduleType, label: 'Giorni fissi del mese' },
            { v: 'weekdays' as PACScheduleType, label: 'Giorni della settimana' },
          ]).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ type: v })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                value.type === v
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* interval */}
      {value.type === 'interval' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Ogni</span>
            <input
              type="number" min="1" max="365"
              value={value.intervalValue ?? 1}
              onChange={e => set({ intervalValue: parseInt(e.target.value) || 1 })}
              className="w-16 h-9 px-2 rounded-md border border-gray-300 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <select
              value={value.intervalUnit ?? 'month'}
              onChange={e => set({ intervalUnit: e.target.value as IntervalUnit })}
              className="h-9 px-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="day">giorn{(value.intervalValue ?? 1) === 1 ? 'o' : 'i'}</option>
              <option value="week">settiman{(value.intervalValue ?? 1) === 1 ? 'a' : 'e'}</option>
              <option value="month">mes{(value.intervalValue ?? 1) === 1 ? 'e' : 'i'}</option>
            </select>
          </div>
          {(value.intervalUnit ?? 'month') === 'month' && (
            <div className="space-y-1">
              <label className="text-xs text-gray-500">In quale/i giorno/i del mese? (lascia vuoto = stesso giorno della startDate)</label>
              <div className="flex flex-wrap gap-1">
                {ALL_DAYS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDayOfMonth(d)}
                    className={`w-8 h-8 rounded text-xs font-medium border transition-colors ${
                      (value.daysOfMonth ?? []).includes(d)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* specific_days */}
      {value.type === 'specific_days' && (
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Seleziona i giorni del mese (1–28)</label>
          <div className="flex flex-wrap gap-1">
            {ALL_DAYS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDayOfMonth(d)}
                className={`w-8 h-8 rounded text-xs font-medium border transition-colors ${
                  (value.daysOfMonth ?? []).includes(d)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          {(value.daysOfMonth ?? []).length === 0 && (
            <p className="text-xs text-red-500">Seleziona almeno un giorno</p>
          )}
        </div>
      )}

      {/* weekdays */}
      {value.type === 'weekdays' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Giorni della settimana</label>
            <div className="flex gap-2">
              {DOW.map(({ label, value: dow }) => (
                <button
                  key={dow}
                  type="button"
                  onClick={() => toggleWeekday(dow)}
                  className={`w-10 h-9 rounded text-xs font-medium border transition-colors ${
                    (value.weekdays ?? []).includes(dow)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Ripeti ogni</span>
            <input
              type="number" min="1" max="52"
              value={value.intervalWeeks ?? 1}
              onChange={e => set({ intervalWeeks: parseInt(e.target.value) || 1 })}
              className="w-16 h-9 px-2 rounded-md border border-gray-300 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-sm text-gray-600">settiman{(value.intervalWeeks ?? 1) === 1 ? 'a' : 'e'}</span>
          </div>
        </div>
      )}

      {/* Preview */}
      {showPreview && (
        <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary font-medium">
          📅 {scheduleSummary(value)}
        </div>
      )}
    </div>
  )
}
