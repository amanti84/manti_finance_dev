# Kindergarten — Segregazione del Portafoglio Bambini

## Obiettivo

Il modulo Kindergarten gestisce un **portafoglio finanziario completamente isolato** per i figli del proprietario dell'account.  
L'isolamento è totale: dati, calcoli e UI operano su collection Firestore proprie e non condividono nulla con il portafoglio principale.

---

## Modello di riferimento

Il progetto legacy `manti_finance` ha dimostrato che questa architettura funziona alla perfezione:

| Elemento | Legacy (`manti_finance`) | Dev (`manti_finance_dev`) |
|---|---|---|
| Collection investimenti | `kindergarten_investments` | `users/{uid}/kindergarten_investments` |
| Collection PAC | `kindergarten_pacs` | `users/{uid}/kindergarten_pacs` |
| Service | `kindergartenService.js` isolato | `kindergartenInvestment.ts` + `kindergartenPac.ts` |
| Calcoli | In-service, autonomi | In-service, autonomi |
| UI | `Kindergarten.jsx` + flag `isKindergarten` | `KindergartenPage.tsx` + hooks dedicati |
| Cross-import con moduli principali | ❌ Zero | ❌ Zero |

---

## Struttura file

```
src/
├── types/
│   └── kindergarten.ts          ← Tipi dominio: KindergartenInvestment, KindergartenPAC, KindergartenMovement, KindergartenKPIs
├── services/
│   ├── kindergartenInvestment.ts ← CRUD + calcoli KPI — collection kindergarten_investments
│   └── kindergartenPac.ts        ← CRUD + calcoli KPI — collection kindergarten_pacs
└── modules/
    └── kindergarten/
        ├── index.ts                     ← Barrel export (unico punto di accesso)
        ├── KindergartenPage.tsx          ← Entry point — aggrega investments + PAC
        ├── KindergartenKPICard.tsx       ← KPI aggregati: inv + PAC + grand total
        ├── KindergartenInvestmentList.tsx ← Lista investimenti diretti
        ├── KindergartenPACList.tsx        ← Lista PAC
        ├── useKindergartenInvestments.ts  ← Hook — wrappa kindergartenInvestment service
        └── useKindergartenPacs.ts         ← Hook — wrappa kindergartenPac service
```

### File rimossi (erano sbagliati)

| File eliminato | Motivo |
|---|---|
| `KindergartenBudgetConfig.tsx` | Budget è fuori scope — questo modulo gestisce investimenti |
| `KindergartenExpenseForm.tsx` | Le spese appartengono al modulo Expenses |
| `KindergartenExpenseList.tsx` | Le spese appartengono al modulo Expenses |
| `useKindergarten.ts` (vecchio) | Gestiva KindergartenExpense/Config invece di investimenti/PAC |
| `src/services/kindergarten.ts` (vecchio) | Orientato a expenses, sostituito dai due service specializzati |

---

## Regole di segregazione

1. **Nessun import cross-modulo** — `kindergartenInvestment.ts` e `kindergartenPac.ts` non importano da `investment.ts` o `pac.ts`.
2. **Collection Firestore proprie** — `kindergarten_investments` e `kindergarten_pacs` sono sub-collection sotto `users/{uid}/`, separate dalla gerarchia del portafoglio principale.
3. **Calcoli autonomi** — `calculateKindergartenInvestmentKPIs()` e `calculateKindergartenPACKPIs()` vivono nel rispettivo service e non chiamano utility condivise.
4. **Barrel export** — il resto dell'app importa solo da `src/modules/kindergarten/index.ts`.
5. **Props-driven UI** — i componenti lista (`KindergartenInvestmentList`, `KindergartenPACList`) ricevono dati e callbacks via props, nessun accesso diretto a Firestore.

---

## Firestore data model

```
users/
  {uid}/
    kindergarten_investments/
      {investmentId}/
        name, ticker, category, purchaseDate, purchasePrice,
        quantity, currentPrice, notes, createdAt, updatedAt
    kindergarten_pacs/
      {pacId}/
        name, ticker, monthlyAmount, startDate, targetYears,
        currentValue, totalInvested, lastPaymentDate, notes,
        createdAt, updatedAt
```

---

## Vincolo permanente

> **Non toccare nulla su `manti_finance` (legacy).** Questo repo è sorgente di ispirazione architetturale, non di modifica.
