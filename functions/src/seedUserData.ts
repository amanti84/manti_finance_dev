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

  // Dati seed (allineati allo schema richiesto nell'issue)

  const pacsSeed = [
    {
      id: "seed_pac_001",
      name: "iShares Core MSCI World",
      isin: "IE00B4L5Y983",
      ticker: "IWDA",
      monthlyAmount: 500,
      startDate: "2023-01-01",
      active: true,
      autoUpdate: true,
      platform: "Directa",
      monthlyDays: [5]
    },
    {
      id: "seed_pac_002",
      name: "Vanguard FTSE All-World",
      isin: "IE00BK5BQT80",
      ticker: "VWCE",
      monthlyAmount: 300,
      startDate: "2023-06-01",
      active: true,
      autoUpdate: true,
      platform: "Fineco",
      monthlyDays: [5, 20]
    }
  ];

  const investmentsSeed = [
    {
      id: "seed_inv_001",
      name: "iShares Core MSCI World",
      isin: "IE00B4L5Y983",
      ticker: "IWDA",
      type: "ETF",
      amountInvested: 3500,
      currentValue: 4115,
      quantity: 50,
      purchaseDate: "2023-01-15",
      platform: "Directa"
    },
    {
      id: "seed_inv_002",
      name: "Vanguard FTSE All-World",
      isin: "IE00BK5BQT80",
      ticker: "VWCE",
      type: "ETF",
      amountInvested: 3200,
      currentValue: 3063,
      quantity: 30,
      purchaseDate: "2023-06-10",
      platform: "Fineco"
    },
    {
      id: "seed_inv_003",
      name: "Apple Inc.",
      ticker: "AAPL",
      type: "Stock",
      amountInvested: 1500,
      currentValue: 1905,
      quantity: 10,
      purchaseDate: "2024-01-05",
      platform: "Fineco"
    }
  ];

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
