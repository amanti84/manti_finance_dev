import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Per eseguire questo script:
// 1. Scaricare la service account key da Firebase Console -> Project Settings -> Service Accounts
// 2. Salvarla come 'service-account.json' (NON committare!)
// 3. Eseguire: npx esbuild scripts/diagnosticKG.ts --bundle --platform=node --outfile=scripts/diagnosticKG.js && node scripts/diagnosticKG.js <uid>

async function run() {
  const uid = process.argv[2];
  if (!uid) {
    console.error('Usage: node diagnosticKG.js <uid>');
    process.exit(1);
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(readFileSync('service-account.json', 'utf8'));
  } catch (e) {
    console.error('Errore: service-account.json non trovato. Scaricalo dalla console Firebase.');
    process.exit(1);
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount)
    });
  }

  const db = getFirestore();

  console.log(`--- Diagnostica Kindergarten per utente: ${uid} ---`);

  // 1. Verifica kindergarten_investments
  const kgInvSnap = await db.collection(`users/${uid}/kindergarten_investments`).get();
  console.log(`Documenti in kindergarten_investments: ${kgInvSnap.size}`);

  // 2. Verifica investments con isKindergarten: true
  const invSnap = await db.collection(`users/${uid}/investments`).where('isKindergarten', '==', true).get();
  console.log(`Documenti in investments con isKindergarten:true: ${invSnap.size}`);
  invSnap.forEach(doc => {
    console.log(` - [Misplaced] ID: ${doc.id}, Name: ${doc.data().name}`);
  });

  // 3. Verifica investments con "KG" o "Kindergarten" nel nome
  const allInvSnap = await db.collection(`users/${uid}/investments`).get();
  let nameMatches = 0;
  allInvSnap.forEach(doc => {
    const name = doc.data().name || '';
    if (name.toLowerCase().includes('kg') || name.toLowerCase().includes('kindergarten')) {
      if (!doc.data().isKindergarten) {
        console.log(` - [Potential] ID: ${doc.id}, Name: ${name} (isKindergarten non settato)`);
        nameMatches++;
      }
    }
  });
  console.log(`Documenti in investments con "KG/Kindergarten" nel nome (senza flag): ${nameMatches}`);

  console.log('--- Fine Diagnostica ---');
}

run().catch(console.error);
