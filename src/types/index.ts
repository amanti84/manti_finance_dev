// ============================================================
// CORE TYPES - manti_finance_dev
// Modello dati v1 - allineato alle collection Firestore
// /users/{uid}/snapshots | transactions | investments | payslips | audit | config
// ============================================================

import type { Timestamp } from 'firebase/firestore'

// --------------------------------------------------------
// BASE
// --------------------------------------------------------

export interface BaseDocument {
  id: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// --------------------------------------------------------
// API RESULT
// --------------------------------------------------------

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; data?: undefined }

// --------------------------------------------------------
// WHAT-IF ENGINE (Issue #27)
// --------------------------------------------------------

export type ScenarioType =
  | 'ESTINZIONE_MUTUO'
  | 'INVESTIMENTO_ETF'
  | 'AUMENTO_PAC'
  | 'VARIAZIONE_RAL'

export interface ScenarioInput {
  type: ScenarioType
  params: Record<string, number>
}

export interface ScenarioOutput {
  patrimonioProiettato: number
  surplusMensileProiettato: number
  costoOpportunita: number
  risparmioInteressi?: number
  descrizione: string
}

export interface Scenario extends BaseDocument {
  name: string
  input: ScenarioInput
  output: ScenarioOutput
  baselineSnapshotId: string
}

// --------------------------------------------------------
// CASH FLOW (Issue #15 / #51)
// --------------------------------------------------------

export interface Account extends BaseDocument {
  name: string
  bank: string
  iban?: string
  currentBalance: number
  currency: Currency
}

export type RecurringExpenseFrequency = 'monthly' | 'quarterly' | 'annual'
export type RecurringExpenseCategory = 'affitto' | 'bollette' | 'abbonamenti' | 'mutuo' | 'altro'

export interface RecurringExpense extends BaseDocument {
  name: string
  amount: number
  frequency: RecurringExpenseFrequency
  dayOfMonth?: number
  category: RecurringExpenseCategory
  accountId: string
}

export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF'

export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

// --------------------------------------------------------
// USER
// --------------------------------------------------------

export interface UserProfile extends BaseDocument {
  uid: string
  email: string
  displayName: string
  currency: Currency
  taxCode?: string
  onboardingComplete: boolean
}

// --------------------------------------------------------
// PATRIMONIO SNAPSHOT (mensile)
// /users/{uid}/snapshots/{snapshotId}
// --------------------------------------------------------

export interface PatrimonioSnapshot extends BaseDocument {
  year: number
  month: Month
  contiCorrenti: number
  investimenti: number
  immobili: number
  fondoPensione: number
  tfr: number
  mutuo: number
  altriDebiti: number
  patrimonioNetto: number
  note?: string
}

export interface SnapshotWithDelta extends PatrimonioSnapshot {
  delta: number | null
}

// --------------------------------------------------------
// TRANSAZIONI
// /users/{uid}/transactions/{transactionId}
// --------------------------------------------------------

export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment'

export type TransactionCategory =
  | 'stipendio' | 'bonus' | 'affitto' | 'mutuo' | 'spesa_casa'
  | 'ristorante' | 'trasporti' | 'salute' | 'istruzione'
  | 'investimento' | 'rimborso' | 'altro'

export interface Transaction extends BaseDocument {
  date: Timestamp
  type: TransactionType
  category: TransactionCategory
  amount: number
  currency: Currency
  description: string
  accountId?: string
  tags?: string[]
  isKindergarten?: boolean
  confidence: number
  source: 'manual' | 'import' | 'email'
}

// --------------------------------------------------------
// INVESTIMENTI
// /users/{uid}/investments/{investmentId}
// --------------------------------------------------------

export type AssetClass =
  | 'azioni' | 'obbligazioni' | 'etf' | 'fondi' | 'pac'
  | 'crypto' | 'liquidita' | 'immobili' | 'altro'

export type Broker = 'fineco' | 'directa' | 'degiro' | 'altri'

export interface Investment extends BaseDocument {
  name: string
  isin?: string
  ticker?: string
  assetClass: AssetClass
  broker: Broker
  quantity: number
  avgCost: number
  currentPrice: number
  currentValue: number
  currency: Currency
  isPac: boolean
  pacMonthlyAmount?: number
  lastPriceUpdate: Timestamp
}

export interface PacConfig extends BaseDocument {
  name: string
  isin: string
  ticker?: string
  monthlyAmount: number
  dayOfMonth?: number
  monthlyDays?: number[]
  startDate: string
  endDate?: string
  active: boolean
  autoUpdate: boolean
  platform?: string
  notes?: string
}

// --------------------------------------------------------
// PAYROLL / CEDOLINI
// /users/{uid}/payslips/{payslipId}
// --------------------------------------------------------

export interface Payslip extends BaseDocument {
  year: number
  month: Month
  grossSalary: number
  netSalary: number
  irpef: number
  inps: number
  tfr: number
  fondoPensione: number
  bonus?: number
  rimborsiSpese?: number
  surplus?: number
  documentUrl?: string
  parsed: boolean
  rawText?: string
}

export interface SurplusBreakdown {
  month: Month
  year: number
  netSalary: number
  fixedExpenses: number
  surplus: number
}

// --------------------------------------------------------
// KINDERGARTEN (Issue #19)
// /users/{uid}/kindergartenExpenses/{expenseId}
// /users/{uid}/config/kindergarten
// --------------------------------------------------------

export type KindergartenCategory =
  | 'retta'
  | 'mensa'
  | 'attivita_extra'
  | 'materiale'
  | 'altro'

export type KindergartenFrequency = 'monthly' | 'once'

export interface KindergartenExpense extends BaseDocument {
  description: string
  amount: number
  year: number
  month: Month
  category: KindergartenCategory
  frequency: KindergartenFrequency
  note?: string
}

export interface KindergartenConfig extends BaseDocument {
  monthlyBudget: number
  alertOnOverBudget: boolean
  childName?: string
}

export interface KindergartenSummary {
  year: number
  totalAnnual: number
  totalMonthly: number
  byCategory: Record<KindergartenCategory, number>
  budgetMonthly: number
  isOverBudget: boolean
  currentMonthTotal: number
}
