# Migrazione dati da manti_finance (legacy) a manti_finance_dev

Questo documento descrive il processo di migrazione dei dati reali (PAC, Investimenti, Kindergarten) dal vecchio progetto al nuovo sistema user-scoped.

## 1. Esportazione dati (Legacy)

L'esportazione dal vecchio progetto Firestore deve essere fatta manualmente o via script, ottenendo un file JSON con la seguente struttura:

```json
{
  "pacs": [...],
  "investments": [...],
  "kindergartenPacs": [...],
  "kindergartenInvestments": [...]
}
```

## 2. Importazione dati via Cloud Function

La funzione `importLegacyData` permette di importare il payload JSON nel nuovo sistema.

### Requisiti
- Autenticazione con l'account admin (`amanti84@gmail.com`).
- Il payload deve rispettare l'interfaccia `MigrationPayload`.

### Esempio di chiamata (via console o script)

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const importLegacyData = httpsCallable(functions, 'importLegacyData');

const payload = {
  pacs: [...],
  investments: [...],
  kindergartenPacs: [...],
  kindergartenInvestments: [...],
  dryRun: false // Impostare a true per testare senza scrivere
};

const result = await importLegacyData(payload);
console.log(result.data);
```

### Caratteristiche
- **Idempotenza**: Se un documento con lo stesso ID (legacyId) esiste già nella destinazione, viene saltato.
- **Audit**: Ogni operazione di importazione (se inserisce dati) genera un log di audit con azione `LEGACY_IMPORT`.
- **Tracciabilità**: Ad ogni documento viene aggiunto il campo `legacyId`.
- **Normalizzazione**: Campi come `quantity` negli investimenti vengono mappati su `shares`.

## 3. Verifica

Dopo l'importazione, è possibile verificare i dati direttamente su Firestore sotto il percorso:
`users/{uid}/pacs`
`users/{uid}/investments`
`users/{uid}/kindergarten_pacs`
`users/{uid}/kindergarten_investments`
