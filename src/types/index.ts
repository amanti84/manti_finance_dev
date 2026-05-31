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
  surplusGross: number
  stableComponent: number
  variableComponent: number
  bonusAmount: number
  rimborsiAmount: number
}

export interface AnnualProjection {
  year: number
  monthsElapsed: number
  cumulativeNet: number
  cumulativeSurplus: number
  projectedAnnualNet: number
  projectedAnnualSurplus: number
  averageMonthlyNet: number
  averageMonthlySurplus: number
}

export interface YoYComparison {
  year: number
  previousYear: number
  avgNetCurrent: number
  avgNetPrevious: number
  netDeltaAbsolute: number
  netDeltaPercent: number
  avgSurplusCurrent: number
  avgSurplusPrevious: number
  surplusDeltaAbsolute: number
  surplusDeltaPercent: number
  totalBonusCurrent: number
  totalBonusPrevious: number
}

export interface MonthlyVariableComponents {
  month: Month
  year: number
  bonus: number
  rimborsiSpese: number
  totalVariable: number
  totalStable: number
  variableRatio: number
}

// --------------------------------------------------------
// AUDIT LOG
// /users/{uid}/audit/{logId}
// --------------------------------------------------------

export type AuditAction = 'create' | 'update' | 'delete' | 'import' | 'snapshot' | 'SEED_DATA'

export type AuditEntityType =
  | 'snapshot'
  | 'transaction'
  | 'investment'
  | 'payslip'
  | 'config'
  | 'account'
  | 'recurringExpense'
  | 'monthlyClose'
  | 'scenario'
  | 'alert'
  | 'document'
  | 'goal'
  | 'inboxItem'
  | 'pacs'
  | 'seed'
  | 'parseDocument'
  | 'kindergartenExpense'
  | 'kindergartenConfig'


export interface AuditLogEntry extends BaseDocument {
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  source: 'user' | 'system' | 'import'
  ipHash?: string
}

// --------------------------------------------------------
// MONTHLY CLOSE (Issue #26)
// --------------------------------------------------------

export type MonthStatus = 'OPEN' | 'CLOSED' | 'LOCKED'

export interface MonthlyCloseResult {
  month: Month
  year: number
  status: MonthStatus
  snapshotId: string
  closedAt: Timestamp
}

// --------------------------------------------------------
// ALERTS (Issue #28)
// /users/{uid}/alerts/{alertId}
// --------------------------------------------------------

export type AlertType =
  | 'SALDO_SOTTO_SOGLIA'
  | 'CEDOLINO_MANCANTE'
  | 'MESE_NON_CHIUSO'
  | 'SURPLUS_ANOMALO'
  | 'PATRIMONIO_VARIAZIONE'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface FinancialAlert extends BaseDocument {
  type: AlertType
  severity: AlertSeverity
  message: string
  read: boolean
  snoozedUntil?: Timestamp
}

// --------------------------------------------------------
// GOAL TRACKER (Issue #30)
// /users/{uid}/goals/{goalId}
// --------------------------------------------------------

export type GoalType =
  | 'ESTINZIONE_MUTUO'
  | 'PATRIMONIO_TARGET'
  | 'FONDO_PENSIONE'
  | 'RISERVA_LIQUIDITA'
  | 'OBIETTIVO_KINDERGARTEN'

export type GoalStatus = 'active' | 'completed' | 'paused'

export interface Goal extends BaseDocument {
  type: GoalType
  name: string
  targetAmount: number
  targetDate: Timestamp
  baselineAmount: number
  currentAmount: number
  status: GoalStatus
  note?: string
}

export interface GoalProgress {
  goalId: string
  currentAmount: number
  targetAmount: number
  progressPercent: number
  projectedCompletionDate: Date | null
  isOnTrack: boolean
  milestoneReached: 0 | 25 | 50 | 75 | 100 | null
}

// --------------------------------------------------------
// CONFIGURAZIONE UTENTE
// /users/{uid}/config/{configId}
// --------------------------------------------------------

export interface BankAccount {
  id: string
  name: string
  bank: string
  iban?: string
  type: 'corrente' | 'risparmio' | 'investimento'
}

export interface MutuoConfig {
  importoOriginale: number
  debitoResiduo: number
  rataMensile: number
  tasso: number
  dataInizio: Timestamp
  dataFine: Timestamp
  isMutuoVariabile: boolean
}

export interface UserConfig extends BaseDocument {
  accounts: BankAccount[]
  mutuo?: MutuoConfig
  alertsEnabled: boolean
  monthlyCloseReminderDay: number
}

// --------------------------------------------------------
// UI / UTILITY TYPES
// --------------------------------------------------------

export type ApiResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string }

export interface DateRange {
  from: Date
  to: Date
}

export interface MonthYear {
  year: number
  month: Month
}

// --------------------------------------------------------
// PREVIDENZA / TFR (Issue #14)
// --------------------------------------------------------

export interface TFRData {
  annoCompetenza: number
  retribuzioneAnnuale: number
  quota: number
  rivalutazione: number
  totale: number
}

export interface FonteData {
  anno: number
  quotaDipendente: number
  quotaDatore: number
  tfr: number
  totale: number
}

export interface PensionFund {
  id: string
  nome: string
  tipo: 'fonte' | 'fondoAperto' | 'pip' | 'altro'
  lineaInvestimento: string
  saldoAttuale: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

// --------------------------------------------------------
// KINDERGARTEN (Issue #19)
// /users/{uid}/kindergartenExpenses/{expenseId}
// --------------------------------------------------------

export type KindergartenCategory =
  | 'retta'
  | 'mensa'
  | 'attivita_extra'
  | 'materiale'
  | 'altro'

export type KindergartenFrequency = 'monthly' | 'annual' | 'once'

export interface KindergartenExpense extends BaseDocument {
  category: KindergartenCategory
  description: string
  amount: number
  frequency: KindergartenFrequency
  month?: Month | null // se frequency === 'monthly' o 'once'
  year: number
  note?: string
}

export interface KindergartenConfig extends BaseDocument {
  monthlyBudget: number // budget mensile configurabile
  alertOnOverBudget: boolean // attiva alert sforamento
}

export interface KindergartenSummary {
  year: number
  totalAnnual: number
  totalMonthly: number // media mensile
  byCategory: Record<KindergartenCategory, number>
  budgetMonthly: number
  isOverBudget: boolean
  currentMonthTotal: number
}

// --------------------------------------------------------
// DOCUMENT INTAKE (Issue #18)
// /users/{uid}/documents/{documentId}
// --------------------------------------------------------

export type DocumentType =
  | 'cedolino'
  | 'estratto_conto'
  | 'conferma_investimento'
  | 'altro'

export type DocumentStatus =
  | 'uploaded'
  | 'classified'
  | 'linked'

export interface FinancialDocument extends BaseDocument {
  type: DocumentType
  status: DocumentStatus
  fileName: string
  storagePath: string
  downloadUrl: string
  fileSize: number
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png'
  documentDate?: Timestamp
  note?: string
  linkedEntityType?: 'payslip' | 'investment' | 'snapshot'
  linkedEntityId?: string
}

// --------------------------------------------------------
// FINANCIAL INBOX + CONFIDENCE REVIEW (Issue #31)
// /users/{uid}/inboxItems/{itemId}
// --------------------------------------------------------

export type InboxItemStatus =
  | 'RICEVUTO'
  | 'IN_ELABORAZIONE'
  | 'ESTRATTO'
  | 'IN_REVIEW'
  | 'CONFERMATO'
  | 'ERRORE'

export interface ConfidenceField {
  fieldName: string
  extractedValue: unknown
  confidence: number
  confirmedValue?: unknown
  confirmedAt?: Timestamp
}

export interface InboxItem extends BaseDocument {
  documentId: string
  fileName: string
  status: InboxItemStatus
  source: 'upload' | 'email'
  confidenceFields: ConfidenceField[]
  reviewedAt?: Timestamp
  confirmedAt?: Timestamp
  errorMessage?: string
}

export interface InboxBadgeCount {
  total: number
  requiresReview: number
}

// --------------------------------------------------------
// PDF PARSER (Issue #29)
// --------------------------------------------------------

export type ParsedDocumentType = 'cedolino' | 'estratto_conto' | 'conferma_investimento' | 'altro'

export interface ParsedField {
  fieldName: string // es. 'netSalary', 'grossSalary', 'irpef', 'inps', 'tfr'
  extractedValue: string // valore grezzo estratto dal testo
  confidence: number // 0-100
}

export interface ParseDocumentResult {
  documentType: ParsedDocumentType
  month?: number // 1-12, se rilevato
  year?: number // es. 2026, se rilevato
  fields: ParsedField[] // campi estratti con confidenza
  rawText: string // testo grezzo per debug
}

// --------------------------------------------------------
// PREVIDENZA CONTRIBUTIONS
// --------------------------------------------------------

export interface PensionContribution {
  id: string
  fundId: string
  anno: number
  mese: Month
  quotaDipendente: number
  quotaDatore: number
  tfrConferito: number
  totale: number
  createdAt: Timestamp
  updatedAt: Timestamp
}