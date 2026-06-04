import { describe, it, expect, vi, beforeEach } from 'vitest'
import { classifyDocumentType, extractMonth, extractFields } from './parseDocument'

describe('parseDocument helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('classifyDocumentType', () => {
    it('should classify cedolino by keyword "netto in busta"', () => {
      const text = 'Il tuo netto in busta per il mese corrente'
      expect(classifyDocumentType(text)).toBe('cedolino')
    })

    it('should classify cedolino by keyword "busta paga"', () => {
      const text = 'Busta paga del dipendente'
      expect(classifyDocumentType(text)).toBe('cedolino')
    })

    it('should classify estratto_conto by keyword "saldo"', () => {
      const text = 'Il saldo del tuo conto è di 1000 EUR'
      expect(classifyDocumentType(text)).toBe('estratto_conto')
    })

    it('should classify conferma_investimento by keyword "ISIN"', () => {
      const text = 'Conferma ordine per ISIN IE00B4L5Y983'
      expect(classifyDocumentType(text)).toBe('conferma_investimento')
    })

    it('should classify estratto_conto by keyword "riepilogo"', () => {
      const text = 'Riepilogo delle transazioni mensili'
      expect(classifyDocumentType(text)).toBe('estratto_conto')
    })

    it('should return "altro" for unrecognized text', () => {
      const text = 'Testo generico senza keyword'
      expect(classifyDocumentType(text)).toBe('altro')
    })
  })

  describe('extractMonth', () => {
    it('should extract month and year from "maggio 2026"', () => {
      const text = 'Competenza del mese di maggio 2026'
      expect(extractMonth(text)).toEqual({ month: 5, year: 2026, confidence: 90 })
    })

    it('should extract month and year from pattern "05/2026"', () => {
      const text = 'Periodo 05/2026'
      expect(extractMonth(text)).toEqual({ month: 5, year: 2026, confidence: 90 })
    })

    it('should extract month and year from pattern "05-2026" (dash separator)', () => {
      const text = 'Competenza 12-2025'
      expect(extractMonth(text)).toEqual({ month: 12, year: 2025, confidence: 90 })
    })

    it('should return confidence 0 for text without date', () => {
      const text = 'Nessuna data qui'
      expect(extractMonth(text)).toEqual({ confidence: 0 })
    })
  })

  describe('extractFields', () => {
    it('should extract netSalary from cedolino text', () => {
      const text = 'Netto a pagare: 2.500,00'
      const fields = extractFields(text, 'cedolino')
      const netSalary = fields.find((f) => f.fieldName === 'netSalary')
      expect(netSalary?.extractedValue).toBe('2.500,00')
      expect(netSalary?.confidence).toBe(85)
    })

    it('should return confidence 0 for missing field', () => {
      const text = 'Solo testo a caso'
      const fields = extractFields(text, 'cedolino')
      const netSalary = fields.find((f) => f.fieldName === 'netSalary')
      expect(netSalary?.extractedValue).toBe('')
      expect(netSalary?.confidence).toBe(0)
    })

    it('should return empty array for non-cedolino type', () => {
      const text = 'Netto a pagare: 2.500,00'
      expect(extractFields(text, 'estratto_conto')).toEqual([])
    })

    it('should extract all fields from a complete cedolino text', () => {
      const text = `
        Lordo: 3.500,00
        Netto: 2.500,00
        IRPEF: 600,00
        INPS: 300,00
        TFR: 100,00
      `
      const fields = extractFields(text, 'cedolino')
      expect(fields).toEqual([
        { fieldName: 'netSalary', extractedValue: '2.500,00', confidence: 85 },
        { fieldName: 'grossSalary', extractedValue: '3.500,00', confidence: 80 },
        { fieldName: 'irpef', extractedValue: '600,00', confidence: 80 },
        { fieldName: 'inps', extractedValue: '300,00', confidence: 75 },
        { fieldName: 'tfr', extractedValue: '100,00', confidence: 70 },
      ])
    })

    it('should return empty values when fields are not present in cedolino text', () => {
      const text = 'Questo è un cedolino ma senza cifre'
      const fields = extractFields(text, 'cedolino')
      fields.forEach(f => {
        expect(f.extractedValue).toBe('')
        expect(f.confidence).toBe(0)
      })
    })
  })
})
