import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import corsLib from "cors";

const ADMIN_EMAIL = "amanti84@gmail.com";

const cors = corsLib({
  origin: [
    "https://mantifinance.web.app",
    "http://localhost:5173",
  ],
});

export const seedUserData = onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send({ success: false, error: "Method Not Allowed" });
      return;
    }

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).send({ success: false, error: "L'utente deve essere autenticato" });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await getAuth().verifyIdToken(idToken);
      const email = decodedToken.email;
      const uid = decodedToken.uid;

      if (email !== ADMIN_EMAIL) {
        res.status(403).send({ success: false, error: "Accesso limitato all'amministratore" });
        return;
      }

      const db = getFirestore();

      const pacsSeed = [
        {
          id: "real_pac_001",
          name: "Eurofundlux - ClearBridge US Equity A",
          isin: "LU2635193969",
          ticker: "LU2635193969",
          type: "Fund",
          platform: "Credem",
          priceSource: "FT",
          active: true,
          autoUpdate: true,
          monthlyAmount: 500,
          startDate: "2025-11-10",
          monthlyDays: [20],
          shares: 1620.7481,
          avgCost: 11.62,
          lastPrice: 13.39,
          amountInvested: 18832.45,
        },
        {
          id: "real_pac_002",
          name: "Bitcoin EUR",
          isin: null,
          ticker: "BTC-EUR",
          type: "Crypto",
          platform: "Exchange",
          priceSource: "YAHOO",
          active: true,
          autoUpdate: true,
          monthlyAmount: 2,
          startDate: "2025-11-14",
          monthlyDays: [29],
          shares: 0.0108,
          avgCost: 82667.40,
          lastPrice: 63367.20,
          amountInvested: 892.35,
        },
        {
          id: "real_pac_003",
          name: "iShares Core MSCI World UCITS ETF USD (Acc)",
          isin: "IE00B4L5Y983",
          ticker: "IWDA",
          type: "ETF",
          platform: "Directa",
          priceSource: "YAHOO",
          active: true,
          autoUpdate: true,
          monthlyAmount: 400,
          startDate: "2025-11-13",
          monthlyDays: [1],
          shares: 95.0,
          avgCost: 110.92,
          lastPrice: 123.43,
          amountInvested: 10537.76,
        },
        {
          id: "real_pac_004",
          name: "iShares MSCI World SRI UCITS ETF EUR (Acc)",
          isin: "IE00BYX2JD69",
          ticker: "IE00BYX2JD69",
          type: "ETF",
          platform: "Directa",
          priceSource: "YAHOO",
          active: true,
          autoUpdate: true,
          monthlyAmount: 100,
          startDate: "2025-11-13",
          monthlyDays: [1],
          shares: 154.0,
          avgCost: 12.05,
          lastPrice: 13.32,
          amountInvested: 1855.88,
        },
      ];

      const investmentsSeed = [
        {
          id: "real_inv_001",
          name: "Euromobiliare Corporate Euro High Yield A",
          isin: "IT0005204000",
          ticker: "IT0005204000",
          type: "Fund",
          platform: "Credem",
          priceSource: "FT",
          shares: 2005.0,
          avgCost: 5.98,
          lastPrice: 6.27,
          amountInvested: 11986.49,
          currentValue: 12571.35,
          autoUpdate: true,
        },
        {
          id: "real_inv_002",
          name: "Euromobiliare Corporate Investment Grade A",
          isin: "IT0005008898",
          ticker: "IT0005008898",
          type: "Fund",
          platform: "Credem",
          priceSource: "FT",
          shares: 2073.0,
          avgCost: 4.82,
          lastPrice: 4.98,
          amountInvested: 9993.93,
          currentValue: 10323.54,
          autoUpdate: true,
        },
        {
          id: "real_inv_003",
          name: "EuroFundLux - European Equity ESG A",
          isin: "LU1972719659",
          ticker: "LU1972719659",
          type: "Fund",
          platform: "Credem",
          priceSource: "FT",
          shares: 1028.03,
          avgCost: 12.37,
          lastPrice: 14.34,
          amountInvested: 12721.15,
          currentValue: 14741.95,
          autoUpdate: true,
        },
        {
          id: "real_inv_004",
          name: "Euromobiliare Pictet Global Trends ESG A",
          isin: "IT0005217432",
          ticker: "IT0005217432",
          type: "Fund",
          platform: "Credem",
          priceSource: "FT",
          shares: 5125.0,
          avgCost: 4.58,
          lastPrice: 6.92,
          amountInvested: 23477.63,
          currentValue: 35465.00,
          autoUpdate: true,
        },
        {
          id: "real_inv_005",
          name: "Euromobiliare Flessibile 60 A",
          isin: "IT0000380664",
          ticker: "IT0000380664",
          type: "Fund",
          platform: "Credem",
          priceSource: "FT",
          shares: 141.0,
          avgCost: 42.27,
          lastPrice: 47.49,
          amountInvested: 5960.06,
          currentValue: 6696.09,
          autoUpdate: true,
        },
        {
          id: "real_inv_006",
          name: "iShares Core MSCI World UCITS ETF USD (Acc)",
          isin: "IE00B4L5Y983",
          ticker: "IWDA",
          type: "ETF",
          platform: "Directa",
          priceSource: "YAHOO",
          shares: 308.0,
          avgCost: 116.71,
          lastPrice: 123.35,
          amountInvested: 35945.51,
          currentValue: 37991.80,
          autoUpdate: true,
        },
        {
          id: "real_inv_007",
          name: "Ethereum EUR",
          isin: null,
          ticker: "ETH-EUR",
          type: "Crypto",
          platform: "Exchange",
          priceSource: "YAHOO",
          shares: 0.1685,
          avgCost: 1669.47,
          lastPrice: 1712.06,
          amountInvested: 281.26,
          currentValue: 288.43,
          autoUpdate: true,
        },
        {
          id: "real_inv_008",
          name: "Bitcoin EUR",
          isin: null,
          ticker: "BTC-EUR",
          type: "Crypto",
          platform: "Exchange",
          priceSource: "YAHOO",
          shares: 0.03,
          avgCost: 43097.96,
          lastPrice: 62499.98,
          amountInvested: 1292.94,
          currentValue: 1875.00,
          autoUpdate: true,
        },
        {
          id: "real_inv_009",
          name: "XRP EUR",
          isin: null,
          ticker: "XRP-EUR",
          type: "Crypto",
          platform: "Exchange",
          priceSource: "YAHOO",
          shares: 14.1336,
          avgCost: 3.17,
          lastPrice: 1.12,
          amountInvested: 44.78,
          currentValue: 15.80,
          autoUpdate: true,
        },
        {
          id: "real_inv_010",
          name: "Solana EUR",
          isin: null,
          ticker: "SOL-EUR",
          type: "Crypto",
          platform: "Exchange",
          priceSource: "YAHOO",
          shares: 2.4663,
          avgCost: 94.97,
          lastPrice: 69.55,
          amountInvested: 234.23,
          currentValue: 171.53,
          autoUpdate: true,
        },
        {
          id: "real_inv_011",
          name: "NVIDIA Corporation",
          isin: null,
          ticker: "NVD.DE",
          type: "Stock",
          platform: "Directa",
          priceSource: "YAHOO",
          shares: 3.8413,
          avgCost: 100.92,
          lastPrice: 184.26,
          amountInvested: 387.66,
          currentValue: 707.79,
          autoUpdate: true,
        },
      ];

      let inserted = 0;
      let skipped = 0;

      const now = Timestamp.now();

      for (const pac of pacsSeed) {
        const docRef = db.doc(`users/${uid}/pacs/${pac.id}`);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
          await docRef.set({ ...pac, createdAt: now, updatedAt: now });
          inserted++;
        } else {
          skipped++;
        }
      }

      for (const inv of investmentsSeed) {
        const docRef = db.doc(`users/${uid}/investments/${inv.id}`);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
          await docRef.set({ ...inv, createdAt: now, updatedAt: now });
          inserted++;
        } else {
          skipped++;
        }
      }

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

      res.status(200).send({ success: true, data: { inserted, skipped } });
    } catch (error: any) {
      console.error("Errore durante il seeding:", error);
      res.status(500).send({ success: false, error: error.message || "Errore interno durante l'inserimento dei dati seed" });
    }
  });
});
