import type { FC } from 'react'
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart
} from 'recharts'
import type { MonthlyOverview } from '../../types'
import { formatCurrency } from '../../utils/format'

interface FinancialTrendChartProps {
  data: MonthlyOverview[]
}

export const FinancialTrendChart: FC<FinancialTrendChartProps> = ({ data }) => {
  const chartData = data.map(d => ({
    name: `${d.month}/${String(d.year).slice(-2)}`,
    'Entrate Nette': d.netIncome,
    'Uscite Totali': d.fixedExpensesAuto + d.fixedExpensesManual,
    'Surplus Stimato': d.estimatedSurplus,
    'Dati Incompleti': !d.dataComplete
  }))

  const formatTooltipValue = (value: number | string | readonly (number | string)[] | undefined) =>
    formatCurrency(typeof value === 'number' ? value : 0)

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="var(--color-text-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--color-text-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `€${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={formatTooltipValue}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }}
          />

          <Bar
            dataKey="Entrate Nette"
            fill="var(--color-primary)"
            radius={[4, 4, 0, 0]}
            barSize={30}
            opacity={0.8}
          />
          <Bar
            dataKey="Uscite Totali"
            fill="var(--color-error)"
            radius={[4, 4, 0, 0]}
            barSize={30}
            opacity={0.6}
          />
          <Line
            type="monotone"
            dataKey="Surplus Stimato"
            stroke="var(--color-success)"
            strokeWidth={3}
            dot={{ r: 4, fill: 'var(--color-success)' }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
