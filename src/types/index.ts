// ============================================================
// CORE TYPES - manti_finance_dev
// Modello dati v3 - allineato alle implementazioni reali
// Aggiornato 10/06/2026 — flexible PACSchedule for adult PAC
// ============================================================

import type { Timestamp } from 'firebase/firestore'
import type { PACSchedule } from './pacFrequency'

// --------------------------------------------------------
// BASE
// --------------------------------------------------------

export interface BaseDocument {
  id: string
  createdAt: Timestamp
  updatedAt: Timestamp
  legacyId?: string
}

// --------------------------------------------------------
// MONTHLY ALLOCATION (Issue #88)
// --------------------------------------------------------

export interface MonthlyAllocation extends BaseDocument {
  year: number
  month: Month
  netIncome: number
  allocations: AllocationItem[]
  totalAllocated: number
  surplus: number
  status: 'draft' | 'confirmed'
  confirmedAt?: Timestamp
}

export interface AllocationItem {
  id: string
  label: string
  category: 'saving' | 'investment' | 'fixed_expense' | 'variable_expense' | 'emergency'
  amount: number
  percentage: number
  isAutoFilled: boolean
  linkedServiceId?: string
}

// --------------------------------------------------------
// API RESULT
// --------------------------------------------------------

export type ApiResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string }

// --------------------------------------------------------
// DECISION ENGINE (Issue #12)
// --------------------------------------------------------

export interface DecisionRule {
  id: string
  condition: string
  action: string
  priority: number
  enabled: boolean
}

export interface DecisionContext {
  uid: string
  surplusMensile: number
  sogliaInvestimento: number
  debitoResiduoMutuo: number
  anniResiduiMutuo: number
  sogliaAnniMutuo: number
  saldoPensione: number
  targetPensionePct: number
  redditoAnnuo: number
  saldoConto: number
  bufferSicurezza: number
}

export interface DecisionResult {
  recommendation: string
  motivation: string
  amount: number | null
  ruleTriggered: string
  priority: number
}

export interface DecisionRecord {
  id?: string
  uid: string
  context: DecisionContext
  results: DecisionResult[]
  createdAt: Date
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
  schedule?: PACSchedule
  startDate?: string
  lastPaymentDate?: string
  nextPaymentDate?: string
  /** @deprecated use schedule */
  frequency?: string
  lastPriceUpdate: Timestamp
  tickerOnly?: boolean
  autoUpdate?: boolean
  lastUpdateError?: string | null
  lastUpdateAttempt?: Timestamp | null
  yahooSymbol?: string
  priceSource?: string
}

export interface PacPayment extends BaseDocument {
  investmentId: string
  investmentName: string
  data: Timestamp
  importo: number
  priceAtPayment: number
  quantityPurchased: number
  broker: string
}

export interface PacSummary {
  investmentId: string
  investmentName: string
  importoMensile: number
  totaleVersato: number
  numeroVersamenti: number
  mediaPrezzoAcquisto: number
  valoreAttuale: number
  pnlAssoluto: number
  pnlPercent: number
  primoVersamento: Timestamp | Date
  ultimoVersamento: Timestamp | Date
}

export interface PacProgress {
  investmentId: string
  investmentName: string
  obiettivo: number | null
  totaleVersato: number
  progressoPercent: number
  mesiRimanenti: number | null
  importoMensileMedio: number
  proiezioneCompletamento: Timestamp | Date | null
}

export interface PacAnalytics {
  totalePacAttivi: number
  totaleVersamentiMensili: number
  totaleCapitaleInvestito: number
  mediaRitorno: number
  migliorePerformance: { name: string; pnl: number }
  peggiorePerformance: { name: string; pnl: number }
}

export interface PACReturnData {
  totalInvested: number
  currentValue: number
  gainLoss: number
  gainLossPercent: number
  lastPaymentDate: Timestamp | null
}

export interface PacConfig extends BaseDocument {
  name: string
  isin: string
  ticker?: string
  schedule: PACSchedule         // sostituisce monthlyDays/dayOfMonth legacy
  monthlyAmount: number
  startDate: string
  endDate?: string
  active: boolean
  autoUpdate: boolean
  platform?: string
  notes?: string
  lastPaymentDate?: string      // ISO date
  nextPaymentDate?: string      // ISO date — calcolata automaticamente
  totalInvested?: number
  // legacy — mantenuti per retrocompatibilità lettura Firestore
  dayOfMonth?: number
  monthlyDays?: number[]
  // Metadati per calcolo patrimonio
  shares?: number
  avgCost?: number
  currentPrice?: number
}

// --------------------------------------------------------
// PAYROLL / CEDOLINI
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
  surplusGross: number
  bonusAmount: number
  variableComponent: number
  stableComponent: number
  rimborsiAmount: number
}

export interface AnnualProjection {
  year: number
  projectedGross: number
  projectedNet: number
  projectedAnnualNet?: number
  projectedAnnualSurplus?: number
  projectedBonus: number
  projectedTFR: number
  projectedFondoPensione: number
  monthsRemaining: number
  monthsElapsed?: number
  cumulativeNet?: number
  cumulativeSurplus?: number
  averageMonthlyNet?: number
  averageMonthlySurplus?: number
  confidence: 'high' | 'medium' | 'low'
}

export interface YoYComparison {
  year?: number
  currentYear: number
  previousYear: number
  netSalaryDelta: number
  netSalaryDeltaPercent: number
  grossSalaryDelta: number
  bonusDelta: number
  avgNetCurrent?: number
  avgNetPrevious?: number
  avgSurplusPrevious?: number
  netDeltaAbsolute?: number
  netDeltaPercent?: number
  avgSurplusCurrent?: number
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
  rimborsiSpese?: number
  total: number
  totalVariable?: number
  totalStable?: number
  variableRatio?: number
}

// --------------------------------------------------------
// MUTUO
// --------------------------------------------------------

export interface MutuoConfig {
  importoOriginale: number
  debitoResiduo: number
  rataMensile: number
  tasso: number
  dataInizio: Timestamp | string
  dataFine: Timestamp | string
  isMutuoVariabile: boolean
  banca?: string
  notes?: string
}

// --------------------------------------------------------
// MONTHLY CLOSE
// --------------------------------------------------------

export type MonthStatus =
  | 'open' | 'pending' | 'closed'
  | 'OPEN' | 'PENDING' | 'CLOSED' | 'LOCKED'

export interface MonthlyCloseResult extends BaseDocument {
  year: number
  month: Month
  status: MonthStatus
  patrimonioNetto: number
  surplusMensile: number
  netSalary: number
  fixedExpenses: number
  surplusGross?: number
  snapshotId?: string
  closedAt?: Timestamp
  notes?: string
}

// --------------------------------------------------------
// GOALS / OBIETTIVI
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
  baselineAmount: number
  targetDate: Timestamp
  priority?: 1 | 2 | 3
  linkedAccountId?: string
  notes?: string
  note?: string
}

export interface GoalProgress {
  goalId: string
  progressPercent: number
  currentAmount: number
  targetAmount: number
  remainingAmount?: number
  remainingMonths?: number
  projectedCompletionDate: Date | null
  isOnTrack: boolean
  milestoneReached: 0 | 25 | 50 | 75 | 100 | null
}

export interface GoalWithProgress extends Goal {
  progress: GoalProgress
  on_track?: boolean
}

// --------------------------------------------------------
// ALERTS
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
  source: 'email' | 'import' | 'upload' | 'ai_suggestion'
  confidence?: number
  confidenceFields: ConfidenceField[]
  linkedTransactionId?: string
  suggestedTransaction?: Partial<Transaction>
  reviewedAt?: Timestamp
  reviewedBy?: string
  fileName?: string
  documentId?: string
  errorMessage?: string
  confirmedAt?: Timestamp
}

export interface InboxBadgeCount {
  total: number
  requiresReview: number
  pending?: number
}

// --------------------------------------------------------
// PARSE DOCUMENT (Issue #29)
// --------------------------------------------------------

export type ParsedDocumentType =
  | 'cedolino'
  | 'estratto_conto'
  | 'conferma_investimento'
  | 'altro'

export interface ParsedField {
  fieldName: string
  extractedValue: string
  confidence: number
}

export interface ParseDocumentResult {
  documentType: ParsedDocumentType
  month?: number
  year?: number
  fields: ParsedField[]
  rawText: string
}

// --------------------------------------------------------
// DOCUMENTI
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
  fileName?: string
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
  documentDate?: Timestamp | string
}

// --------------------------------------------------------
// MIGRATION & AUDIT (Issue #131)
// --------------------------------------------------------

export interface MigrationCollectionResult {
  inserted: number
  skipped: number
  errors: string[]
}

export interface MigrationResult {
  pacs: MigrationCollectionResult
  investments: MigrationCollectionResult
  kindergartenPacs: MigrationCollectionResult
  kindergartenInvestments: MigrationCollectionResult
  transactions: MigrationCollectionResult
  sales: MigrationCollectionResult
  validation: {
    adultTotalInvested_legacy: number
    adultTotalInvested_new: number
    kindergartenTotalInvested_legacy: number
    kindergartenTotalInvested_new: number
    passed: boolean
    mismatchDetails: string[]
  }
}

export interface CollectionMoveResult {
  moved: number
  skipped: number
  errors: string[]
}

export interface MigrateCollectionsReport {
  adultPacs: CollectionMoveResult
  kindergartenPacs: CollectionMoveResult
  kindergartenInvestments: CollectionMoveResult
}

export interface CollectionAudit {
  legacyCount: number
  newCount: number
  mismatch: boolean
}

export interface SchemaValidation {
  totalChecked: number
  valid: number
  invalid: number
  errors: string[]
}

export interface SegregationValidation {
  passed: boolean
  violations: string[]
}

export interface MigrationAuditReport {
  pacs: CollectionAudit
  kindergartenPacs: CollectionAudit
  kindergartenInvestments: CollectionAudit
  schemaV3: SchemaValidation
  segregation: SegregationValidation
  overallPassed: boolean
  timestamp: Timestamp
}

// --------------------------------------------------------
// AUDIT LOG
// --------------------------------------------------------

export type AuditAction =
  | 'create' | 'update' | 'delete' | 'read'
  | 'login' | 'logout' | 'export' | 'import'
  | 'snapshot' | 'LEGACY_IMPORT' | 'sistema'

export type AuditEntityType =
  | 'transaction' | 'investment' | 'payslip' | 'snapshot'
  | 'goal' | 'document' | 'inbox' | 'alert' | 'config'
  | 'account' | 'recurringExpense' | 'inboxItem'
  | 'scenario' | 'monthlyClose'
  | 'kindergartenExpense' | 'kindergartenConfig'
  | 'monthlyAllocation'

export interface AuditLogEntry extends BaseDocument {
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  uid: string
  userEmail?: string
  metadata?: Record<string, unknown>
  ipHash?: string
  ipAddress?: string
  userAgent?: string
  source?: 'user' | 'import' | 'system'
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
}

// --------------------------------------------------------
// ISIN / PRICE DATA (Issue #138)
// --------------------------------------------------------

export interface PriceData {
  isin: string | null
  ticker: string
  name: string
  price: number
  currency: string
  currentValue: number
  timestamp: string
  source: string
  warning?: string
}

export type AssetISINType = 'etf' | 'fund-it' | 'fund-lu' | 'other'

// --------------------------------------------------------
// PREVIDENZA
// --------------------------------------------------------

export interface TFRData {
  annoCompetenza?: number
  retribuzioneAnnuale?: number
  quota?: number
  rivalutazione?: number
  totale?: number
  saldoAttuale?: number
  anno?: number
  mese?: Month
  destinazione?: 'azienda' | 'fondo_pensione' | 'inps'
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
  fundId?: string
  type: PensionContributionType
  amount: number
  year: number
  month: Month
  totale?: number
  quotaDipendente?: number
  quotaDatore?: number
  tfrConferito?: number
}

export interface PensionFund extends BaseDocument {
  nome: string
  codice: string
  saldoAttuale: number
  rendimentoStorico?: number
  contribuzioneAnnua: number
  tipologia: 'aperto' | 'chiuso' | 'pip'
  tipo?: 'aperto' | 'chiuso' | 'pip'
  dataAdesione?: string
  notes?: string
}

export interface PrevidenzaConfig extends BaseDocument {
  birthYear: number
  inpsStartYear: number
  currentRal: number
  pensionFundBroker?: string
  pensionFundContributionPct?: number
  pensionFundEmployerContributionPct?: number
  expectedReturnPct?: number
  retirementAgeTarget?: number
}
