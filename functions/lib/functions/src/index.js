"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDocument = exports.validateAndProcessTransaction = void 0;
const https_1 = require("firebase-functions/v2/https");
const zod_1 = require("zod");
const TransactionSchema = zod_1.z.object({
    uid: zod_1.z.string().min(1),
    amount: zod_1.z.number().positive(),
    category: zod_1.z.string().min(1),
    date: zod_1.z.string().datetime(),
    description: zod_1.z.string().max(200),
});
exports.validateAndProcessTransaction = (0, https_1.onCall)((request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "L'utente deve essere autenticato");
    }
    try {
        const validatedData = TransactionSchema.parse(request.data);
        if (validatedData.uid !== request.auth.uid) {
            throw new https_1.HttpsError("permission-denied", "Non puoi operare per un altro utente");
        }
        return {
            success: true,
            message: "Transazione validata correttamente",
            data: validatedData,
        };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new https_1.HttpsError("invalid-argument", "Dati non validi: " + error.message);
        }
        throw new https_1.HttpsError("internal", "Errore interno durante la validazione");
    }
});
var parseDocument_1 = require("./parseDocument");
Object.defineProperty(exports, "parseDocument", { enumerable: true, get: function () { return parseDocument_1.parseDocument; } });
//# sourceMappingURL=index.js.map