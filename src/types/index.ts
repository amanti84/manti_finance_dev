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
  params: Record<string, number> // es. { importoEstinzione: 10000 }
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
  baselineSnapshotId: string // snapshotId di riferimento (es. 2026-05)
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
  dayOfMonth?: number // giorno scadenza
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
  taxCode?: string // codice fiscale
  onboardingComplete: boolean
}

// --------------------------------------------------------
// PATRIMONIO SNAPSHOT (mensile)
// /users/{uid}/snapshots/{snapshotId}
// --------------------------------------------------------

export interface PatrimonioSnapshot extends BaseDocument {
  year: number
  month: Month
  // Attivi
  contiCorrenti: number          // liquidita' totale
  investimenti: number           // portafoglio totale
  immobili: number               // valore immobili
  fondoPensione: number          // Fon.Te + altri fondi
  tfr: number                    // TFR maturato
  // Passivi
  mutuo: number                  // debito residuo mutuo
  altriDebiti: number
  // Calcolati
  patrimonioNetto: number        // attivi - passivi
  note?: string
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
  isKindergarten?: boolean    // spesa figlio (issue #19)
  confidence: number          // 0-1, per Confidence Review (issue #31)
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
  avgCost: number               // prezzo medio di carico
  currentPrice: number
  currentValue: number          // quantity * currentPrice
  currency: Currency
  isPac: boolean                // e' un PAC (issue #11)
  pacMonthlyAmount?: number
  lastPriceUpdate: Timestamp
}

// --------------------------------------------------------
// PAYROLL / CEDOLINI
// /users/{uid}/payslips/{payslipId}
// --------------------------------------------------------

export interface Payslip extends BaseDocument {
  year: number
  month: Month
  grossSalary: number           // RAL mensile lordo
  netSalary: number             // netto in busta
  irpef: number
  inps: number
  tfr: number                   // quota TFR del mese
  fondoPensione: number         // versamento mensile Fon.Te
  bonus?: number
  rimborsiSpese?: number
  surplus?: number              // calcolato: net - spese fisse
  documentUrl?: string          // Storage path del PDF
  parsed: boolean               // cedolino parsato automaticamente
  rawText?: string              // testo grezzo per debugging
}

// --------------------------------------------------------
// AUDIT LOG
// /users/{uid}/audit/{logId}
// --------------------------------------------------------

export type AuditAction = 'create' | 'update' | 'delete' | 'import' | 'snapshot'

feat/issue-27-what-if-engine-370912409506586420
export type AuditEntityType = 'snapshot' | 'transaction' | 'investment' | 'payslip' | 'config' | 'account' | 'recurringExpense' | 'monthlyClose' | 'scenario'
main

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

/**
 * Pattern canonico per tutti i metodi di servizio.
 * Usare sempre { success, data, error } — MAI { data, loading, error }.
 * Riferimento: src/services/payroll.ts
 */
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
