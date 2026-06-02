// ============================================================
// CORE TYPES - manti_finance_dev
// Modello dati v3 - allineato alle implementazioni reali
// Aggiornato 03/06/2026 — fix tsc --noEmit (post-mortem #46)
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

// Permissive union: .error is accessible after narrowing (!result.success)
// Never access .error without checking success first (see §4 of issue #46)
export type ApiResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string }

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
  lastPriceUpdate: Timestamp
  tickerOnly?: boolean
  autoUpdate?: boolean
  lastUpdateError?: string | null
  lastUpdateAttempt?: Timestamp | null
  yahooSymbol?: string
  priceSource?: string
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
  surplus?: number          // calcolato downstream, non sempre presente
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
  projectedBonus: number
  projectedTFR: number
  projectedFondoPensione: number
  monthsRemaining: number
  monthsElapsed?: number
  cumulativeNet?: number
  cumulativeSurplus?: number  // aggiunto da payroll.ts
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
  avgSurplusPrevious?: number  // aggiunto da payroll.ts
  netDeltaAbsolute?: number
  netDeltaPercent?: number
  avgSurplusCurrent?: number
}

export interface MonthlyVariableComponents {
  month: Month
  year: number
  bonus: number
  rimborsi: number           // campo primario (non rimborsiSpese)
  rimborsiSpese?: number     // alias legacy opzionale
  total: number              // campo primario
  totalVariable?: number
  totalStable?: number
  variableRatio?: number
}

// --------------------------------------------------------
// MUTUO
// /users/{uid}/config/mutuo
// NOTA: non estende BaseDocument — il documento Firestore
// è un config singleton senza id/createdAt/updatedAt espliciti
// --------------------------------------------------------

export interface MutuoConfig {
  // Campi primari (usati da mutuo.ts e whatIf.ts)
  importoOriginale: number
  debitoResiduo: number
  rataMensile: number
  tasso: number
  dataInizio: Timestamp | string
  dataFine: Timestamp | string
  isMutuoVariabile: boolean
  // Campi alias legacy (opzionali per retrocompatibilità)
  importoIniziale?: number
  saldoResiduo?: number
  rata?: number
  tassoAnnuo?: number
  durataAnni?: number
  banca?: string
  tipoTasso?: 'fisso' | 'variabile' | 'misto'
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
  baselineAmount: number       // required — usato da goal.ts per calcolo progressPercent
  targetDate: Timestamp        // required — sempre Timestamp (non stringa)
  priority?: 1 | 2 | 3        // opzionale — non tutti i servizi lo scrivono
  linkedAccountId?: string
  notes?: string
  note?: string
}

// GoalProgress — fonte di verita': goal.ts (calculateGoalProgress)
// Vedi §9 di issue #46 per dettagli
export interface GoalProgress {
  goalId: string
  progressPercent: number           // campo primario (non 'percent')
  currentAmount: number
  targetAmount: number
  remainingAmount?: number
  remainingMonths?: number
  projectedCompletionDate: Date | null   // Date JS o null (non stringa)
  isOnTrack: boolean                // campo primario (non 'onTrack')
  milestoneReached: 0 | 25 | 50 | 75 | 100 | null
}

export interface GoalWithProgress extends Goal {
  progress: GoalProgress
}

// --------------------------------------------------------
// ALERTS
// --------------------------------------------------------

export type AlertSeverity = 'info' | 'warning' | 'error' | 'success' | 'critical'

export interface FinancialAlert extends BaseDocument {
  title?: string           // opzionale — alert.ts non lo popola sempre
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

// ConfidenceField è un OGGETTO (non una union di stringhe)
// I servizi usano array di ConfidenceField, non Record<string, number>
export interface ConfidenceField {
  fieldName: string
  extractedValue: unknown
  confidence: number        // 0-100
  confirmedValue?: unknown
  confirmedAt?: Timestamp
}

// Alias per la union di nomi di campo (usato internamente dove serve)
export type ConfidenceFieldName =
  | 'amount' | 'category' | 'date' | 'description' | 'type' | 'accountId'

export interface InboxItem extends BaseDocument {
  title?: string           // opzionale nei nuovi documenti
  description?: string     // opzionale
  status: InboxItemStatus
  source: 'email' | 'import' | 'upload'
  confidence?: number      // opzionale — non sempre calcolato
  confidenceFields: ConfidenceField[]   // ARRAY di oggetti
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
  requiresReview: number   // campo primario
  pending?: number         // alias legacy opzionale
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
  name?: string            // opzionale — document.ts non lo scrive sempre
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
// AUDIT LOG
// --------------------------------------------------------

export type AuditAction =
  | 'create' | 'update' | 'delete' | 'read'
  | 'login' | 'logout' | 'export' | 'import'
  | 'snapshot' | 'LEGACY_IMPORT'

export type AuditEntityType =
  | 'transaction' | 'investment' | 'payslip' | 'snapshot'
  | 'goal' | 'document' | 'inbox' | 'alert' | 'config'
  | 'account' | 'recurringExpense' | 'inboxItem'
  | 'scenario' | 'monthlyClose'

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
// PREVIDENZA
// --------------------------------------------------------

export interface TFRData {
  // Campi primari scritti da previdenza.ts
  annoCompetenza?: number
  retribuzioneAnnuale?: number
  quota?: number
  rivalutazione?: number
  totale?: number
  // Campi richiesti da types v2 (da allineare con il servizio)
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
  anno?: number
  quotaDipendente?: number
  quotaDatore?: number
  tfr?: number
  // NOTA: 'totale' non esiste in FonteData — errore in previdenza.ts da fixare separatamente
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

// --------------------------------------------------------
// KINDERGARTEN (legacy expense model — deprecato)
// Nuovo modello investimenti/PAC: src/types/kindergarten.ts
// --------------------------------------------------------

export type KindergartenCategory =
  | 'retta' | 'mensa' | 'attivita_extra' | 'materiale' | 'altro'

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
