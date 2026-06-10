import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Per eseguire questo script:
// 1. Scaricare la service account key da Firebase Console -> Project Settings -> Service Accounts
// 2. Salvarla come 'service-account.json' (NON committare!)
// 3. Eseguire: npx esbuild scripts/migrateKGInvestments.ts --bundle --platform=node --outfile=scripts/migrateKGInvestments.js && node scripts/migrateKGInvestments.js <uid>

async function run() {
  const uid = process.argv[2];
  if (!uid) {
    console.error('Usage: node migrateKGInvestments.js <uid>');
    process.exit(1);
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(readFileSync('service-account.json', 'utf8'));
  } catch (e) {
    console.error('Errore: service-account.json non trovato.');
    process.exit(1);
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount)
    });
  }

  const db = getFirestore();
  const now = new Date().toISOString();

  console.log(`--- Migrazione Kindergarten per utente: ${uid} ---`);

  // 1. Trova investimenti KG misplaced
  const invSnap = await db.collection(`users/${uid}/investments`)
    .where('isKindergarten', '==', true)
    .get();

  console.log(`Trovati ${invSnap.size} investimenti da migrare.`);

  for (const docSnap of invSnap.docs) {
    const data = docSnap.data();
    const id = docSnap.id;

    console.log(`Migrazione ID: ${id} (${data.name})...`);

    // Mapping Investment (Adulto) -> KindergartenInvestment
    const kgInv = {
      name: data.name,
      ticker: data.ticker || '',
      category: mapAssetClassToKG(data.assetClass),
      purchaseDate: data.purchaseDate || data.createdAt?.toDate?.().toISOString() || now,
      purchasePrice: Number(data.avgCost || 0),
      quantity: Number(data.quantity || 0),
      currentPrice: Number(data.currentPrice || 0),
      notes: data.notes || '',
      createdAt: data.createdAt || now,
      updatedAt: now,
      legacyId: data.legacyId || id
    };

    // A. Scrivi in kindergarten_investments
    await db.collection(`users/${uid}/kindergarten_investments`).doc(id).set(kgInv);
    console.log(` - Scritto in kindergarten_investments`);

    // B. Elimina da investments
    await docSnap.ref.delete();
    console.log(` - Eliminato da investments`);

    // C. Log Audit (opzionale nello script, ma utile)
    await db.collection(`users/${uid}/audit`).add({
      action: 'delete',
      entityType: 'investment',
      entityId: id,
      uid,
      source: 'system',
      previousValue: data,
      createdAt: FieldValue.serverTimestamp()
    });
    await db.collection(`users/${uid}/audit`).add({
      action: 'create',
      entityType: 'kindergarten_investment',
      entityId: id,
      uid,
      source: 'system',
      newValue: kgInv,
      createdAt: FieldValue.serverTimestamp()
    });
  }

  console.log('--- Migrazione Completata ---');
}

function mapAssetClassToKG(ac: string): string {
  const t = ac?.toLowerCase() || '';
  if (t.includes('etf')) return 'etf';
  if (t.includes('azioni') || t.includes('stock')) return 'stock';
  if (t.includes('obbligazioni') || t.includes('bond')) return 'bond';
  if (t.includes('fondi') || t.includes('fund')) return 'fund';
  return 'other';
}

run().catch(console.error);
