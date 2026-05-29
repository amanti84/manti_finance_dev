"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const parseDocument_1 = require("./parseDocument");
(0, vitest_1.describe)('parseDocument helpers', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('classifyDocumentType', () => {
        (0, vitest_1.it)('should classify cedolino by keyword "netto in busta"', () => {
            const text = 'Il tuo netto in busta per il mese corrente';
            (0, vitest_1.expect)((0, parseDocument_1.classifyDocumentType)(text)).toBe('cedolino');
        });
        (0, vitest_1.it)('should classify cedolino by keyword "busta paga"', () => {
            const text = 'Busta paga del dipendente';
            (0, vitest_1.expect)((0, parseDocument_1.classifyDocumentType)(text)).toBe('cedolino');
        });
        (0, vitest_1.it)('should classify estratto_conto by keyword "saldo"', () => {
            const text = 'Il saldo del tuo conto è di 1000 EUR';
            (0, vitest_1.expect)((0, parseDocument_1.classifyDocumentType)(text)).toBe('estratto_conto');
        });
        (0, vitest_1.it)('should classify conferma_investimento by keyword "ISIN"', () => {
            const text = 'Conferma ordine per ISIN IE00B4L5Y983';
            (0, vitest_1.expect)((0, parseDocument_1.classifyDocumentType)(text)).toBe('conferma_investimento');
        });
        (0, vitest_1.it)('should return "altro" for unrecognized text', () => {
            const text = 'Testo generico senza keyword';
            (0, vitest_1.expect)((0, parseDocument_1.classifyDocumentType)(text)).toBe('altro');
        });
    });
    (0, vitest_1.describe)('extractMonth', () => {
        (0, vitest_1.it)('should extract month and year from "maggio 2026"', () => {
            const text = 'Competenza del mese di maggio 2026';
            (0, vitest_1.expect)((0, parseDocument_1.extractMonth)(text)).toEqual({ month: 5, year: 2026 });
        });
        (0, vitest_1.it)('should extract month and year from pattern "05/2026"', () => {
            const text = 'Periodo 05/2026';
            (0, vitest_1.expect)((0, parseDocument_1.extractMonth)(text)).toEqual({ month: 5, year: 2026 });
        });
        (0, vitest_1.it)('should return empty object for text without date', () => {
            const text = 'Nessuna data qui';
            (0, vitest_1.expect)((0, parseDocument_1.extractMonth)(text)).toEqual({});
        });
    });
    (0, vitest_1.describe)('extractFields', () => {
        (0, vitest_1.it)('should extract netSalary from cedolino text', () => {
            const text = 'Netto a pagare: 2.500,00';
            const fields = (0, parseDocument_1.extractFields)(text, 'cedolino');
            const netSalary = fields.find((f) => f.fieldName === 'netSalary');
            (0, vitest_1.expect)(netSalary?.extractedValue).toBe('2.500,00');
            (0, vitest_1.expect)(netSalary?.confidence).toBe(85);
        });
        (0, vitest_1.it)('should return confidence 0 for missing field', () => {
            const text = 'Solo testo a caso';
            const fields = (0, parseDocument_1.extractFields)(text, 'cedolino');
            const netSalary = fields.find((f) => f.fieldName === 'netSalary');
            (0, vitest_1.expect)(netSalary?.extractedValue).toBe('');
            (0, vitest_1.expect)(netSalary?.confidence).toBe(0);
        });
        (0, vitest_1.it)('should return empty array for non-cedolino type', () => {
            const text = 'Netto a pagare: 2.500,00';
            (0, vitest_1.expect)((0, parseDocument_1.extractFields)(text, 'estratto_conto')).toEqual([]);
        });
        (0, vitest_1.it)('should extract all fields from a complete cedolino text', () => {
            const text = `
        Lordo: 3.500,00
        Netto: 2.500,00
        IRPEF: 600,00
        INPS: 300,00
        TFR: 100,00
      `;
            const fields = (0, parseDocument_1.extractFields)(text, 'cedolino');
            (0, vitest_1.expect)(fields).toEqual([
                { fieldName: 'netSalary', extractedValue: '2.500,00', confidence: 85 },
                { fieldName: 'grossSalary', extractedValue: '3.500,00', confidence: 80 },
                { fieldName: 'irpef', extractedValue: '600,00', confidence: 80 },
                { fieldName: 'inps', extractedValue: '300,00', confidence: 75 },
                { fieldName: 'tfr', extractedValue: '100,00', confidence: 70 },
            ]);
        });
    });
});
//# sourceMappingURL=parseDocument.test.js.map