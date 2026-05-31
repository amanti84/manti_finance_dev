/**
 * Cloud Functions for manti_finance_dev
 */
import { initializeApp } from "firebase-admin/app";
initializeApp();

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";

export { seedUserData } from "./seedUserData";
export { importLegacyData } from "./importLegacyData";

// Schema di validazione per una transazione generica
const TransactionSchema = z.object({
  uid: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().min(1),
  date: z.string().datetime(),
  description: z.string().max(200),
});

/**
 * Funzione di esempio che valida l'input di una transazione
 */
export const validateAndProcessTransaction = onCall((request) => {
  // 1. Verifica autenticazione
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "L'utente deve essere autenticato");
  }

  try {
    // 2. Validazione input con Zod
    const validatedData = TransactionSchema.parse(request.data);

    // 3. Verifica autorizzazione (l'UID deve coincidere con l'utente autenticato)
    if (validatedData.uid !== request.auth.uid) {
      throw new HttpsError("permission-denied", "Non puoi operare per un altro utente");
    }

    // Qui andrebbe la logica di business...

    return {
      success: true,
      message: "Transazione validata correttamente",
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HttpsError("invalid-argument", "Dati non validi: " + error.message);
    }
    throw new HttpsError("internal", "Errore interno durante la validazione");
  }
});

export { parseDocument } from "./parseDocument";
