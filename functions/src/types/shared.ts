/**
 * Tipi condivisi tra frontend e Cloud Functions.
 * Questa è la copia locale per le functions — non importare da ../../src/types
 * per evitare dipendenze da firebase/firestore client-side.
 */

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
