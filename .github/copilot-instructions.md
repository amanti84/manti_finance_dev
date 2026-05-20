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
Usare free tier Firebase dove possibile.
Evitare chiamate API inutili — preferire cache locale e snapshot listeners.
