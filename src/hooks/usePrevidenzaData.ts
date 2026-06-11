import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from './useAuth'
import {
  getPrevidenzaConfig,
  getPrevidenzaBaseline,
  getAllPensionFunds,
  getContributionsByFund,
  calculateTFRFromPayslips,
  calculateTFRCumulativo,
  calculatePensionProjection,
  compareTFRAziendaVsFondo,
  type PensionProjection,
  type TFRComparison
} from '../services/previdenza'
import { getPayslips } from '../services/payroll'
import { withRetry } from '../utils/withRetry'
import type { PrevidenzaConfig, PrevidenzaBaseline, PensionFund, PensionContribution, Payslip, TFRData } from '../types'

export interface PrevidenzaData {
  config: PrevidenzaConfig | null
  baseline: PrevidenzaBaseline | null
  funds: PensionFund[]
  contributions: Record<string, PensionContribution[]>
  payslips: Payslip[]
  tfrHistory: TFRData[]
  pensionProjection: PensionProjection | null
  tfrComparison: TFRComparison | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function usePrevidenzaData(): PrevidenzaData {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<PrevidenzaConfig | null>(null)
  const [baseline, setBaseline] = useState<PrevidenzaBaseline | null>(null)
  const [funds, setFunds] = useState<PensionFund[]>([])
  const [contributions, setContributions] = useState<Record<string, PensionContribution[]>>({})
  const [payslips, setPayslips] = useState<Payslip[]>([])

  const fetchData = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [configRes, baselineRes, fundsRes, payslipsRes] = await Promise.all([
        withRetry(() => getPrevidenzaConfig(user.uid)),
        withRetry(() => getPrevidenzaBaseline(user.uid)),
        withRetry(() => getAllPensionFunds(user.uid)),
        withRetry(() => getPayslips(user.uid))
      ])

      if (configRes.success) setConfig(configRes.data ?? null)
      // Note: error 'Configurazione previdenza non trovata' is expected if first time

      if (baselineRes.success) setBaseline(baselineRes.data ?? null)

      if (fundsRes.success) {
        setFunds(fundsRes.data ?? [])
        const contribsMap: Record<string, PensionContribution[]> = {}
        await Promise.all(
          (fundsRes.data ?? []).map(async (fund) => {
            const res = await withRetry(() => getContributionsByFund(user.uid, fund.id))
            if (res.success) {
              contribsMap[fund.id] = res.data ?? []
            }
          })
        )
        setContributions(contribsMap)
      } else {
        setError(fundsRes.error)
      }

      if (payslipsRes.success) {
        setPayslips(payslipsRes.data ?? [])
      } else {
        setError(payslipsRes.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [user?.uid])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Computed data
  const tfrHistory = useMemo(() => {
    if (payslips.length === 0) return []
    const years = Array.from(new Set(payslips.map(p => p.year))).sort((a, b) => a - b)
    const annualTfr: TFRData[] = []

    for (const year of years) {
      const res = calculateTFRFromPayslips(payslips, year)
      if (res.success) {
        annualTfr.push(res.data)
      }
    }

    // Assume 2% inflation for all years if not specified
    const inflazione: Record<number, number> = {}
    years.forEach(y => { inflazione[y] = 0.02 })

    const cumulativoRes = calculateTFRCumulativo(annualTfr, inflazione, baseline?.tfrAccumulato ?? 0)
    return cumulativoRes.success ? cumulativoRes.data : []
  }, [payslips, baseline])

  const pensionProjection = useMemo(() => {
    if (!config?.birthYear) return null

    const currentYear = new Date().getFullYear()
    const age = currentYear - config.birthYear
    const totalFundsBalance = funds.reduce((sum, f) => sum + f.saldoAttuale, 0) + (baseline?.montanteFondoPensione ?? 0)
    const annualContrib = config.currentRal * (config.pensionFundContributionPct ?? 0) / 100 +
                         config.currentRal * (config.pensionFundEmployerContributionPct ?? 0) / 100

    const res = calculatePensionProjection(
      totalFundsBalance,
      annualContrib,
      age,
      config.expectedReturnPct ? config.expectedReturnPct / 100 : 0.04,
      config.retirementAgeTarget ?? 67
    )

    return res.success ? res.data : null
  }, [config, funds, baseline])

  const tfrComparison = useMemo(() => {
    if (!config?.currentRal) return null

    const quotaAnnua = config.currentRal / 13.5
    const yearsToPension = (config.retirementAgeTarget ?? 67) - (new Date().getFullYear() - config.birthYear)

    if (yearsToPension <= 0) return null

    const res = compareTFRAziendaVsFondo(
      quotaAnnua,
      yearsToPension,
      0.02, // 2% inflation
      config.expectedReturnPct ? config.expectedReturnPct / 100 : 0.04
    )

    return res.success ? res.data : null
  }, [config])

  return {
    config,
    baseline,
    funds,
    contributions,
    payslips,
    tfrHistory,
    pensionProjection,
    tfrComparison,
    loading,
    error,
    refresh: fetchData
  }
}
