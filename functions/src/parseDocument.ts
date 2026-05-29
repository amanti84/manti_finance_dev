import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import pdfParse from 'pdf-parse'
import type { ParseDocumentResult, ParsedDocumentType, ParsedField, Month } from '../../src/types'

// Inizializza admin se non lo è già
if (admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()

/**
 * Classifica il tipo di documento in base al testo estratto
 */
export function classifyDocumentType(text: string): ParsedDocumentType {
  const lowerText = text.toLowerCase()
  if (
    lowerText.includes('cedolino') ||
    lowerText.includes('busta paga') ||
    lowerText.includes('netto in busta') ||
    lowerText.includes('inps')
  ) {
    return 'cedolino'
  }
  if (
    lowerText.includes('estratto conto') ||
    lowerText.includes('saldo') ||
    lowerText.includes('movimenti')
  ) {
    return 'estratto_conto'
  }
  if (
    lowerText.includes('conferma') ||
    lowerText.includes('ordine eseguito') ||
    lowerText.includes('isin') ||
    lowerText.includes('controvalore')
  ) {
    return 'conferma_investimento'
  }
  return 'altro'
}

/**
 * Estrae mese e anno dal testo
 */
export function extractMonth(text: string): { month?: number; year?: number } {
  const months = [
    'gennaio',
    'febbraio',
    'marzo',
    'aprile',
    'maggio',
    'giugno',
    'luglio',
    'agosto',
    'settembre',
    'ottobre',
    'novembre',
    'dicembre',
  ]

  const lowerText = text.toLowerCase()

  // Cerca pattern: mese + anno (es. maggio 2026)
  for (let i = 0; i < months.length; i++) {
    const monthRegex = new RegExp(`(${months[i]})\\s+(\\d{4})`, 'i')
    const match = lowerText.match(monthRegex)
    if (match) {
      return { month: i + 1, year: parseInt(match[2], 10) }
    }
  }

  // Cerca pattern numerico MM/YYYY o MM-YYYY
  const numericRegex = /(\d{2})[/-](\d{4})/
  const numMatch = lowerText.match(numericRegex)
  if (numMatch) {
    const m = parseInt(numMatch[1], 10)
    if (m >= 1 && m <= 12) {
      return { month: m, year: parseInt(numMatch[2], 10) }
    }
  }

  return {}
}

/**
 * Estrae i campi chiave per i cedolini
 */
export function extractFields(text: string, type: ParsedDocumentType): ParsedField[] {
  if (type !== 'cedolino') return []

  const fields: { name: string; pattern: RegExp; confidence: number }[] = [
    { name: 'netSalary', pattern: /netto.*?([\d.]+,[\d]{2})/i, confidence: 85 },
    { name: 'grossSalary', pattern: /lordo.*?([\d.]+,[\d]{2})/i, confidence: 80 },
    { name: 'irpef', pattern: /irpef.*?([\d.]+,[\d]{2})/i, confidence: 80 },
    { name: 'inps', pattern: /inps.*?([\d.]+,[\d]{2})/i, confidence: 75 },
    { name: 'tfr', pattern: /tfr.*?([\d.]+,[\d]{2})/i, confidence: 70 },
  ]

  return fields.map((f) => {
    const match = text.match(f.pattern)
    return {
      fieldName: f.name,
      extractedValue: match ? match[1] : '',
      confidence: match ? f.confidence : 0,
    }
  })
}

export const parseDocument = functions.https.onCall(
  async (data: { uid: string; storagePath: string; inboxItemId: string }, context: functions.https.CallableContext) => {
    const { uid, storagePath, inboxItemId } = data

    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    // Security Check: ensure uid belongs to the authenticated user
    if (uid !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Unauthorized access to user data')
    }

    // Security Check: ensure storagePath belongs to the user
    if (!storagePath.startsWith(`users/${uid}/`)) {
      throw new functions.https.HttpsError('permission-denied', 'Unauthorized access to storage path')
    }

    try {
      // 1. Scarica il file da Storage
      const bucket = admin.storage().bucket()
      const file = bucket.file(storagePath)
      const [content] = await file.download()

      // 2. Estrai testo con pdf-parse
      const data = await pdfParse(content)
      const rawText = data.text

      // 3. Classifica il documento
      const documentType = classifyDocumentType(rawText)

      // 4. Estrai i campi
      const { month, year } = extractMonth(rawText)
      const fields = extractFields(rawText, documentType)

      // 5. Aggiorna InboxItem su Firestore
      await db.doc(`users/${uid}/inboxItems/${inboxItemId}`).update({
        status: 'ESTRATTO',
        confidenceFields: fields.map((f) => ({
          fieldName: f.fieldName,
          extractedValue: f.extractedValue,
          confidence: f.confidence,
        })),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // Audit log
      await db.collection(`users/${uid}/audit`).add({
        entityType: 'parseDocument',
        entityId: inboxItemId,
        action: 'update',
        newValue: { documentType, month, year, fieldsCount: fields.length },
        source: 'system',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // 6. Ritorna ParseDocumentResult
      const result: ParseDocumentResult = {
        documentType,
        month,
        year,
        fields,
        rawText,
      }

      return result
    } catch (error) {
      console.error('parseDocument failed:', error)
      await db.doc(`users/${uid}/inboxItems/${inboxItemId}`).update({
        status: 'ERRORE',
        errorMessage: error instanceof Error ? error.message : String(error),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      throw new functions.https.HttpsError('internal', 'Document parsing failed')
    }
  }
)
