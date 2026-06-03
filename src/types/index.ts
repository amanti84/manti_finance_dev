// ============================================================
// CORE TYPES - manti_finance_dev
// Modello dati v2 - tutti i tipi del progetto
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
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never }

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
  surplus?: number
  /** Surplus lordo prima delle spese fisse */
  surplusGross: number
  /** Quota bonus del mese (0 se assente) */
  bonusAmount: number
  /** Quota variabile (bonus + rimborsi) */
  variableComponent: number
  /** Quota stabile (netto senza variabile) */
  stableComponent: number
  /** Rimborsi spese del mese */
  rimborsiAmount: number
}

export interface AnnualProjection {
  year: number
  projectedGross: number
  projectedNet: number
  projectedBonus: number
  projectedTFR: number
  projectedFondoPensione: number
  monthsRemaining: number
  confidence: 'high' | 'medium' | 'low'
  monthsElapsed?: number
  cumulativeNet?: number
  cumulativeSurplus?: number
  projectedAnnualNet?: number
  projectedAnnualSurplus?: number
  averageMonthlyNet?: number
  averageMonthlySurplus?: number
}

export interface YoYComparison {
  currentYear: number
  previousYear: number
  netSalaryDelta: number
  netSalaryDeltaPercent: number
  grossSalaryDelta: number
  bonusDelta: number
  year?: number
  avgNetCurrent?: number
  avgNetPrevious?: number
  netDeltaAbsolute?: number
  netDeltaPercent?: number
  avgSurplusCurrent?: number
  avgSurplusPrevious?: number
  surplusDeltaAbsolute?: number
  surplusDeltaPercent?: number
  totalBonusCurrent?: number
  totalBonusPrevious?: number
}

export interface MonthlyVariableComponents {
  month: Month
  year: number
  bonus: number
  rimborsi: number
  total: number
  rimborsiSpese?: number
  totalVariable?: number
  totalStable?: number
  variableRatio?: number
}

// --------------------------------------------------------
// MUTUO
// /users/{uid}/config/mutuo
// --------------------------------------------------------

export interface MutuoConfig extends BaseDocument {
  importoIniziale: number
  saldoResiduo: number
  rata: number
  tassoAnnuo: number
  dataInizio: Timestamp | string
  durataAnni: number
  banca: string
  tipoTasso: 'fisso' | 'variabile' | 'misto'
  notes?: string
  importoOriginale: number
  debitoResiduo: number
  rataMensile: number
  tasso: number
  dataFine: Timestamp | string
  isMutuoVariabile: boolean
}

// --------------------------------------------------------
// MONTHLY CLOSE
// /users/{uid}/monthlyClose/{year_month}
// --------------------------------------------------------

export type MonthStatus =
  | 'open' | 'pending' | 'closed'
  | 'OPEN' | 'PENDING' | 'CLOSED' | 'LOCKED'

export interface MonthlyCloseResult extends BaseDocument {
  year: number
  month: Month
  status: MonthStatus
  patrimonioNetto?: number
  surplusMensile?: number
  netSalary?: number
  fixedExpenses?: number
  snapshotId?: string
  closedAt?: Timestamp
  notes?: string
}

// --------------------------------------------------------
// GOALS / OBIETTIVI
// /users/{uid}/goals/{goalId}
// --------------------------------------------------------

export type GoalType =
  | 'risparmio' | 'investimento' | 'estinzione_debito'
  | 'acquisto' | 'pensione' | 'emergenza' | 'altro'
  | 'PATRIMONIO_TARGET'

export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled'

export interface Goal extends BaseDocument {
  name: string
  description?: string
  type: GoalType
  status: GoalStatus
  targetAmount: number
  currentAmount: number
  targetDate: Timestamp | string
  priority?: 1 | 2 | 3
  linkedAccountId?: string
  notes?: string
  note?: string
  baselineAmount?: number
}

export interface GoalProgress {
  goalId: string
  percent: number
  remainingAmount: number
  remainingMonths?: number
  onTrack: boolean
  projectedCompletionDate: string | null
  progressPercent: number
  isOnTrack: boolean
  milestoneReached: 0 | 25 | 50 | 75 | 100 | null
  currentAmount: number
  targetAmount: number
  on_track?: boolean
}

export interface GoalWithProgress extends Goal {
  progress: GoalProgress
  on_track?: boolean
}

// --------------------------------------------------------
// ALERTS
// /users/{uid}/alerts/{alertId}
// --------------------------------------------------------

export type AlertSeverity = 'info' | 'warning' | 'error' | 'success' | 'critical'

export interface FinancialAlert extends BaseDocument {
  title?: string
  message: string
  severity: AlertSeverity
  read: boolean
  type?: string
  entityType?: string
  entityId?: string
  actionLabel?: string
  actionRoute?: string
  snoozedUntil?: Timestamp
}

// --------------------------------------------------------
// INBOX
// /users/{uid}/inbox/{inboxItemId}
// --------------------------------------------------------

export type InboxItemStatus =
  | 'pending' | 'reviewed' | 'dismissed' | 'escalated'
  | 'RICEVUTO' | 'IN_ELABORAZIONE' | 'ESTRATTO'
  | 'IN_REVIEW' | 'CONFERMATO' | 'ERRORE'

export interface ConfidenceField {
  fieldName: string
  extractedValue: unknown
  confidence: number
  confirmedValue?: unknown
  confirmedAt?: Timestamp
}

export type ConfidenceFieldName =
  | 'amount' | 'category' | 'date' | 'description' | 'type' | 'accountId'

export interface InboxItem extends BaseDocument {
  title?: string
  description?: string
  status: InboxItemStatus
  source: 'email' | 'import' | 'ai_suggestion' | 'upload'
  confidence?: number
  confidenceFields: ConfidenceField[] | Partial<Record<ConfidenceFieldName, number>>
  linkedTransactionId?: string
  suggestedTransaction?: Partial<Transaction>
  reviewedAt?: Timestamp
  reviewedBy?: string
  errorMessage?: string
  confirmedAt?: Timestamp
  fileName?: string
  documentId?: string
}

export interface InboxBadgeCount {
  total: number
  requiresReview: number
  pending: number
}

// --------------------------------------------------------
// DOCUMENTI
// /users/{uid}/documents/{documentId}
// --------------------------------------------------------

export type DocumentType =
  | 'cedolino' | 'estratto_conto' | 'contratto' | 'polizza'
  | 'dichiarazione_redditi' | 'quietanza' | 'altro'
  | 'conferma_investimento'

export type DocumentStatus =
  | 'uploaded' | 'processing' | 'indexed' | 'error'
  | 'linked' | 'classified'

export interface FinancialDocument extends BaseDocument {
  name?: string
  type: DocumentType
  status: DocumentStatus
  storagePath: string
  downloadUrl?: string
  fileSize: number
  mimeType: string
  year?: number
  month?: Month
  linkedEntityType?: string
  linkedEntityId?: string
  tags?: string[]
  extractedText?: string
  notes?: string
  note?: string
  fileName?: string
  documentDate?: Timestamp | string
}

// --------------------------------------------------------
// AUDIT LOG
// /users/{uid}/audit/{auditId}
// --------------------------------------------------------

export type AuditAction =
  | 'create' | 'update' | 'delete' | 'read'
  | 'login' | 'logout' | 'export' | 'import' | 'snapshot' | 'LEGACY_IMPORT'

export type AuditEntityType =
  | 'transaction' | 'investment' | 'payslip' | 'snapshot'
  | 'goal' | 'document' | 'inbox' | 'alert' | 'config'
  | 'inboxItem' | 'kindergartenExpense' | 'kindergartenConfig' | 'monthlyClose'
  | 'account' | 'recurringExpense' | 'scenario'

export interface AuditLogEntry extends BaseDocument {
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  uid: string
  userEmail?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  source?: string
  previousValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
}

// --------------------------------------------------------
// PREVIDENZA
// /users/{uid}/config/previdenza
// --------------------------------------------------------

export interface TFRData {
  saldoAttuale?: number
  anno?: number
  mese?: Month
  destinazione?: 'azienda' | 'fondo_pensione' | 'inps'
  annoCompetenza?: number
  retribuzioneAnnuale?: number
  quota?: number
  rivalutazione?: number
  totale?: number
}

export interface FonteData extends BaseDocument {
  nome: string
  codice: string
  tipologia: 'aperto' | 'chiuso' | 'pip'
  rendimentoAnnuo?: number
  totale?: number
  anno?: number
  quotaDipendente?: number
  quotaDatore?: number
  tfr?: number
}

export type PensionContributionType = 'volontario' | 'datoriale' | 'tfr'

export interface PensionContribution extends BaseDocument {
  fondoId: string
  type: PensionContributionType
  amount: number
  year: number
  month: Month
  totale?: number
  quotaDipendente?: number
  quotaDatore?: number
  tfrConferito?: number
  fundId?: string
}

export interface PensionFund extends BaseDocument {
  nome: string
  codice: string
  saldoAttuale: number
  rendimentoStorico?: number
  contribuzioneAnnua: number
  tipologia: 'aperto' | 'chiuso' | 'pip'
  dataAdesione?: string
  notes?: string
  tipo?: 'aperto' | 'chiuso' | 'pip'
}

// --------------------------------------------------------
// KINDERGARTEN (legacy expense model — deprecato)
// Nuovo modello investimenti/PAC: src/types/kindergarten.ts
// /users/{uid}/kindergartenExpenses/{expenseId}  <- legacy
// /users/{uid}/config/kindergarten               <- legacy
// --------------------------------------------------------

export type KindergartenCategory =
  | 'retta'
  | 'mensa'
  | 'attivita_extra'
  | 'materiale'
  | 'altro'

export type KindergartenFrequency = 'monthly' | 'once' | 'annual'

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
