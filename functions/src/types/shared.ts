/**
 * Tipi condivisi tra frontend e Cloud Functions.
 * Questa è la copia locale per le functions — non importare da ../../src/types
 * per evitare dipendenze da firebase/firestore client-side.
 */
import { Timestamp } from "firebase-admin/firestore";

export interface PACDocument {
  name: string
  isin?: string
  ticker?: string
  monthlyAmount: number
  active?: boolean
  autoUpdate?: boolean
  shares?: number
  avgCost?: number
  lastPaymentDate?: Timestamp
  monthlyDays?: number[]
  totalInvested?: number
  currentPrice?: number
  platform?: string
  broker?: string
}

export interface InvestmentDocument {
  name: string
  isin?: string
  ticker?: string
  quantity: number
  avgCost?: number
  purchasePrice?: number
  currentPrice: number
  currentValue: number
  updatedAt: Timestamp
  lastPriceUpdate: Timestamp
}

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

export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export type ApiResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string }

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

export interface PriceResult {
  isin: string
  price: number
  currency: string
  source: string
  fetchedAt: Timestamp
  symbol?: string
  name?: string
}

export interface ISINCacheEntry extends PriceResult {
  expiresAt: Timestamp
}

export interface PACProcessingResult {
  pacId: string
  name: string
  success: boolean
  price?: number
  sharesPurchased?: number
  error?: string
}
