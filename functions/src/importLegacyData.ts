import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { MigrationPayload } from "./types/legacy";

const ADMIN_EMAIL = "amanti84@gmail.com";

/**
 * Converte una stringa data ISO (o YYYY-MM-DD) in un Timestamp di Firestore
 */
function toTimestamp(dateStr: string | undefined): Timestamp | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return Timestamp.fromDate(date);
}

export const importLegacyData = onCall(async (request) => {
  // 1. Verifiche di sicurezza
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "L'utente deve essere autenticato");
  }

  const email = request.auth.token.email;
  if (email !== ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "Accesso limitato all'amministratore");
  }

  const uid = request.auth.uid;
  const db = getFirestore();
  const payload = request.data as MigrationPayload;
  const dryRun = !!payload.dryRun;

  const result = {
    inserted: 0,
    skipped: 0,
    errors: [] as string[],
  };

  const now = Timestamp.now();

  const collections = [
    { key: "pacs", path: `users/${uid}/pacs` },
    { key: "investments", path: `users/${uid}/investments` },
    { key: "kindergartenPacs", path: `users/${uid}/kindergarten_pacs` },
    { key: "kindergartenInvestments", path: `users/${uid}/kindergarten_investments` },
  ] as const;

  try {
    for (const coll of collections) {
      const dataArray = payload[coll.key] || [];

      for (const item of dataArray) {
        try {
          const legacyId = item.id;
          const docRef = db.collection(coll.path).doc(legacyId);
          const docSnap = await docRef.get();

          if (docSnap.exists) {
            result.skipped++;
            continue;
          }

          if (dryRun) {
            result.inserted++;
            continue;
          }

          // Normalizzazione e preparazione documento
          const docData: any = {
            ...item,
            uid,
            legacyId,
            createdAt: now,
            updatedAt: now,
          };

          // Rimuoviamo l'id originale dal corpo del documento se presente, lo usiamo come ID documento
          delete docData.id;

          // Conversioni date: cerchiamo campi che finiscono per 'Date' o 'At' o 'Update'
          // e proviamo a convertirli in Timestamp se sono stringhe
          for (const key in docData) {
            if (typeof docData[key] === "string" && (key.toLowerCase().endsWith("date") || key.toLowerCase().endsWith("at") || key.toLowerCase().endsWith("update"))) {
              // Eccezione: startDate e endDate per PAC spesso restano stringhe YYYY-MM-DD
              // createdAt e updatedAt vengono sovrascritti con Timestamp.now()
              if (key === "startDate" || key === "endDate" || key === "createdAt" || key === "updatedAt") continue;

              const ts = toTimestamp(docData[key]);
              if (ts) {
                docData[key] = ts;
              }
            }
          }

          // Normalizzazione quantity -> shares per investments se necessario
          if (coll.key === "investments") {
            if (docData.quantity !== undefined && docData.shares === undefined) {
              docData.shares = docData.quantity;
            }
          }

          await docRef.set(docData);
          result.inserted++;

        } catch (err) {
          const errMsg = `Errore in ${coll.key} ID ${item.id}: ${err instanceof Error ? err.message : String(err)}`;
          result.errors.push(errMsg);
        }
      }
    }

    // Log Audit
    if (!dryRun && result.inserted > 0) {
      await db.collection(`users/${uid}/audit`).add({
        action: "LEGACY_IMPORT",
        entityType: "seed", // O aggiungere un nuovo tipo se necessario
        entityId: "legacy_import_" + now.toMillis(),
        source: "system",
        newValue: { inserted: result.inserted, skipped: result.skipped, errorsCount: result.errors.length },
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      success: true,
      data: result,
    };

  } catch (error) {
    console.error("Errore durante la migrazione:", error);
    throw new HttpsError("internal", "Errore durante l'importazione dei dati legacy");
  }
});
