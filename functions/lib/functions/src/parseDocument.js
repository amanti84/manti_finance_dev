"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDocument = void 0;
exports.classifyDocumentType = classifyDocumentType;
exports.extractMonth = extractMonth;
exports.extractFields = extractFields;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
function classifyDocumentType(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('cedolino') ||
        lowerText.includes('busta paga') ||
        lowerText.includes('netto in busta') ||
        lowerText.includes('inps')) {
        return 'cedolino';
    }
    if (lowerText.includes('estratto conto') ||
        lowerText.includes('saldo') ||
        lowerText.includes('movimenti')) {
        return 'estratto_conto';
    }
    if (lowerText.includes('conferma') ||
        lowerText.includes('ordine eseguito') ||
        lowerText.includes('isin') ||
        lowerText.includes('controvalore')) {
        return 'conferma_investimento';
    }
    return 'altro';
}
function extractMonth(text) {
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
    ];
    const lowerText = text.toLowerCase();
    for (let i = 0; i < months.length; i++) {
        const monthRegex = new RegExp(`(${months[i]})\\s+(\\d{4})`, 'i');
        const match = lowerText.match(monthRegex);
        if (match) {
            return { month: i + 1, year: parseInt(match[2], 10) };
        }
    }
    const numericRegex = /(\d{2})[/-](\d{4})/;
    const numMatch = lowerText.match(numericRegex);
    if (numMatch) {
        const m = parseInt(numMatch[1], 10);
        if (m >= 1 && m <= 12) {
            return { month: m, year: parseInt(numMatch[2], 10) };
        }
    }
    return {};
}
function extractFields(text, type) {
    if (type !== 'cedolino')
        return [];
    const fields = [
        { name: 'netSalary', pattern: /netto.*?([\d.]+,[\d]{2})/i, confidence: 85 },
        { name: 'grossSalary', pattern: /lordo.*?([\d.]+,[\d]{2})/i, confidence: 80 },
        { name: 'irpef', pattern: /irpef.*?([\d.]+,[\d]{2})/i, confidence: 80 },
        { name: 'inps', pattern: /inps.*?([\d.]+,[\d]{2})/i, confidence: 75 },
        { name: 'tfr', pattern: /tfr.*?([\d.]+,[\d]{2})/i, confidence: 70 },
    ];
    return fields.map((f) => {
        const match = text.match(f.pattern);
        return {
            fieldName: f.name,
            extractedValue: match ? match[1] : '',
            confidence: match ? f.confidence : 0,
        };
    });
}
exports.parseDocument = functions.https.onCall(async (data, context) => {
    const { uid, storagePath, inboxItemId } = data;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    if (uid !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Unauthorized access to user data');
    }
    if (!storagePath.startsWith(`users/${uid}/`)) {
        throw new functions.https.HttpsError('permission-denied', 'Unauthorized access to storage path');
    }
    try {
        const bucket = admin.storage().bucket();
        const file = bucket.file(storagePath);
        const [content] = await file.download();
        const data = await (0, pdf_parse_1.default)(content);
        const rawText = data.text;
        const documentType = classifyDocumentType(rawText);
        const { month, year } = extractMonth(rawText);
        const fields = extractFields(rawText, documentType);
        await db.doc(`users/${uid}/inboxItems/${inboxItemId}`).update({
            status: 'ESTRATTO',
            confidenceFields: fields.map((f) => ({
                fieldName: f.fieldName,
                extractedValue: f.extractedValue,
                confidence: f.confidence,
            })),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await db.collection(`users/${uid}/audit`).add({
            entityType: 'parseDocument',
            entityId: inboxItemId,
            action: 'update',
            newValue: { documentType, month, year, fieldsCount: fields.length },
            source: 'system',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const result = {
            documentType,
            month,
            year,
            fields,
            rawText,
        };
        return result;
    }
    catch (error) {
        console.error('parseDocument failed:', error);
        await db.doc(`users/${uid}/inboxItems/${inboxItemId}`).update({
            status: 'ERRORE',
            errorMessage: error instanceof Error ? error.message : String(error),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        throw new functions.https.HttpsError('internal', 'Document parsing failed');
    }
});
//# sourceMappingURL=parseDocument.js.map