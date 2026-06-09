import { useState, useMemo, useEffect } from 'react'
import type { FC } from 'react'
import { Button } from '../../components/ui'
import { formatCurrency } from '../../utils/format'
import type { PianoAmmortamento, RataDettaglio } from '../../services/mutuo'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toDateSafe } from '../../utils/date'
import type { Timestamp } from 'firebase/firestore'

interface MutuoAmmortamentoTableProps {
  piano: PianoAmmortamento | null
}

export const MutuoAmmortamentoTable: FC<MutuoAmmortamentoTableProps> = ({ piano }) => {
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 12

  const today = useMemo(() => new Date(), [])
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  const { paginatedRate, totalPages, currentMonthPage } = useMemo(() => {
    if (!piano) return { paginatedRate: [], totalPages: 0, currentMonthPage: 0 }

    const totalPagesCount = Math.ceil(piano.rate.length / pageSize)

    // Trova la pagina del mese corrente
    const currentMonthIndex = piano.rate.findIndex(r => {
      const d = toDateSafe(r.data)
      return d?.getMonth() === currentMonth && d?.getFullYear() === currentYear
    })
    const monthPage = currentMonthIndex >= 0 ? Math.floor(currentMonthIndex / pageSize) : 0

    const start = currentPage * pageSize
    const end = start + pageSize
    return {
      paginatedRate: piano.rate.slice(start, end),
      totalPages: totalPagesCount,
      currentMonthPage: monthPage
    }
  }, [piano, currentPage, currentMonth, currentYear])

  // Inizializza la pagina al mese corrente se disponibile
  useEffect(() => {
    if (piano && currentMonthPage > 0) {
      setCurrentPage(currentMonthPage)
    }
  }, [piano, currentMonthPage])

  if (!piano) return null

  const isCurrentMonth = (date: Timestamp | Date) => {
    const d = toDateSafe(date)
    return d?.getMonth() === currentMonth && d?.getFullYear() === currentYear
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Piano di Ammortamento</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">
            Pagina {currentPage + 1} di {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setCurrentPage(p => Math.max(0, p - 1)) }}
              disabled={currentPage === 0}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setCurrentPage(p => Math.min(totalPages - 1, p + 1)) }}
              disabled={currentPage === totalPages - 1}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-bg/50 border-b border-border">
              <th className="px-4 py-3 font-semibold">Mese</th>
              <th className="px-4 py-3 font-semibold">Data</th>
              <th className="px-4 py-3 font-semibold text-right">Rata</th>
              <th className="px-4 py-3 font-semibold text-right">Quota Capitale</th>
              <th className="px-4 py-3 font-semibold text-right">Quota Interessi</th>
              <th className="px-4 py-3 font-semibold text-right">Debito Residuo</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRate.map((rata: RataDettaglio) => {
              const active = isCurrentMonth(rata.data)
              const d = toDateSafe(rata.data)
              return (
                <tr
                  key={rata.numero}
                  className={`border-b border-border transition-colors ${
                    active ? 'bg-primary/10 font-medium' : 'hover:bg-bg/30'
                  }`}
                >
                  <td className="px-4 py-3">{rata.numero}</td>
                  <td className="px-4 py-3">
                    {d ? d.toLocaleDateString('it-IT', {
                      month: 'short',
                      year: 'numeric'
                    }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">{formatCurrency(rata.rataTotale)}</td>
                  <td className="px-4 py-3 text-right text-success">{formatCurrency(rata.quotaCapitale)}</td>
                  <td className="px-4 py-3 text-right text-error">{formatCurrency(rata.quotaInteressi)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(rata.debitoResiduo)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
