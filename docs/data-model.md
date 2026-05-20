# Data Model v1 — manti_finance_dev

> **Versione:** 1.0 | **Aggiornato:** maggio 2026  
> **Source of truth:** `src/types/index.ts`

## Struttura Firestore

Tutti i dati sono isolati per utente sotto `/users/{uid}/`.
Nessun utente puo' accedere ai dati di un altro (regola `isOwner` in `firestore.rules`).

```
Firestore
└── users/
    └── {uid}/
        ├── (document)          → UserProfile
        ├── snapshots/          → PatrimonioSnapshot[]
        ├── transactions/       → Transaction[]
        ├── investments/        → Investment[]
        ├── payslips/           → Payslip[]
        ├── auditLog/           → AuditLogEntry[]  (immutabile)
        └── config/
            └── preferences     → UserConfig
```

---

## Collection: `snapshots`

**Scopo:** Fotografia mensile del patrimonio netto.

| Campo | Tipo | Note |
|---|---|---|
| `year` | `number` | Anno |
| `month` | `1..12` | Mese |
| `contiCorrenti` | `number` | Liquidita' totale conti |
| `investimenti` | `number` | Portafoglio totale |
| `immobili` | `number` | Valore immobili (casa) |
| `fondoPensione` | `number` | Fon.Te + altri fondi |
| `tfr` | `number` | TFR maturato |
| `mutuo` | `number` | Debito residuo mutuo |
| `altriDebiti` | `number` | Altri passivi |
| `patrimonioNetto` | `number` | **Calcolato**: attivi - passivi |

**Index:** `year ASC + month ASC`

---

## Collection: `transactions`

**Scopo:** Movimenti finanziari (entrate, uscite, trasferimenti).

| Campo | Tipo | Note |
|---|---|---|
| `date` | `Timestamp` | Data transazione |
| `type` | `income\|expense\|transfer\|investment` | |
| `category` | `TransactionCategory` | Categoria semantica |
| `amount` | `number` | Importo positivo |
| `currency` | `EUR\|USD\|...` | |
| `description` | `string` | |
| `isKindergarten` | `boolean?` | Tag spese figli (issue #19) |
| `confidence` | `0..1` | Score per Confidence Review (issue #31) |
| `source` | `manual\|import\|email` | Origine dato |

**Index:** `date DESC + category ASC`, `type ASC + date DESC`

---

## Collection: `investments`

**Scopo:** Portafoglio investimenti multi-broker.

| Campo | Tipo | Note |
|---|---|---|
| `name` | `string` | Nome strumento |
| `isin` | `string?` | ISIN |
| `assetClass` | `AssetClass` | azioni, etf, pac, obbligazioni... |
| `broker` | `fineco\|directa\|degiro\|altri` | |
| `quantity` | `number` | Quantita' |
| `avgCost` | `number` | Prezzo medio di carico |
| `currentPrice` | `number` | Prezzo attuale |
| `currentValue` | `number` | `quantity * currentPrice` |
| `isPac` | `boolean` | Flag PAC (issue #11) |
| `pacMonthlyAmount` | `number?` | Versamento mensile PAC |

**Index:** `assetClass ASC + updatedAt DESC`

---

## Collection: `payslips`

**Scopo:** Cedolini stipendio parsati.

| Campo | Tipo | Note |
|---|---|---|
| `year` | `number` | Anno competenza |
| `month` | `1..12` | Mese competenza |
| `grossSalary` | `number` | Lordo mensile |
| `netSalary` | `number` | Netto percepito |
| `irpef` | `number` | Ritenuta IRPEF |
| `inps` | `number` | Contributi INPS |
| `tfr` | `number` | Quota TFR maturata |
| `fondoPensione` | `number` | Versamento Fon.Te |
| `surplus` | `number?` | Net - spese fisse stimate |
| `parsed` | `boolean` | Parsing automatico completato |

**Index:** `year DESC + month DESC`

---

## Collection: `auditLog`

**Scopo:** Tracciamento immutabile di tutte le modifiche ai dati.

> Regola Firestore: **no update, no delete**. Solo append.

| Campo | Tipo | Note |
|---|---|---|
| `entityType` | `snapshot\|transaction\|...` | Tipo entita' modificata |
| `entityId` | `string` | ID documento modificato |
| `action` | `create\|update\|delete\|import\|snapshot` | |
| `previousValue` | `Record?` | Valore prima della modifica |
| `newValue` | `Record?` | Valore dopo la modifica |
| `source` | `user\|system\|import` | Chi ha innescato la modifica |

**Index:** `entityType ASC + createdAt DESC`

---

## Config: `/config/preferences`

**Scopo:** Impostazioni utente, conti bancari, parametri mutuo.

Contiene:
- Lista `BankAccount[]` (conti correnti Fineco, CC, ecc.)
- `MutuoConfig` (parametri ammortamento, issue #13)
- Preferenze notifiche e giorno chiusura mensile

---

## Regole di evoluzione del modello

1. Ogni modifica al modello dati deve essere accompagnata da:
   - Update di `src/types/index.ts`
   - Update di questo file
   - Update di `firestore.rules` se cambiano le collection
   - Update di `firestore.indexes.json` se servono nuovi indici
2. I campi obbligatori non si rimuovono senza migration
3. L'`auditLog` e' sempre immutabile
4. I tipi `BaseDocument` (id, createdAt, updatedAt) sono presenti su tutti i documenti
