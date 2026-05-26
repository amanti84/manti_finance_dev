# AGENTS.md — Guida per agenti AI su manti_finance_dev

Questo file definisce le regole operative per tutti gli agenti AI (GitHub Copilot, Claude, altri)
che lavorano su questo repository. Leggilo prima di qualsiasi operazione.

---

## Identità del progetto

**manti_finance_dev** è una piattaforma di Personal Finance Copilot per gestione patrimoniale
personale. Utente unico (+ moglie). Ogni decisione tecnica deve bilanciare:
- Correttezza finanziaria (i calcoli devono essere esatti e auditabili)
- Semplicità operativa (intervento umano ZERO a regime — solo approvazione merge finale)
- Costo basso (Firebase free tier, < €1/mese a regime)

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

## Sequenza di esecuzione issue M2 (sprint attivo — maggio/agosto 2026)

M1 è COMPLETATO. Non riaprire issue M1.
Ordine esecuzione M2 — rispettare le dipendenze:

```
#9  Payroll Engine v2      ← PR #35 open, aggiungere test e mergare
    ↓
#10 Investment Core        ← PR #36 open, aggiungere test e mergare
    ↓ (parallelo a #10)
#13 Mutuo Service          ← PR #37 open, aggiungere test e mergare
    ↓
#11 PAC Service            ← MERGED ✅ (PR #40)
    ↓
#12 Decision Engine        ← dipende da #9 (Payroll v2 merged)
    ↓
#14 Previdenza/TFR         ← logica fiscale TFR + Fon.Te, attenzione a rivalutazione
    ↓
#15 Cash Flow              ← dipende da #9, #10, #13 tutti merged
```

**Priorità immediata**: chiudere le 3 PR aperte (#35, #36, #37) aggiungendo i test mancanti.

---

## Dipendenze npm approvate per M2

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

Non aggiungere altre dipendenze senza che siano esplicitamente richieste nell'issue.

---

## Note sulla logica finanziaria

I moduli finanziari hanno requisiti di precisione elevati:
- **Mutuo**: usa aritmetica con `number` standard, arrotonda a 2 decimali con `Math.round(val * 100) / 100`
- **TFR**: calcolo annuale, non mensile — attenzione alla logica di rivalutazione
- **Fon.Te**: tetto annuo deducibilità €5.164,57 — verificare superamento
- **Investimenti**: prezzi aggiornati ogni 15 minuti via Cloud Function (già presente su repo legacy)
- **Surplus mensile**: stipendio netto - spese fisse - rate mutuo - PAC = surplus allocabile

In caso di dubbio su logica finanziaria: **non implementare**, lascia un commento nella PR.

---

## Workflow auto-merge (attivo su questo repo)

Questo repo ha due workflow GitHub Actions attivi:

1. **`automerge.yml`** — se una PR ha label `automerge` e la CI è verde (lint + typecheck + test + build), il merge viene eseguito automaticamente verso `main`.
2. **`assign-copilot.yml`** — se un'issue viene aperta o aggiornata con label `copilot-ready`, viene assegnata automaticamente a GitHub Copilot.

Quindi il loop operativo è:
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

## Contatti e riferimenti

- Repository: `amanti84/manti_finance_dev`
- Milestone attiva: M2 - Core Modules (scadenza 31 agosto 2026)
- M1 completata: 20 maggio 2026
- Blueprint: `.github/copilot-instructions.md` e `AGENTS.md`
- Stack legacy di riferimento: `amanti84/manti_finance` (repo originale con 277 commit)

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

### Stima consumo M2
- Issue con test inclusi (Payroll, Investment, Mutuo): ~3-5 crediti/sessione.
- Issue complesse (Decision Engine, TFR): ~4-6 crediti/sessione.
- Totale M2 stimato: 30-60 crediti su 1000 disponibili. Rischio sforamento: basso.
