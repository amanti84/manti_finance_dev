# M2 - Core Modules: Sprint Plan

> **Milestone**: M2 - Core Modules | **Due**: 31 agosto 2026  
> **Status**: 🟡 In Progress | **Data creazione**: 20 maggio 2026  
> **PM**: AI Agent (Comet) | **Team**: 50 senior devs + GitHub Copilot (dal 1 giugno 2026)

---

## Overview

M1 Foundation è al **90% completato** (10/11 issues closed). L'unico blocco è l'attivazione GitHub Copilot subscription (disponibile dal 1° giugno 2026).

M2 parte ufficialmente oggi con lo sviluppo in parallelo dei 9 moduli core. La struttura base (types, Firebase, CI/CD, auth, snapshot engine, audit trail) è già solida e pronta.

---

## Stato Issues M2

| # | Titolo | Priorità | Assegnato a | Branch | Status |
|---|--------|----------|-------------|--------|--------|
| #8 | Payroll Engine v1: parsing e normalizzazione cedolino | ✅ Completato in M1 | - | main | DONE |
| #9 | Payroll Engine v2: surplus mensile e variabili | 🔴 P1 | Squad Alpha | feat/m2-payroll-v2 | TODO |
| #10 | Investment Core: portafoglio multi-servizio e tracking prezzi | 🔴 P1 | Squad Beta | feat/m2-investment-core | TODO |
| #11 | PAC: gestione piani di accumulo e versamenti periodici | 🟠 P2 | Squad Beta | feat/m2-pac | TODO |
| #12 | Decision Engine v1: suggerimento allocazione surplus mensile | 🟠 P2 | Squad Gamma | feat/m2-decision-engine | TODO |
| #13 | Mutuo: tracking ammortamento e simulazione estinzione | 🟠 P2 | Squad Alpha | feat/m2-mutuo | TODO |
| #14 | Previdenza e TFR: tracking Fon.Te e fondo pensione | 🟡 P3 | Squad Delta | feat/m2-previdenza | TODO |
| #15 | Cash Flow: vista consolidata conti correnti e movimenti | 🟡 P3 | Squad Delta | feat/m2-cashflow | TODO |
| #7 | [EPIC] M2 - Core Modules | - | PM | - | IN PROGRESS |

---

## Sprint Planning

### Sprint 1 — 20 maggio → 10 giugno 2026 (3 settimane)
**Obiettivo**: Completare i moduli P1 prima dell'arrivo di GitHub Copilot

**Focus Squad Alpha** (Payroll v2 + Mutuo):
- [ ] `feat/m2-payroll-v2`: `calculateSurplus()`, `calculateAnnualProjection()`, `getVariableComponents()`, `calculateYoYComparison()`
- [ ] `feat/m2-payroll-v2`: Unit tests con Vitest (coverage ≥ 80%)
- [ ] `feat/m2-mutuo`: `MutuoService` con `getAmortizationSchedule()`, `simulateAnticipatedExtinction()`, `calculateRemainingDebt()`
- [ ] PR review e merge entro il 7 giugno

**Focus Squad Beta** (Investment Core + PAC):
- [ ] `feat/m2-investment-core`: `InvestmentService` CRUD completo
- [ ] `feat/m2-investment-core`: `calculatePnL()`, `calculateUnrealizedPnL()`, `aggregateByBroker()`, `aggregateByAssetClass()`
- [ ] `feat/m2-pac`: `PacService` con `recordPacPayment()`, `getPacSummary()`, `calculatePacProgress()`
- [ ] PR review e merge entro il 10 giugno

### Sprint 2 — 10 giugno → 30 giugno 2026 (3 settimane)
**Obiettivo**: Completare moduli P2/P3 con GitHub Copilot attivo

**Focus Squad Gamma** (Decision Engine):
- [ ] `feat/m2-decision-engine`: `DecisionEngineService` con `suggestAllocation()`, `calculateSurplusAllocation()`, `getMonthlyRecommendations()`
- [ ] Integration test con PayrollService (lettura surplus)
- [ ] PR review e merge entro il 25 giugno

**Focus Squad Delta** (Previdenza + CashFlow):
- [ ] `feat/m2-previdenza`: `PrevidenzaService` con TFR, Fon.Te, fondo pensione
- [ ] `feat/m2-cashflow`: `CashFlowService` con vista consolidata conti + movimenti
- [ ] PR review e merge entro il 30 giugno

### Sprint 3 — 1 luglio → 31 agosto 2026 (8 settimane)
**Obiettivo**: Integration testing, performance, bug fixing, chiusura M2

- [ ] Integration test completo tra tutti i moduli
- [ ] Hook `usePayroll`, `useInvestments`, `useMutuo`, `useDecisionEngine`
- [ ] Performance audit (Firestore query optimization, indexes)
- [ ] Docs: aggiornare `data-model.md` con tutti i nuovi schemi
- [ ] Close tutti gli issues M2
- [ ] Avvio pianificazione M3

---

## Architettura Servizi M2

```
src/services/
├── payroll.ts          ✅ v1 completato (M1)
├── payroll-v2.ts       🔨 da creare (surplus + proiezioni)
├── investment.ts       🔨 da creare
├── pac.ts              🔨 da creare
├── mutuo.ts            🔨 da creare
├── previdenza.ts       🔨 da creare
├── cashflow.ts         🔨 da creare
├── decision-engine.ts  🔨 da creare
├── snapshot.ts         ✅ completato (M1)
└── audit.ts            ✅ completato (M1)
```

```
src/hooks/
├── usePayslips.ts      ✅ completato (M1)
├── useInvestments.ts   🔨 da creare
├── useMutuo.ts         🔨 da creare
├── useDecisionEngine.ts 🔨 da creare
└── useCashFlow.ts      🔨 da creare
```

---

## Dipendenze e Prerequisiti

### Già disponibili (da M1)
- ✅ `src/types/index.ts` — tipi completi: `Investment`, `Payslip`, `MutuoConfig`, `BankAccount`, `PatrimonioSnapshot`
- ✅ `src/firebase.ts` — inizializzazione Firestore + Auth
- ✅ `src/services/audit.ts` — audit trail su ogni operazione
- ✅ `src/services/snapshot.ts` — fotografia mensile patrimonio
- ✅ CI/CD pipeline — lint + test su ogni PR
- ✅ Branch protection su `main`

### Da aggiungere a `types/index.ts` (Sprint 1)
- [ ] `PacPayment` — singolo versamento PAC con data, importo, investimento collegato
- [ ] `PrevidenzaConfig` — TFR accantonato, Fon.Te, fondo pensione complementare
- [ ] `CashFlowEntry` — movimento singolo (entrata/uscita) su conto corrente
- [ ] `DecisionRecommendation` — output del Decision Engine
- [ ] `SurplusBreakdown` — componenti surplus (stabile vs variabile)

### Cloud Functions (da pianificare per Sprint 2)
- [ ] `updateInvestmentPrices` — scheduled function per aggiornamento prezzi (Yahoo Finance API o similar free tier)
- [ ] `monthlySnapshotTrigger` — trigger automatico snapshot il 1° di ogni mese

---

## Definition of Done (M2)

- [ ] Tutti i 9 issues M2 closed
- [ ] Coverage test ≥ 80% su tutti i nuovi servizi
- [ ] Zero errori ESLint in CI
- [ ] Firestore rules aggiornate e validate
- [ ] `data-model.md` aggiornato con tutti gli schemi M2
- [ ] Decision Engine integrato con Payroll (legge surplus reale)
- [ ] Snapshot mensile include dati investimenti, mutuo, previdenza

---

## Note Strategiche

### GitHub Copilot dal 1 giugno 2026
Dal 1 giugno sarà disponibile Copilot agent mode. Le issue con task chiari e acceptance criteria definiti potranno essere assegnate direttamente a Copilot per la prima implementazione. Strategia:
1. Assegnare issue #12 (Decision Engine) e #14 (Previdenza) a Copilot come primo test
2. Il team fa code review e refinement
3. Riduce il time-to-PR da ~3 giorni a ~4 ore per issue semplici

### Low-cost by design
- Firestore reads ottimizzati con composite indexes già configurati
- Nessuna API a pagamento per prezzi: Yahoo Finance API (free tier) o fallback a prezzi manuali
- Firebase Functions solo per scheduled tasks (non hot path)

### Audit Trail
- Ogni operazione di write passa per `audit.ts`
- Il Decision Engine logga ogni raccomandazione generata

---

*Documento generato da AI Agent (Comet) il 20 maggio 2026 — aggiornare a ogni sprint review*
