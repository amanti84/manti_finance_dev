import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const ADMIN_EMAIL = "amanti84@gmail.com";

export const seedUserData = onCall(async (request) => {
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

  // Dati seed minimi (il grosso ora passa per importLegacyData)
  const pacsSeed: any[] = [];
  const investmentsSeed: any[] = [];

  let inserted = 0;
  let skipped = 0;

  try {
    const now = Timestamp.now();

    // Batch per PACs
    for (const pac of pacsSeed) {
      const docRef = db.doc(`users/${uid}/pacs/${pac.id}`);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        await docRef.set({
          ...pac,
          createdAt: now,
          updatedAt: now,
        });
        inserted++;
      } else {
        skipped++;
      }
    }

    // Batch per Investimenti
    for (const inv of investmentsSeed) {
      const docRef = db.doc(`users/${uid}/investments/${inv.id}`);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        await docRef.set({
          ...inv,
          createdAt: now,
          updatedAt: now,
        });
        inserted++;
      } else {
        skipped++;
      }
    }

    // Log Audit
    if (inserted > 0) {
      await db.collection(`users/${uid}/audit`).add({
        action: "SEED_DATA",
        entityType: "seed",
        entityId: "seed_system",
        source: "system",
        newValue: { inserted, skipped },
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      success: true,
      data: { inserted, skipped }
    };

  } catch (error) {
    console.error("Errore durante il seeding:", error);
    throw new HttpsError("internal", "Errore durante l'inserimento dei dati seed");
  }
});
