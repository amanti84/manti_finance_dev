
# AGENTS.md — Guida per agenti AI su manti_finance_dev

Questo file definisce le regole operative per tutti gli agenti AI (GitHub Copilot, Claude, altri)
che lavorano su questo repository. Leggilo prima di qualsiasi operazione.

---

## Identità del progetto

**manti_finance_dev** è una piattaforma di Personal Finance Operating System (PFOS) per gestione
patrimoniale personale. Utente unico (Antonino Manti, Milano). **Non è un tracker di entrate/uscite.**
È un financial copilot che ingesta documenti reali, calcola proiezioni, e produce raccomandazioni
di allocazione mensile azionabili.

Ogni decisione tecnica deve bilanciare:
- Correttezza finanziaria (i calcoli devono essere esatti e auditabili)
- Semplicità operativa (intervento umano ZERO a regime — solo approvazione merge finale)
- Costo basso (Firebase free tier, < €1/mese a regime)

### Blueprint di riferimento

Il documento canonico di prodotto è `/docs/project-documentation-v1.1.md`.
Prima di implementare qualsiasi modulo, leggere la sezione corrispondente del blueprint.
La gap analysis è in `/docs/gap-analysis-v1.md`.

---

## Filosofia operativa — Zero Touch

Il proprietario del progetto NON scrive codice e NON apre issue.
Il suo unico intervento consentito è: **cliccare Merge su una PR già verde**.

Ogni agente deve quindi:
1. Leggere l'issue assegnata e iniziare in autonomia
2. Scrivere il codice rispettando tutti i pattern di questo file
3. Scrivere i test PRIMA di aprire la PR
4. Aprire la PR con descrizione completa (cosa, come testare, closes #N)
5. Aggiungere il label `automerge` se CI è verde e non ci sono ambiguità
6. NON aspettare input umano per decisioni tecniche standard
7. In caso di dubbio su logica finanziaria: lasciare commento nella PR, NON bloccare

---

## Regole per gli agenti

### Prima di iniziare qualsiasi task
1. Leggi l'issue assegnata integralmente
2. Leggi `.github/copilot-instructions.md`
3. Verifica le dipendenze dichiarate nell'issue (non iniziare se una dipendenza è open)
4. Non creare file fuori dalla struttura cartelle definita
5. Controlla `src/services/payroll.ts` come riferimento canonico per il pattern `ApiResult<T>`

### Durante lo sviluppo
1. Un branch per issue. Nome branch: `feature/issue-N-titolo-breve` o `fix/issue-N-titolo`
2. Commit atomici con messaggio: `tipo: descrizione breve (refs #N)`
   - tipi validi: `feat`, `fix`, `chore`, `test`, `docs`, `refactor`
3. Mai toccare file di altre issue nello stesso branch
4. Ogni nuovo tipo TypeScript va in `src/types/index.ts` — mai inline
5. Ogni nuovo servizio DEVE avere il suo file di test (`*.test.ts`) — minimo 3 test: happy path, edge case, errore
6. **Pattern obbligatorio return type**: tutti i servizi usano `ApiResult<T>` — vedere sezione sotto

### Alla fine del task
1. Apri la PR verso `main`
2. Titolo PR: `[#N] tipo: descrizione` (es. `[#9] feat: payroll engine v2`)
3. Descrizione PR deve includere:
   - Cosa è stato implementato (max 5 righe)
   - Come testarlo localmente
   - `closes #N` per chiudere automaticamente l'issue al merge
   - Checklist: [ ] test scritti [ ] ApiResult pattern rispettato [ ] auditService chiamato [ ] tipi in index.ts
4. Aggiungere label `automerge` se CI verde e nessuna ambiguità finanziaria
5. Non fare self-merge — la PR viene mergiata da workflow automatico se CI verde + label `automerge`

---

## Pattern ApiResult<T> — OBBLIGATORIO per tutti i servizi

TUTTI i metodi di servizio devono restituire `ApiResult<T>`. MAI restituire `{success, data}` o oggetti custom.

```typescript
// src/types/index.ts — tipo già presente
export type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

// CORRETTO — pattern da seguire (riferimento canonico: src/services/payroll.ts)
export const esempiService = {
  async get(uid: string): Promise<ApiResult<TipoEsempio>> {
    try {
      await auditService.log(uid, 'ESEMPIO_GET', {});
      const snap = await getDoc(doc(db, `users/${uid}/esempio`));
      return { data: snap.data() as TipoEsempio, error: null };
    } catch (e) {
      return { data: null, error: (e as Error).message };
    }
  }
};

// SBAGLIATO — non fare mai così
// return { success: true, data: result };
// return { success: false, message: 'errore' };
```

---

## Perimetro consentito per agente

### Consentito senza approvazione umana
- Creare nuovi file in `src/components/`, `src/services/`, `src/hooks/`, `src/utils/`
- Aggiungere tipi in `src/types/index.ts`
- Scrivere test in file `*.test.ts`
- Aggiornare `package.json` solo per aggiungere dipendenze approvate nel task
- Creare Firebase Functions in `functions/`
- Aggiornare `firestore.rules` solo se esplicitamente richiesto dall'issue
- Aggiungere label `automerge` alle proprie PR se CI verde

### Richiede approvazione umana (non fare in autonomia)
- Modificare la struttura del modello dati Firestore già in produzione
- Cambiare la logica di calcolo di moduli già funzionanti
- Aggiungere servizi esterni o dipendenze con costi
- Modificare configurazioni Firebase (project settings, billing)
- Cambiare le regole di branch protection
- Qualsiasi operazione che tocca dati reali utente

---

## ROADMAP COMPLETA — M1 → M5

### Stato milestone

| Milestone | Stato | Scadenza |
|-----------|-------|----------|
| M1 — Foundation | ✅ COMPLETATA | 20 maggio 2026 |
| M2 — Core Modules | 🔄 IN CORSO | 31 agosto 2026 |
| M3 — Intelligence Layer | ⏳ PIANIFICATA | Q4 2026 |
| M4 — Document Intake | ⏳ PIANIFICATA | Q4 2026 |
| M5 — Polish & Hardening | ⏳ PIANIFICATA | Q1 2027 |

---

### M1 — Foundation ✅ COMPLETATA (20 maggio 2026)

M1 è COMPLETATO. Non riaprire issue M1.

Deliverable completati:
- Firebase Auth (Google SSO + email/password)
- Firestore setup + regole di sicurezza base
- React Router v6 + struttura moduli
- Shared layout (sidebar, navbar, dark mode)
- CI/CD pipeline (lint + typecheck + test + build)
- auditService (log ogni scrittura con uid, action, payload, timestamp)

---

### M2 — Core Modules 🔄 IN CORSO (scadenza 31 agosto 2026)

M1 è prerequisito di tutto M2. Non iniziare issue M2 se una dipendenza è ancora open.

#### Fase A — PR aperte da chiudere PRIMA (blocca tutto il resto)

```
#9  Payroll Engine v2      ← PR #35 open — AGGIUNGERE TEST e mergare
    ↓
#10 Investment Core        ← PR #36 open — AGGIUNGERE TEST e mergare
    ↓ (parallelo a #10)
#13 Mutuo Service          ← PR #37 open — AGGIUNGERE TEST e mergare
```

**Regola**: Le PR #35, #36, #37 devono avere test prima del merge. Senza test non si usa `automerge`.

#### Fase B — Sviluppi nuovi (partono dopo Fase A)

```
#11 PAC Service            ← MERGED ✅ (PR #40)
    ↓
#12 Decision Engine        ← dipende da #9 (Payroll v2 merged)
    ↓
#14 Previdenza/TFR         ← logica fiscale TFR + Fon.Te, attenzione a rivalutazione
    ↓
#15 Cash Flow              ← dipende da #9, #10, #13 tutti merged
    ↓ (parallelo a #15)
#16 Kindergarten Module    ← fee mensile, spese one-off, contributi nonni, costo netto
```

#### Fase C — UI Sprint (partono dopo Fase B, possono sovrapporsi parzialmente)

```
[S1-A] Design System       ← issue #79 — Tailwind v4 + CSS tokens + dark mode
    ↓
[S1-B] Layout Shell        ← issue #80 — sidebar + navbar + navigazione + SVG logo
    ↓
[S1-D] Libreria UI         ← issue #82 — Button, Card, Badge, Input, Modal, EmptyState, Skeleton
    ↓
[S1-C] Dashboard live      ← issue #81 — KPI da Firestore (net worth, cedolino, PAC, saldo)
    ↓
[S2-A] InvestimentiPage    ← issue #83 — usa investment.ts già pronto
[S2-B] MutuoPage           ← issue #84 — usa mutuo.ts già pronto
[S2-C] PrevidenzaPage      ← issue #85 — usa previdenza.ts già pronto
[S2-D] CashFlowPage        ← P&L mensile + proiezione 12m (usa cashflow.ts)
[S2-E] KindergartenPage    ← costo netto mensile + summary annuale detrazioni
[S2-F] PayrollPage         ← storico cedolini + YTD + anomaly flag
    ↓
[S3-A] Login Page          ← issue #87 — Google Auth UI professionale
```

---

### M3 — Intelligence Layer ⏳ (Q4 2026)

**Prerequisito**: tutte le issue M2 merged su main.

Questo milestone implementa il cervello della piattaforma. Senza M3 il sistema è un display passivo.
Con M3 diventa il financial copilot descritto nel blueprint.

#### [M3-A] Monthly Allocation Engine

- Input: net salary (da Payroll), spese fisse (da Cash Flow), liquidity buffer attuale, valore portfolio, residuo mutuo
- Regole motore:
  - Liquidity buffer target = 3× spese fisse mensili
  - Se liquidità > buffer: allocare surplus a investimenti o overpayment mutuo secondo priorità configurata
  - Se liquidità < buffer: flag deficit, suggerire ribilanciamento
- Output: raccomandazione strutturata JSON + UI card (destination, amount, rationale per riga)
- Human gate: il proprietario approva o sovrascrive prima che venga loggata come eseguita
- Storico raccomandazioni versionate in Firestore con status: `pending | approved | overridden`
- **Logica finanziaria critica**: non implementare senza aver letto FR-02 del blueprint

Tipo Firestore da rispettare:
```typescript
AllocationRecommendation {
  id: string
  month: string                  // YYYY-MM
  netIncome: number
  fixedExpenses: number
  liquidityBuffer: number
  surplusAmount: number
  recommendation: AllocationLine[]
  status: 'pending' | 'approved' | 'overridden'
  approvedAt?: Timestamp
}

AllocationLine {
  destination: 'investment' | 'mortgage_overpayment' | 'liquidity' | 'other'
  amount: number
  rationale: string
}
```

#### [M3-B] Net Worth Dashboard

- Calcolo real-time: Σ(assets) − Σ(liabilities)
- Assets: portfolio investimenti, conti liquidi, TFR maturato, valore fondo pensione
- Liabilities: residuo mutuo, altri debiti registrati
- Grafico storico: snapshot mensili da Firestore (recharts LineChart)
- Proiezione forward 12/24/36 mesi basata su tasso risparmio attuale e crescita portfolio configurabile
- KPI cards: patrimonio netto corrente, delta MoM, delta YoY

#### [M3-C] Portfolio Performance Analytics

- Metriche: XIRR (usare libreria `xirr`), TWR, guadagno/perdita assoluto e %
- Allocazione per asset class (ETF, Stock, Bond, Cash) via recharts PieChart
- Confronto benchmark: MSCI World o indice configurabile
- Refresh dati: upload manuale CSV/JSON da broker (Fineco, Revolut)
- Multi-account: aggregazione consolidata + vista per singolo conto

---

### M4 — Document Intake ⏳ (Q4 2026)

**Prerequisito**: M3-A (Monthly Allocation Engine) merged.

Questo milestone trasforma la piattaforma da manuale a zero-touch mensile.
Senza M4 ogni aggiornamento dati richiede inserimento manuale.

#### [M4-A] Upload Interface

- Drag-and-drop PDF, mobile-compatible (touch target ≥ 44px)
- Usare `react-dropzone`
- Progress bar durante upload su Firebase Storage
- Validazione: solo PDF, max 10MB
- Path Firebase Storage: `users/{uid}/documents/{YYYY-MM}/{docId}.pdf`
- Metadata obbligatori: `uploadedAt`, `uploadedBy`, `originalName`, `status: 'pending'`

#### [M4-B] Document Classification Engine

- Classificazione automatica tipo documento: `payslip | bank_statement | trade_confirmation | mortgage_statement | other`
- Logica rule-based su nome file + contenuto testuale estratto con `pdf-parse` (no ML in Phase 1)
- Aggiornamento Firestore record con `type` classificato e `status: 'classified'`
- Fallback manuale: se classificazione fallisce, tipo = `other`, visibile in inbox con CTA

#### [M4-C] Document Inbox UI

- Lista documenti in stato `pending` o `classified` ordinati per data upload
- Age indicator: "Caricato 2 giorni fa" con badge rosso se > 7 giorni non processato
- Azioni inline: Classifica manualmente, Collega a modulo, Archivia
- Badge contatore nel navbar (es. "3 in attesa")

#### [M4-D] Module Routing Post-Classification

- Payslip classificato → trigger aggiornamento PayrollRecord con documentRef
- Bank statement → trigger aggiornamento Cash Flow transactions
- Trade confirmation → trigger aggiornamento PortfolioSnapshot
- Mortgage statement → trigger aggiornamento residual in MortgageRecord
- Ogni routing deve loggare via auditService con `source: 'document_intake'`

Tipo Firestore da rispettare:
```typescript
Document {
  id: string
  type: 'payslip' | 'bank_statement' | 'trade_confirmation' | 'mortgage_statement' | 'other'
  uploadedAt: Timestamp
  storagePath: string
  status: 'pending' | 'classified' | 'processed'
  linkedEntityId?: string
}
```

---

### M5 — Polish & Hardening ⏳ (Q1 2027)

**Prerequisito**: M4 completata e validata in uso reale (almeno 2 mesi operativi).

#### [M5-A] Mobile Optimization
- Viewport 375px: tutte le pagine navigabili senza scroll orizzontale
- Sidebar collassata su mobile (hamburger menu o bottom tab bar)
- KPI cards impilate verticalmente
- Chart full-width su mobile
- Touch target audit completo (≥ 44px su ogni elemento interattivo)

#### [M5-B] Error Boundaries & Resilience
- React Error Boundary per ogni modulo (errore in Payroll non crasha Mortgage)
- Empty state design per ogni modulo (non "No data" — messaggio contestuale + CTA)
- Skeleton loader su ogni sezione con dati asincroni
- Offline detection + banner informativo

#### [M5-C] Audit Trail UI
- Pagina Settings → Audit Log
- Lista operazioni: chi, cosa, quando, su quale entità
- Filtri per modulo e per periodo
- Esportazione CSV audit log

#### [M5-D] Alert Engine
- Regole configurabili dall'utente: "avvisa se surplus > €X", "avvisa se residuo mutuo < €Y"
- Notifiche in-app (bell icon nel navbar con badge count)
- Alert pre-configurati di sistema:
  - Cedolino non caricato entro giorno 10 del mese
  - Portfolio −5% MoM
  - Rata mutuo > 30% stipendio netto
  - Avviso reset tasso (mutuo variabile), 60 giorni prima

#### [M5-E] What-If Scenarios
- Simulatore overpayment mutuo: inserisci €X extra/mese → ricalcola piano e risparmio interessi totali
- Simulatore PAC: cambia importo mensile → proiezione capitale a 10/20/30 anni (compound)
- Simulatore TFR: lasciare in azienda vs versare a Fon.Te → differenza proiettata a pensione

---

## Note sulla logica finanziaria

I moduli finanziari hanno requisiti di precisione elevati:
- **Mutuo**: usa aritmetica con `number` standard, arrotonda a 2 decimali con `Math.round(val * 100) / 100`
- **TFR**: calcolo annuale, non mensile — attenzione alla logica di rivalutazione (1,5% + 75% ISTAT)
- **Fon.Te**: tetto annuo deducibilità €5.164,57 — verificare superamento e avvisare
- **Investimenti**: prezzi aggiornati ogni 15 minuti via Cloud Function (già presente su repo legacy)
- **Surplus mensile**: stipendio netto − spese fisse − rate mutuo − PAC = surplus allocabile
- **XIRR**: usare libreria `xirr` (npm) o implementazione custom — non usare IRR semplice
- **TWR**: calcolare per sub-periodi tra ogni deposito/prelievo, poi concatenare i rendimenti
- **IRPEF**: aliquote marginali italiane vigenti — verificare aggiornamento annuale
- **INPS dipendente**: aliquota corrente 9,19% (verificare aggiornamento)

In caso di dubbio su logica finanziaria: **non implementare**, lasciare un commento nella PR.

---

## Dipendenze npm approvate

### Già in uso (M1/M2)
```json
"dependencies": {
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "react-router-dom": "^6.0.0",
  "firebase": "^10.0.0"
},
"devDependencies": {
  "typescript": "^5.0.0",
  "vite": "^5.0.0",
  "vitest": "^1.0.0",
  "@testing-library/react": "^14.0.0",
  "eslint": "^8.0.0",
  "prettier": "^3.0.0"
}
```

### Approvate per M2-UI (S1-A Design System)
```json
"devDependencies": {
  "tailwindcss": "^4.0.0",
  "@tailwindcss/vite": "^4.0.0"
}
```

### Approvate per M3
```json
"dependencies": {
  "recharts": "^2.0.0",
  "xirr": "^1.0.0"
}
```

### Approvate per M4
```json
"dependencies": {
  "react-dropzone": "^14.0.0",
  "pdf-parse": "^1.1.1"
}
```

Non aggiungere altre dipendenze senza che siano esplicitamente richieste nell'issue.

---

## Workflow auto-merge (attivo su questo repo)

Questo repo ha due workflow GitHub Actions attivi:

1. **`automerge.yml`** — se una PR ha label `automerge` e la CI è verde (lint + typecheck + test + build), il merge viene eseguito automaticamente verso `main`.
2. **`assign-copilot.yml`** — se un'issue viene aperta o aggiornata con label `copilot-ready`, viene assegnata automaticamente a GitHub Copilot.

Loop operativo:
```
[issue con label copilot-ready]
        ↓ automatico
[Copilot crea branch + scrive codice + scrive test + apre PR]
        ↓ automatico
[CI: lint + typecheck + test + build]
        ↓ se tutto verde + label automerge
[MERGE AUTOMATICO su main + issue chiusa]
```

---

## Policy crediti GitHub Copilot (aggiornamento giugno 2026)

Dal 1° giugno 2026 GitHub Copilot usa un modello a crediti (1 credito = $0.01, piano Pro incluso = 1000 crediti/mese).

### Regole per gli agenti
- Usare **modelli leggeri** (Haiku, GPT-4o mini) per completamenti e chat veloci.
- Usare **modelli frontier** (Sonnet, Opus, GPT-4o) solo per task architetturali complessi.
- **Una sessione agent = una issue atomica**. Non aprire sessioni multi-issue.
- **Non caricare l'intero repo** come contesto: passare solo i file pertinenti al task corrente.
- **Soglia mensile**: tetto assoluto $10 di crediti inclusi. Nessun budget extra senza approvazione esplicita.
- Se i crediti superano $8 nel mese, sospendere sessioni agent e proseguire solo con completamento inline.

### Stima consumo per milestone
- M2 issue con test (Payroll, Investment, Mutuo): ~3-5 crediti/sessione. Totale M2: 30-60 crediti.
- M3 issue complesse (Allocation Engine, Net Worth): ~5-8 crediti/sessione. Totale M3: 20-40 crediti.
- M4 issue Document Intake: ~4-6 crediti/sessione. Totale M4: 20-30 crediti.
- M5 polish issues: ~2-4 crediti/sessione. Totale M5: 15-25 crediti.
- **Totale stimato M2→M5**: 85-155 crediti su 1000 disponibili/mese. Rischio sforamento: basso.

---

## Contatti e riferimenti

- Repository: `amanti84/manti_finance_dev`
- Milestone attiva: M2 - Core Modules (scadenza 31 agosto 2026)
- M1 completata: 20 maggio 2026
- Blueprint prodotto: `docs/project-documentation-v1.1.md`
- Gap Analysis: `docs/gap-analysis-v1.md`
- Sprint plan M2: `docs/M2-sprint-plan.md`
- Stack legacy di riferimento: `amanti84/manti_finance` (repo originale con 277 commit)
