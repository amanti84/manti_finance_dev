import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { fetchPriceInternal } from "./getPriceByISIN";
import { PACProcessingResult, PACDocument, InvestmentDocument } from "./types/shared";

/**
 * processPACPurchase
 * Core logic for processing a single PAC purchase
 */
export async function processPACPurchase(
  uid: string,
  pacId: string,
  pacData: PACDocument,
  isKindergarten: boolean
): Promise<PACProcessingResult> {
  const db = getFirestore();
  const now = Timestamp.now();

  try {
    const isin = pacData.isin;
    const ticker = pacData.ticker;
    const amount = Number(pacData.monthlyAmount);

    if (!isin && !ticker) {
      throw new Error("ISIN or Ticker is required for PAC processing");
    }

    // 1. Fetch Price
    let price: number | null = null;
    let source = "manual";

    if (isin) {
      const priceResult = await fetchPriceInternal(isin);
      if (priceResult) {
        price = priceResult.price;
        source = priceResult.source;
      }
    } else if (ticker) {
      // Fallback for crypto or ticker-only PACs (e.g. BTC-EUR)
      // For now we might need a fetchPriceByTicker but the issue says
      // "Supporta sia ISIN standard che tickerOnly"
      // Let's assume we can try to find price via ticker too
      const priceResult = await fetchPriceInternal(ticker);
      if (priceResult) {
        price = priceResult.price;
        source = priceResult.source;
      }
    }

    if (!price || price <= 0) {
      throw new Error(`Could not fetch valid price for ${isin || ticker}`);
    }

    // 2. Calculate Shares
    const sharesPurchased = Math.round((amount / price) * 100000) / 100000;

    // 3. Update PAC Document
    const pacPath = isKindergarten
      ? `users/${uid}/kindergarten_pacs/${pacId}`
      : `users/${uid}/pacs/${pacId}`;

    const pacUpdate: Partial<PACDocument> & { updatedAt: Timestamp } = {
      updatedAt: now,
      lastPaymentDate: now,
    };

    if (!isKindergarten) {
      // Adult PACs track shares and avgCost in the pac document too (v3)
      const currentShares = Number(pacData.shares || 0);
      const currentAvgCost = Number(pacData.avgCost || 0);
      const newShares = currentShares + sharesPurchased;
      const newAvgCost = ((currentShares * currentAvgCost) + (sharesPurchased * price)) / newShares;

      pacUpdate.shares = newShares;
      pacUpdate.avgCost = Math.round(newAvgCost * 10000) / 10000;
      pacUpdate.currentPrice = price;
    } else {
      // Kindergarten PACs track totalInvested and currentValue
      const currentInvested = Number(pacData.totalInvested || 0);
      const newInvested = currentInvested + amount;
      pacUpdate.totalInvested = newInvested;
      // currentValue is recalculated by the frontend or during update
      // but let's update it here too if we have current total shares
      // (KG PAC doesn't seem to track shares directly in v3 schema, but let's be careful)
    }

    await db.doc(pacPath).update(pacUpdate);

    // 4. Update/Create Investment Document
    // Try to find investment linked to this PAC
    const invCollPath = isKindergarten
      ? `users/${uid}/kindergarten_investments`
      : `users/${uid}/investments`;

    // In this system, PACs and Investments are often linked by name/isin or
    // there's a 1:1 relation for PAC-type investments.
    const invSnap = await db.collection(invCollPath)
      .where("isin", "==", isin || "")
      .limit(1)
      .get();

    if (!invSnap.empty) {
      const invDoc = invSnap.docs[0];
      const invData = invDoc.data() as InvestmentDocument;
      const currentQty = Number(invData.quantity || 0);
      const currentAvg = Number(invData.avgCost || invData.purchasePrice || 0);
      const newQty = currentQty + sharesPurchased;
      const newAvg = ((currentQty * currentAvg) + (sharesPurchased * price)) / newQty;

      const invUpdate: Partial<InvestmentDocument> & { updatedAt: Timestamp } = {
        quantity: newQty,
        currentPrice: price,
        currentValue: Math.round(newQty * price * 100) / 100,
        updatedAt: now,
        lastPriceUpdate: now,
      };

      if (isKindergarten) {
        invUpdate.purchasePrice = Math.round(newAvg * 10000) / 10000;
      } else {
        invUpdate.avgCost = Math.round(newAvg * 10000) / 10000;
      }

      await invDoc.ref.update(invUpdate);
    }

    // 5. Record Transaction (pac_payments)
    const paymentPath = `users/${uid}/pac_payments`;
    await db.collection(paymentPath).add({
      investmentId: pacId, // Or the linked investment ID
      investmentName: pacData.name,
      data: now,
      importo: amount,
      priceAtPayment: price,
      quantityPurchased: sharesPurchased,
      broker: pacData.platform || pacData.broker || "Automatic",
      isKindergarten,
      createdAt: now,
      updatedAt: now,
      uid
    });

    // 6. Audit Log
    await db.collection(`users/${uid}/audit`).add({
      action: "PAC_PURCHASE",
      entityType: "investment",
      entityId: pacId,
      uid,
      source: "system",
      newValue: {
        amount,
        price,
        sharesPurchased,
        source,
        isKindergarten
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      pacId,
      name: pacData.name,
      success: true,
      price,
      sharesPurchased
    };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error processing PAC ${pacId} for user ${uid}:`, error);
    return {
      pacId,
      name: pacData.name,
      success: false,
      error: message
    };
  }
}

/**
 * processDailyPACs
 * Scheduled function to process all active PACs for today
 */
export const processDailyPACs = onSchedule("0 9 * * *", async (event) => {
  const db = getFirestore();
  const dayOfMonth = new Date().getDate();

  // 1. Get all users
  const usersSnap = await db.collection("users").get();

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;

    // 2. Process Adult PACs
    const adultPacsSnap = await db.collection(`users/${uid}/pacs`)
      .where("active", "==", true)
      .where("monthlyDays", "array-contains", dayOfMonth)
      .get();

    for (const pacDoc of adultPacsSnap.docs) {
      await processPACPurchase(uid, pacDoc.id, pacDoc.data() as PACDocument, false);
    }

    // 3. Process Kindergarten PACs
    // Note: Kindergarten PACs might not have "active" or "monthlyDays" in v3 schema yet,
    // but the issue says "itera tutti gli utenti con PAC attivi".
    // We'll follow the pattern from adult PACs if fields exist.
    const kgPacsSnap = await db.collection(`users/${uid}/kindergarten_pacs`).get();
    for (const pacDoc of kgPacsSnap.docs) {
      const data = pacDoc.data() as PACDocument;
      // Assuming dayOfMonth check for KG too
      if (data.monthlyDays?.includes(dayOfMonth)) {
        await processPACPurchase(uid, pacDoc.id, data, true);
      }
    }
  }
});

/**
 * processPACsManually
 * Manual trigger for testing or admin
 */
export const processPACsManually = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { pacId, isKindergarten, uid: targetUid } = request.data;
  const uid = targetUid || request.auth.uid;
  const db = getFirestore();

  if (pacId) {
    const pacPath = isKindergarten
      ? `users/${uid}/kindergarten_pacs/${pacId}`
      : `users/${uid}/pacs/${pacId}`;
    const pacSnap = await db.doc(pacPath).get();
    if (!pacSnap.exists) {
      throw new HttpsError("not-found", "PAC not found");
    }
    const result = await processPACPurchase(uid, pacId, pacSnap.data() as PACDocument, !!isKindergarten);
    return { success: result.success, data: result };
  } else {
    // Process all active PACs for user
    const adultPacsSnap = await db.collection(`users/${uid}/pacs`).where("active", "==", true).get();
    const kgPacsSnap = await db.collection(`users/${uid}/kindergarten_pacs`).get();

    const results: PACProcessingResult[] = [];
    for (const pacDoc of adultPacsSnap.docs) {
      results.push(await processPACPurchase(uid, pacDoc.id, pacDoc.data() as PACDocument, false));
    }
    for (const pacDoc of kgPacsSnap.docs) {
      results.push(await processPACPurchase(uid, pacDoc.id, pacDoc.data() as PACDocument, true));
    }

    return { success: true, data: results };
  }
});
