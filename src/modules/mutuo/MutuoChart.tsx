import { useEffect, useRef } from 'react'
import type { FC } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui'
import type { PianoAmmortamento } from '../../services/mutuo'
import { LineChart } from 'lucide-react'
import { toDateSafe } from '../../utils/date'

interface MutuoChartProps {
  piano: PianoAmmortamento | null
}

interface ChartJsContext {
  dataIndex: number
}

interface ChartJsDataset {
  label?: string
}

interface ChartJsTooltipContext {
  dataset?: ChartJsDataset
  parsed?: { y: number | null }
}

interface ChartInstance {
  destroy: () => void
}

type ChartJsConstructor = new (ctx: CanvasRenderingContext2D, config: unknown) => ChartInstance

interface WindowWithChart extends Window {
  Chart?: ChartJsConstructor
}

export const MutuoChart: FC<MutuoChartProps> = ({ piano }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<ChartInstance | null>(null)

  useEffect(() => {
    if (!piano || !canvasRef.current) return

    const loadChartJs = () => {
      const win = window as unknown as WindowWithChart
      if (win.Chart) {
        renderChart()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js'
      script.async = true
      script.onload = renderChart
      document.body.appendChild(script)
    }

    const renderChart = () => {
      const win = window as unknown as WindowWithChart
      const Chart = win.Chart
      const canvas = canvasRef.current
      if (!canvas || !Chart) return

      // Cleanup existing chart
      if (chartRef.current) {
        chartRef.current.destroy()
      }

      const today = new Date()
      const currentMonth = today.getMonth()
      const currentYear = today.getFullYear()

      // Aggregazione dati
      const step = piano.rate.length > 120 ? 12 : (piano.rate.length > 60 ? 6 : 1)
      const chartData = piano.rate.filter((_, i) => i % step === 0 || i === piano.rate.length - 1)

      const labels = chartData.map(r => {
        const d = toDateSafe(r.data)
        return d?.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }) ?? ''
      })

      const dataPoints = chartData.map(r => r.debitoResiduo)

      // Trova l'indice del mese corrente nei dati del grafico
      const currentIndex = chartData.findIndex(r => {
        const d = toDateSafe(r.data)
        return d?.getMonth() === currentMonth && d.getFullYear() === currentYear
      })

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Debito Residuo',
            data: dataPoints,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: (context: ChartJsContext) => {
               return context.dataIndex === currentIndex ? 6 : 0
            },
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context: ChartJsTooltipContext) => {
                  const label = (context.dataset?.label ?? '') + ': '
                  const value = context.parsed?.y
                  if (value != null) {
                    return `${label}${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)}`
                  }
                  return label
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value: number) => {
                  return new Intl.NumberFormat('it-IT', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumSignificantDigits: 3
                  }).format(value)
                }
              }
            }
          }
        }
      })
    }

    renderChart()

    loadChartJs()

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
      }
    }
  }, [piano])

  if (!piano) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChart size={20} className="text-primary" />
          Proiezione Debito Residuo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <canvas ref={canvasRef} />
        </div>
      </CardContent>
    </Card>
  )
}
