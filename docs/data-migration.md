# Migrazione dati da manti_finance (legacy) a manti_finance_dev

Questo documento descrive il processo di migrazione dei dati reali (PAC, Investimenti, Kindergarten) dal vecchio progetto `manti_finance` al nuovo sistema user-scoped su `mantifinance`.

L'obiettivo **non** è solo portare una foto minimale dei saldi, ma preservare tutta la ricchezza informativa utile alla nuova piattaforma (configurazione PAC, sorgente prezzi, automatismi, note, ecc.), pur accettando che lo storico transazioni venga inizialmente caricato come "snapshot" sintetico.

## 1. Modello dati legacy

Nel progetto legacy `manti_finance` esistono almeno le seguenti collezioni di primo livello:

- `investments`          → investimenti adulti (stato corrente)
- `pacs`                  → PAC adulti (piani ricorrenti)
- `kindergarten_pacs`     → PAC bambini (piani ricorrenti)
- `kindergarten_transactions` → storico esecuzioni PAC bambini
- `transactions`          → storico esecuzioni PAC adulti
- `sales`                 → vendite / realizzi
- `isin_mappings`         → mapping supporto ISIN → simboli

Ogni documento in queste collezioni include tipicamente (varia leggermente per tipo):

- Stato corrente asset/PAC
  - `shares` (quantità)
  - `avgCost`, `purchasePrice`
  - `currentValue`, `lastPrice`, `currency`
  - `autoUpdate`, `autoProcessing`
  - `lastPriceUpdate`, `lastUpdateAttempt`, `lastUpdateError`
  - `priceSource`, `yahooSymbol` / `isin`
  - `service` (broker)
  - `createdAt`, `updatedAt` (Timestamp)

- Configurazione PAC
  - `monthlyAmount`
  - `monthlyDays`
  - `startDate`, `endDate`
  - `active`

- Storico transazioni PAC
  - `amount`, `price`, `shares`, `currency`
  - `assetId`, `assetName`, `assetType`
  - `transactionDate`, `createdAt`
  - `service`, `ticker`, `isin`
  - `type` (es. `pac_auto_purchase`)
  - `automated` (true/false)
  - `notes`

## 2. Contratto di migrazione (Data Richness)

### 2.1 Obiettivo funzionale

La nuova piattaforma `manti_finance_dev` deve poter offrire la stessa profondità informativa del legacy per:

- Analizzare PAC e investimenti (adulti e kindergarten)
- Ricostruire KPI e P&L (attuale e futuri XIRR/performance)
- Mostrare in UI metadati come broker, sorgente prezzi, note, stato autoUpdate

Per questo, la migrazione deve:

1. **Preservare lo stato corrente completo** di ogni investimento/PAC (adulto e kindergarten):
   - quantità (`shares`), costo medio (`avgCost`), valore attuale (`currentValue`), ultima quotazione (`lastPrice`), valuta.
   - metadati: `autoUpdate`, `autoProcessing`, `priceSource`, `service` (→ `broker`), `tickerOnly`, `yahooSymbol`, `lastUpdateAttempt`, `lastUpdateError`, `createdAt`, `updatedAt`.
2. **Preservare la configurazione PAC** (adulti + kindergarten):
   - `monthlyAmount`, `monthlyDays`, `startDate`, `endDate`, `active`.
3. **Accettare una migrazione iniziale dello storico transazioni in forma semplificata**:
   - per la prima ondata è sufficiente avere almeno una "picture" aggiornata (media carico, quantità, valore) per abilitare KPI e grafici;
   - lo storico completo di `transactions` / `kindergarten_transactions` può essere migrato o arricchito in step successivi.

### 2.2 Mapping verso il nuovo schema

Nel nuovo progetto `mantifinance` i dati vengono scritti sotto:

- `users/{uid}/investments`
- `users/{uid}/pacs`
- `users/{uid}/kindergarten_investments`
- `users/{uid}/kindergarten_pacs`

Usando i tipi forti definiti in `src/types/index.ts` (es. `Investment`, `AssetClass`, `Broker`, `Currency`) e nei relativi servizi (`investment.ts`, `pac.ts`, `kindergarten.ts`).

Regole generali di mapping (semplificate):

- `shares` → `quantity`
- `service` → `broker` (valore enum coerente)
- `lastPrice` → `currentPrice`
- `currentValue` → `currentValue`
- `avgCost` → `avgCost`
- `currency` → `currency`
- `ticker` / `isin` / `yahooSymbol` → campi corrispondenti in `Investment`
- `priceSource`, `autoUpdate`, `lastUpdateAttempt`, `lastUpdateError`, `tickerOnly` → campi omonimi o dedicati in `Investment`
- `monthlyAmount` → `pacMonthlyAmount` (con `isPac: true`)
- `startDate`, `endDate`, `monthlyDays`, `active` → configurazione PAC (collezioni `pacs` / `kindergarten_pacs` o campi aggiuntivi coerenti con i tipi esistenti)

Le stringhe ISO (`lastPriceUpdate`, `lastUpdateAttempt`, `startDate`, `endDate`) vanno convertite in `Timestamp` Firestore quando richiesto dai tipi.

## 3. Importazione dati via Cloud Function

La funzione `importLegacyData` permette di importare un payload JSON nel nuovo sistema.

### 3.1 Payload `MigrationPayload`

L'interfaccia `MigrationPayload` (in `functions/src/types/legacy.ts`) ha la forma:

```ts
export interface MigrationPayload {
  pacs: LegacyPAC[];
  investments: LegacyInvestment[];
  kindergartenPacs: LegacyKindergartenPAC[];
  kindergartenInvestments: LegacyKindergartenInvestment[];
  dryRun?: boolean;
}
```

- `pacs` e `investments` rappresentano il mondo adulto.
- `kindergartenPacs` e `kindergartenInvestments` rappresentano il dominio figli (Kindergarten), isolato dal patrimonio personale.
- `dryRun: true` consente di testare la migrazione senza scrivere su Firestore.

### 3.2 Esempio di chiamata

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const importLegacyData = httpsCallable(functions, 'importLegacyData');

const payload: MigrationPayload = {
  pacs: [...],
  investments: [...],
  kindergartenPacs: [...],
  kindergartenInvestments: [...],
  dryRun: false, // true per testare senza scrivere
};

const result = await importLegacyData(payload);
console.log(result.data);
```

### 3.3 Caratteristiche della funzione

- **Idempotenza**: Se un documento con lo stesso `legacyId` esiste già nella destinazione, può essere saltato o aggiornato in modo deterministico (in base all'implementazione).
- **Audit**: Ogni operazione di importazione che inserisce dati genera un log di audit con azione `LEGACY_IMPORT`.
- **Tracciabilità**: Ad ogni documento importato viene aggiunto il campo `legacyId`.
- **Normalizzazione**: I campi legacy vengono mappati sui tipi nuovi (`Investment`, PAC, Kindergarten) rispettando `src/types/index.ts`.

## 4. Verifica post-migrazione

Dopo l'importazione, i dati vanno verificati almeno su tre livelli:

1. **Strutturale (Firestore)**
   - Dati presenti sotto:
     - `users/{uid}/pacs`
     - `users/{uid}/investments`
     - `users/{uid}/kindergarten_pacs`
     - `users/{uid}/kindergarten_investments`
   - Campi obbligatori popolati correttamente (es. `assetClass`, `broker`, `currency`, `avgCost`, `currentValue`, `isPac`).

2. **Numerico (coerenza patrimoniale)**
   - Valore totale portafoglio adulto (somma `currentValue` investimenti) vs legacy.
   - Montante totale PAC adulti e Kindergarten vs legacy.
   - Controllo a campione di 2–3 asset significativi (es. BTC PAC, fondo Kindergarten) tra vecchia e nuova piattaforma.

3. **Funzionale (UI)**
   - Pagina Investimenti mostra correttamente:
     - quantità, costo medio, valore attuale, P&L, metadati (broker, sorgente prezzi, badge PAC).
   - Pagina Kindergarten mostra correttamente:
     - PAC figli, importi mensili, stato attivo, valore attuale.
   - Nessun dato Kindergarten appare nei moduli patrimoniali personali e viceversa.
