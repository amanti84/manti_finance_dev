# Kindergarten — Regole di Dominio

> **Fonte di verità ufficiale.** Questo file prevale su qualsiasi altro documento,
> issue o commento nel codice in caso di conflitto.

## Perimetro consentito

Il modulo `kindergarten` ammette **esclusivamente**:

| Tipo di dato | Collection Firestore |
|---|---|
| Investimenti bambini | `users/{uid}/kindergarten_investments` |
| PAC bambini | `users/{uid}/kindergarten_pacs` |
| Movimenti collegati a investimenti/PAC | subcollection opzionale dei PAC |

## Perimetro vietato

Sono esplicitamente **vietati** nel modulo kindergarten:

- Spese (expenses)
- Budget e configurazioni di budget
- Cashflow
- Redditi
- Mutui
- Documenti
- Analytics generali
- Reporting patrimoniale personale
- Qualsiasi lettura da `users/{uid}/investments` o `users/{uid}/pacs`

## Segregazione dai moduli principali

Il modulo kindergarten è un **ledger parallelo e indipendente**:

- `src/services/kindergartenInvestment.ts` ≠ `src/services/investment.ts`
- `src/services/kindergartenPac.ts` ≠ `src/services/pac.ts`
- Gli aggregatori del main portfolio **non devono** leggere le collection kindergarten
- Il modulo kindergarten **non deve** importare da `investment.ts` o `pac.ts`

## File autorizzati nel modulo

```
src/modules/kindergarten/
├── KindergartenPage.tsx            ✔ entry point
├── KindergartenInvestmentList.tsx  ✔ lista investimenti bambini
├── KindergartenPACList.tsx         ✔ lista PAC bambini
├── KindergartenKPICard.tsx         ✔ KPI patrimoniali aggregati
├── KindergartenSummaryCard.tsx     ✔ card riepilogativa KPI
├── useKindergartenInvestments.ts   ✔ hook investimenti
├── useKindergartenPacs.ts          ✔ hook PAC
└── index.ts                        ✔ barrel export

src/services/
├── kindergartenInvestment.ts       ✔ CRUD kindergarten_investments
└── kindergartenPac.ts              ✔ CRUD kindergarten_pacs

src/types/kindergarten.ts           ✔ tipi esclusivi kindergarten
```

## File rimossi (fuori scope)

```
KindergartenBudgetConfig.tsx   ✘ budget — vietato
KindergartenExpenseForm.tsx    ✘ spese — vietato
KindergartenExpenseList.tsx    ✘ spese — vietato
useKindergarten.ts             ✘ hook expenses/config — sostituito
src/services/kindergarten.ts   ✘ service expenses — sostituito
```

## Regola per issue e PR

Ogni issue o PR che menziona Kindergarten come budget/spese va **chiusa o riscritta**.
Questa regola è vincolante a partire dal branch `feature/kindergarten-segregation-rewrite`.

---

*Ultimo aggiornamento: Giugno 2026*
*Autore: Antonino Manti / manti_finance_dev*
