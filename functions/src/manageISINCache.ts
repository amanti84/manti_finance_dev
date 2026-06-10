import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

const CACHE_COLLECTION = "isin_cache";

/**
 * manageISINCache
 * CRUD operations for the ISIN price cache
 */
export const manageISINCache = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Only admin can manage cache (consistent with other admin functions)
  const ADMIN_EMAIL = "ant.manti@gmail.com";
  if (request.auth.token.email !== ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "Only administrators can manage the price cache");
  }

  const { action, isin } = request.data;
  const db = getFirestore();

  try {
    switch (action) {
      case "list":
        const snapshot = await db.collection(CACHE_COLLECTION).get();
        const entries = snapshot.docs.map(doc => ({ isin: doc.id, ...doc.data() }));
        return { success: true, data: entries };

      case "delete":
        if (!isin) throw new Error("ISIN is required for delete action");
        await db.collection(CACHE_COLLECTION).doc(isin).delete();
        return { success: true, message: `Deleted cache entry for ${isin}` };

      case "clear":
        const batch = db.batch();
        const allDocs = await db.collection(CACHE_COLLECTION).get();
        allDocs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        return { success: true, message: "Cleared all cache entries" };

      default:
        throw new Error(`Invalid action: ${action}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Cache management error:", error);
    throw new HttpsError("internal", message || "Error managing cache");
  }
});
