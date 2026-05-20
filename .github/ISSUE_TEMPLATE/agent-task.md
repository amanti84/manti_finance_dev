---
name: "Agent Task (Copilot)"
about: "Task assegnabile a GitHub Copilot Coding Agent per sviluppo autonomo"
title: "[#N] tipo: descrizione breve"
labels: ["feature"]
assignees: ""
---

## Obiettivo

## Dipendenze
- [ ] Nessuna / oppure: closes #N

## Contesto tecnico
- File da creare/modificare: `src/...`
- Pattern: vedi `.github/copilot-instructions.md` e `AGENTS.md`

## Criteri di accettazione
- [ ] Compila senza errori TypeScript strict
- [ ] Nessun `any` TypeScript
- [ ] Test `*.test.ts` con almeno 3 casi (happy path, edge case, errore)
- [ ] Se scrive su Firestore: `auditService.log()` chiamato prima della scrittura
- [ ] Nessun `console.log` in produzione
- [ ] PR verso `main` con titolo `[#N] tipo: descrizione` e `closes #N`

## File da NON toccare
- `src/types/index.ts` (solo se esplicitamente richiesto)

## Note per l'agente
- Leggere `AGENTS.md` integralmente prima di iniziare
- Una issue = un branch = una PR
- Budget crediti stimato: ____ crediti
