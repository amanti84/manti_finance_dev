# Copilot Instructions — manti_finance_dev

## Contesto del progetto
Piattaforma di Personal Finance Copilot per gestione patrimoniale personale.
Utente singolo (+ moglie). Stack: React 18 + TypeScript, Firebase, Vite.
Obbiettivo: intervento umano minimo, massima automazione, auditabilità completa.

## Stack tecnologico
- **Frontend**: React 18, TypeScript (strict), Vite, React Router v6
- **Backend**: Firebase (Firestore, Auth, Storage, Functions)
- **Testing**: Vitest, React Testing Library
- **Linting**: ESLint + Prettier
- **CI/CD**: GitHub Actions

## Struttura cartelle
```
src/
  components/     # Componenti React riutilizzabili
  pages/          # Pagine (una per modulo)
  services/       # Logica Firebase e business logic
  hooks/          # Custom React hooks
  types/          # Tutti i tipi TypeScript (index.ts unico file)
  utils/          # Funzioni pure di utilità
  constants/      # Costanti e configurazioni
functions/        # Firebase Cloud Functions
```

## Regole OBBLIGATORIE — non derogabili

1. **Audit Trail**: qualsiasi modifica a dati finanziari (importi, date, categorie) DEVE
   chiamare `auditService.log()` prima di scrivere su Firestore.
2. **Tipi centralizzati**: tutti i tipi TypeScript vanno in `src/types/index.ts`.
   Mai definire tipi inline nei componenti o nei servizi.
3. **Test obbligatori**: ogni nuovo servizio (`src/services/`) deve avere un file
   di test corrispondente (`*.test.ts`). Minimo 3 test: happy path, edge case, errore.
4. **Naming convention**:
   - variabili e funzioni: `camelCase`
   - componenti React: `PascalCase`
   - costanti: `UPPER_SNAKE_CASE`
   - file servizi: `nomeModulo.service.ts`
   - file hook: `useNomeHook.ts`
5. **Nessun dato sensibile nei log**: mai loggare importi, nomi o dati personali
   in console.log o in output pubblici.
6. **Ogni PR deve referenziare l'issue**: il commit message deve includere
   `closes #N` o `refs #N`.
7. **Kindergarten isolato**: i dati dell'area Kindergarten non devono mai
   influenzare calcoli o statistiche del patrimonio personale.
8. **Monthly Close immutabile**: dati di mesi chiusi non sono modificabili.
   Ogni tentativo deve essere bloccato con errore esplicito.

## Modello dati Firestore
Collections principali:
- `users/{uid}/snapshots/{YYYY-MM}` — snapshot mensile patrimonio
- `users/{uid}/payroll/{YYYY-MM}` — dati cedolino mensile
- `users/{uid}/investments/{id}` — posizioni investimento
- `users/{uid}/mortgage` — dati mutuo (documento singolo)
- `users/{uid}/auditLog/{id}` — log modifiche
- `users/{uid}/documents/{id}` — documenti caricati
- `kindergarten/{uid}/transactions/{id}` — transazioni Kindergarten (separato)

## Pattern da seguire

### Servizio Firebase
```typescript
// src/services/esempio.service.ts
import { db } from '../config/firebase';
import { auditService } from './audit.service';
import type { TipoEsempio } from '../types';

export const esempiService = {
  async save(uid: string, data: TipoEsempio): Promise<void> {
    await auditService.log(uid, 'ESEMPIO_SAVE', data);
    await setDoc(doc(db, `users/${uid}/esempio`, data.id), data);
  }
};
```

### Componente React
```typescript
// src/components/NomeComponente.tsx
import type { FC } from 'react';
import type { PropType } from '../types';

interface Props {
  data: PropType;
}

export const NomeComponente: FC<Props> = ({ data }) => {
  return <div>{/* contenuto */}</div>;
};
```

## Cosa NON fare
- Non usare `any` TypeScript — usa `unknown` se necessario
- Non fare push diretti su `main` — sempre branch + PR
- Non modificare `src/types/index.ts` senza aggiornare tutti i servizi che usano il tipo modificato
- Non bypassare auditService per "velocità"
- Non usare `console.log` in produzione — usa un logger dedicato
- Non mescolare dati Kindergarten con patrimonio personale

## Budget e costi
Obiettivo: costi Firebase < €1/mese a regime.

Usare free tier Firebase dove possibile. Evitare chiamate API inutili — preferire cache locale e snapshot listeners.

## Policy crediti GitHub Copilot (aggiornamento giugno 2026)

Dal 1° giugno 2026 GitHub Copilot adotta un modello a crediti (1 credito = $0.01).
Ogni piano include crediti inclusi pari al costo mensile (es. Pro = $10/mese = 1000 crediti).

### Regole operative per questo progetto

- **Preferire modelli leggeri** (GPT-4o mini, Claude Haiku) per completamenti inline e chat brevi.
- **Usare modelli frontier** (Claude Sonnet/Opus, GPT-4o) SOLO per issue complesse che richiedono ragionamento architetturale.
- **Nessuna sessione agent illimitata**: ogni sessione agent deve essere focalizzata su UNA issue atomica.
- **Evitare context window enormi**: non caricare l'intero repo come contesto — passare solo i file rilevanti per il task.
- **Soglia di allerta**: se i crediti consumati nel mese superano $8 (80% del piano), sospendere le sessioni agent e completare solo con completamenti inline.
- **Nessuna code review automatica** sui branch di sviluppo durante M1 — solo review manuale da PM.
- **Tetto massimo mensile**: $10 di crediti Copilot inclusi. Nessun budget extra autorizzato senza approvazione esplicita del proprietario del progetto.

### Impatto atteso per M1 (giugno 2026)

- Issue atomiche piccole = basso consumo di crediti per sessione.
- Struttura cartelle e scaffolding: prevalentemente completamento inline → consumo minimo.
- Sessioni agent su issue complesse (Snapshot Engine, Audit Trail): stimato 2-4 crediti/sessione.
- Stima totale M1: 20-40 crediti su 1000 disponibili → ampiamente dentro il piano incluso.
Usare free tier Firebase dove possibile.
Evitare chiamate API inutili — preferire cache locale e snapshot listeners.
