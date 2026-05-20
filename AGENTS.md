# AGENTS.md — Guida per agenti AI su manti_finance_dev

Questo file definisce le regole operative per tutti gli agenti AI (GitHub Copilot, Claude, altri)
che lavorano su questo repository. Leggilo prima di qualsiasi operazione.

---

## Identità del progetto

**manti_finance_dev** è una piattaforma di Personal Finance Copilot per gestione patrimoniale
personale. Utente unico (+ moglie). Ogni decisione tecnica deve bilanciare:
- Correttezza finanziaria (i calcoli devono essere esatti e auditabili)
- Semplicità operativa (intervento umano minimo a regime)
- Costo basso (Firebase free tier, < €1/mese a regime)

---

## Regole per gli agenti

### Prima di iniziare qualsiasi task
1. Leggi l'issue assegnata integralmente
2. Leggi `.github/copilot-instructions.md`
3. Verifica le dipendenze dichiarate nell'issue (non iniziare se una dipendenza è open)
4. Non creare file fuori dalla struttura cartelle definita

### Durante lo sviluppo
1. Un branch per issue. Nome branch: `feature/issue-N-titolo-breve` o `fix/issue-N-titolo`
2. Commit atomici con messaggio: `tipo: descrizione breve (refs #N)`
   - tipi validi: `feat`, `fix`, `chore`, `test`, `docs`, `refactor`
3. Mai toccare file di altre issue nello stesso branch
4. Ogni nuovo tipo TypeScript va in `src/types/index.ts` — mai inline
5. Ogni nuovo servizio deve avere il suo file di test

### Alla fine del task
1. Apri la PR verso `main`
2. Titolo PR: `[#N] tipo: descrizione` (es. `[#2] feat: setup React+TypeScript scaffold`)
3. Descrizione PR deve includere:
   - Cosa è stato implementato
   - Come testarlo localmente
   - `closes #N` per chiudere automaticamente l'issue al merge
4. Non fare self-merge — lascia la PR aperta per review

---

## Perimetro consentito per agente

### Consentito senza approvazione umana
- Creare nuovi file in `src/components/`, `src/services/`, `src/hooks/`, `src/utils/`
- Aggiungere tipi in `src/types/index.ts`
- Scrivere test in file `*.test.ts`
- Aggiornare `package.json` solo per aggiungere dipendenze approvate nel task
- Creare Firebase Functions in `functions/`
- Aggiornare `firestore.rules` solo se esplicitamente richiesto dall'issue

### Richiede approvazione umana (non fare in autonomia)
- Modificare la struttura del modello dati Firestore già in produzione
- Cambiare la logica di calcolo di moduli già funzionanti
- Aggiungere servizi esterni o dipendenze con costi
- Modificare configurazioni Firebase (project settings, billing)
- Cambiare le regole di branch protection
- Qualsiasi operazione che tocca dati reali utente

---

## Sequenza di esecuzione issue M1 (giugno 2026)

L'ordine è rigido — non saltare step:

```
#32 Copilot Agent Setup          ← già parzialmente completato
  ↓
#2  Setup React+TypeScript        ← primo commit codice reale
  ↓
#3  Configurazione Firebase        ← dipende da #2
  ↓
#4  Modello dati v1                ← dipende da #3
  ↓
#5  Snapshot Engine               ← dipende da #4
  ↓
#6  Audit Trail                   ← dipende da #4, parallelo a #5
```

---

## Dipendenze npm approvate per M1

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

## Contatti e riferimenti

- Repository: `amanti84/manti_finance_dev`
- Milestone attiva: M1 - Foundation (scadenza 30 giugno 2026)
- Istruzioni dettagliate: `.github/copilot-instructions.md`
- Stack legacy di riferimento: `amanti84/manti_finance` (repo originale con 277 commit)
