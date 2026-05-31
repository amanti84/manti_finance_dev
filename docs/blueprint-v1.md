# Manti Finance v2 — Product Blueprint
### Official Project Framework Document
**Version:** 1.0  
**Status:** Approved for Phase 0  
**Classification:** Internal — Restricted  
**Owner:** Antonino Manti  
**Prepared by:** Platform Strategy & Engineering Team  
**Date:** May 2026

---

## Executive Summary

Manti Finance v2 is the evolution of an existing personal finance tracking platform into a **fully centralised, document-driven financial copilot**. The system will absorb monthly payslips and financial documents, automatically update every relevant financial domain — payroll, taxation, pension, mortgage, and investments — and produce a concrete monthly allocation recommendation whenever a new payslip is processed.

The platform must deliver four core outcomes:

1. **Centralisation** — one verified source of truth for all personal financial data.
2. **Automation** — document ingestion, computation, and reporting with minimal human intervention.
3. **Decision support** — structured monthly recommendations on surplus allocation across mortgage, ETF, second pension fund, and liquidity.
4. **Auditability** — every data point traceable to its source document or a logged manual override.

The product is personal-scale, intended for two users only (owner and spouse in read-only mode), and must operate at near-zero recurring cost. The **Kindergarten** section, dedicated to children's investment plans, is a fully isolated module accessible from the main navigation but operationally independent from all personal finance calculations.

---

## 1. Vision & Strategic Objectives

### 1.1 Product Vision

To build a private, highly automated financial operating system that replaces fragmented spreadsheets and manual tracking with a single, intelligent platform that reads documents, calculates automatically, and tells the user what to do with their money each month.

### 1.2 Strategic Objectives

| # | Objective | Measurable Outcome |
|---|---|---|
| O1 | Centralise all financial data | Single platform covers payroll, mortgage, pension, investments, and cash |
| O2 | Automate monthly reconciliation | New payslip triggers full update with < 5 minutes of manual effort |
| O3 | Deliver allocation recommendations | Monthly Allocation Engine produces actionable, motivated output after each payslip |
| O4 | Maintain full audit trail | Every data value has a traceable source or logged override |
| O5 | Operate at near-zero cost | Monthly infrastructure cost < €5 at steady state |
| O6 | Enable agentic development | All modules structured for GitHub-based agentic task execution |

### 1.3 Design Principles

- **Document-first**: the payslip and other source documents are the authoritative input. Manual entry is the exception, not the rule.
- **Event-driven**: every financial change is a logged event, not a silent state mutation.
- **Monthly close**: at the end of each month, the system produces an immutable financial snapshot.
- **Deterministic core**: financial calculations are rule-based, transparent, and reproducible.
- **AI as assistant**: recommendation and parsing intelligence augments human decisions; it does not replace them.
- **Low-cost by design**: architecture must avoid unnecessary services, polling, and compute waste.
- **Mobile-first UX**: the primary interface is a smartphone or iPad; desktop is secondary.
- **Agent-ready structure**: modules must have clear inputs, outputs, and acceptance criteria for agentic development.

---

## 2. Scope of Coverage

### 2.1 In-Scope Domains

#### Payroll & Income
- Monthly gross salary
- Net salary (after all deductions)
- Variable component (bonus, performance)
- IRPEF and other income taxes
- INPS contributions
- TFR (Trattamento di Fine Rapporto) monthly accrual
- Annual progressives and year-to-date tracking

#### Pension & Previdenza Complementare
- Fon.Te. (primary complementary pension fund)
- Second pension fund (if activated)
- Remaining deductible fiscal space
- Contribution history and projections
- TFR allocation to fund vs. INPS

#### Mortgage (Mutuo)
- Scheduled monthly payment
- Capital portion per instalment
- Interest portion per instalment
- Residual capital
- Amortisation plan and projection
- Manual spot repayments (logged, auditable)

#### Investments — Personal
- Fineco account (primary)
- Additional brokers and investment services (multi-source ready)
- Multiple current accounts
- Recurring PAC (Piano di Accumulo Capitale)
- Spot purchases and sales
- Real-time portfolio value (refresh every 15 minutes)
- Performance, cost basis, and allocation breakdown

#### Cash & Liquidity
- Current account balances (one or multiple)
- Emergency fund tracking
- Available deployable capital
- Allocated vs. free cash

#### Advisor & Recommendation Engine
- Monthly surplus allocation proposal
- Alert management
- What-if scenario modelling
- Monthly financial close summary

#### Kindergarten (Isolated Module)
- Children's PAC (€200/month recurring, adjustable)
- Manual spot contributions (gifts, inheritance transfers)
- Portfolio performance and history
- Standalone reporting
- No influence on personal financial KPIs

### 2.2 Out of Scope
- Insurance policies
- Employer benefits outside payslip
- Additional income sources beyond current employment
- Tax filing automation (insight only, not submission)
- Third-party API integrations beyond market data and document sources

---

## 3. Information Architecture

### 3.1 Navigation Structure

```
┌─────────────────────────────────────┐
│  MANTI FINANCE                      │
├─────────────────────────────────────┤
│  01  Dashboard                      │
│  02  Cedolini & Payroll             │
│  03  Previdenza                     │
│  04  Mutuo                          │
│  05  Investimenti                   │
│  06  Cash & Patrimonio              │
│  07  What-If                        │
│  08  Kindergarten                   │
│  09  Document Inbox                 │
│  10  Impostazioni & Audit           │
└─────────────────────────────────────┘
```

### 3.2 Dashboard — Home View

- Monthly financial status (current month close or in-progress)
- Net worth (total, with month-on-month delta)
- Available deployable cash
- Next recommended action (from Allocation Engine)
- Critical alerts (if any)
- Document inbox status (pending documents awaiting processing)
- Portfolio real-time value summary (last refresh timestamp)

Maximum 7 KPI elements visible without scrolling on mobile.

### 3.3 Module Standard — Every Section Must Include

| View | Content |
|---|---|
| Current value | Real-time or latest known value |
| Current month | Month-to-date figure |
| Delta MoM | Change vs. previous month (value + %) |
| YTD progressive | Year-to-date cumulative |
| Trend | 6-month and 12-month sparkline |
| Source | Link to originating document or rule |
| Manual overrides | Log of manual corrections with timestamp and reason |
| Monthly snapshot | Immutable month-end record |
| Alerts | Any threshold or anomaly flag |

---

## 4. Functional Specifications

### 4.1 Document Intake

#### Input Channels

| Channel | Primary Use Case | Priority |
|---|---|---|
| Dedicated email address | Payslip forwarding, broker statements | Primary |
| Google Drive folder | Bulk upload, archiving | Secondary |
| Direct web/mobile upload | Ad-hoc document submission | Tertiary |

#### Processing Pipeline

```
Step 1  →  Document received (email attachment / Drive / upload)
Step 2  →  Raw file stored in Cloud Storage with metadata
Step 3  →  OCR / text extraction
Step 4  →  Structured field parsing (document-type-specific)
Step 5  →  Confidence scoring per field
Step 6  →  High confidence → auto-confirm
           Low confidence → user validation queue
Step 7  →  Derived data updated (payroll, pension, investments...)
Step 8  →  Monthly snapshot refreshed
Step 9  →  Allocation Engine triggered (if payslip)
Step 10 →  Audit event logged
```

#### Confidence Scoring Rules
- Score 0.0–1.0 per extracted field
- Fields above 0.85 auto-confirmed
- Fields between 0.60–0.85 flagged for review
- Fields below 0.60 require mandatory manual validation
- All scores stored permanently with the audit record

### 4.2 Payroll Engine

Upon successful processing, the payroll engine triggers the **Allocation Engine**.

Fields extracted and updated:
- Gross salary (fixed component)
- Variable component (bonus, performance premium)
- IRPEF withheld
- INPS contributions (employee share)
- TFR monthly accrual
- Fon.Te. contribution (employee + employer)
- Net salary received
- Year-to-date progressives for all above fields

### 4.3 Mortgage Engine

#### Monthly Automatic Update
- Instalment number
- Payment amount
- Capital portion
- Interest portion
- Residual capital after payment

#### Spot Repayment (Manual Event)
- User enters amount, date, and reason
- System logs as `ManualAdjustment` with full audit fields
- Amortisation plan recalculated
- Impact on total interest saved computed and displayed
- Allocation Engine notified

#### Mortgage KPIs
- Residual capital (updated monthly)
- Total interest paid to date
- Total interest remaining
- Projected payoff date
- Effective cost of debt (annual rate)
- Comparison vs. expected investment return

### 4.4 Investment Engine

#### Architecture Principles
- Must support multiple brokers and multiple accounts from day one
- No hardcoded Fineco-specific logic
- All provider data through a normalisation layer

#### Real-Time Update
- Portfolio values refresh automatically every 15 minutes
- Last refresh timestamp visible on investments page and dashboard
- Refresh does not trigger full recalculation; updates market values only

#### Investment KPIs
- Current portfolio value
- Total invested capital
- Unrealised gain/loss (value and %)
- Realised gain/loss (year-to-date)
- Asset allocation breakdown (by type, geography, sector)
- PAC progress vs. plan
- Cash drag

### 4.5 Pension & Previdenza Module

Each payslip updates:
- Fon.Te. contribution (employee share)
- Fon.Te. contribution (employer share)
- TFR allocated to fund
- Year-to-date total contribution
- Remaining annual deductible space (cap: €5,164.57)

### 4.6 Cash & Liquidity Module

- Multiple accounts supported
- Emergency fund target configurable
- Emergency fund coverage ratio displayed (months of essential expenses)
- Free deployable cash = total cash − emergency fund − committed outflows
- Free deployable cash feeds directly into the Allocation Engine

### 4.7 Monthly Allocation Engine

**Trigger:** payslip successfully processed and net salary confirmed.

#### Decision Logic (Rule-Based, Prioritised)
1. **Emergency fund first**: if below target, allocate to cash first.
2. **Second pension fund**: if deductible space remains and fiscal benefit is high.
3. **Mortgage vs. ETF comparison**: compare effective mortgage rate vs. expected ETF return.
4. **Variable component routing**: if variable exceeds threshold, propose full allocation breakdown.
5. **Residual liquidity**: define comfort buffer and route remaining surplus.

#### Output Format
```
MONTHLY ALLOCATION — [Month Year]
────────────────────────────────
Net available for allocation:    €X,XXX
Already committed (PAC):         €XXX

Recommended allocation:
  → ETF spot purchase:           €XXX
  → Partial mortgage repayment:  €XXX
  → Fon.Te. / second fund:       €XXX
  → Liquidity (emergency buffer): €XXX

Alternative scenarios:
  A. All to ETF
  B. All to mortgage
  C. All to pension fund

Approve / Modify / Reject
```

### 4.8 What-If Engine

#### Supported Scenarios
- Variable salary high / variable salary low
- Partial or full early mortgage repayment
- Increased monthly ETF investment
- Activation of second pension fund
- Inflation sensitivity on long-term projections
- Portfolio return sensitivity (conservative / base / optimistic)
- Retirement projection

### 4.9 Alert Engine

| Alert Type | Trigger Condition |
|---|---|
| Payslip missing | Day 5 of month with no payslip received |
| Fon.Te. cap approaching | YTD contribution > 80% of €5,164.57 |
| Fon.Te. cap exceeded | YTD contribution exceeds fiscal limit |
| Emergency fund below target | Coverage ratio < configured threshold |
| Mortgage not reconciled | Payment date passed with no ledger update |
| Portfolio stale | Last refresh > 20 minutes during market hours |
| Anomalous MoM delta | Any module shows > 15% unexpected change |
| Allocation not actioned | Recommendation older than 7 days without response |
| Document inbox backlog | 3+ documents awaiting processing |

### 4.10 Kindergarten Module

#### Data Isolation Rules
- Stored in segregated Firestore collection
- No Kindergarten data feeds into: net worth, allocation engine, advisor, tax summary, or any personal KPI

#### Features
- Current portfolio value
- Total contributions (PAC + spot)
- Contribution split: recurring vs. spot gifts
- Unrealised performance
- Configurable PAC amount (currently €200/month)
- Manual spot contribution entry with label (e.g., "Regalo nonni — Natale 2025")
- Audit log for all contributions
- Goal setting (target amount by target year)

---

## 5. Data Model

### 5.1 Core Entities

```
User
  └─ id, email, role [owner | viewer], createdAt

Household
  └─ id, ownerUid, members[], preferences{}

Document
  └─ id, type, sourceChannel, rawFileUrl, status, uploadedAt, processedAt

Payslip [extends Document]
  └─ month, year, grossSalary, netSalary, variableComponent,
     irpef, inps, tfr, fonteEmployee, fonteEmployer

MortgageConfig
  └─ principal, interestRate, startDate, termMonths, paymentDay

MortgagePayment
  └─ month, year, instalment, capital, interest, residualCapital, isManual, auditRef

InvestmentAccount
  └─ id, provider, accountNumber, currency, type [brokerage | current]

InvestmentPosition
  └─ accountId, ticker, name, quantity, averageCost, currentPrice, lastUpdated

Trade
  └─ accountId, type [buy | sell], ticker, quantity, price, date, fees

PAC
  └─ accountId, ticker, amount, frequency, startDate, active

PensionContribution
  └─ month, year, fund [fonte | second], employeeAmount, employerAmount, taxDeductible

TaxSummary
  └─ year, grossIncome, taxableIncome, irpefPaid, inpsPaid, deductionsUsed, deductionSpace

MonthlySnapshot
  └─ month, year, netSalary, variableComponent, mortgageResidual,
     portfolioValue, pensionBalance, cashBalance, netWorth, createdAt, immutable: true

Recommendation
  └─ month, year, allocations[], reasoning, status [pending | approved | modified | rejected], actedAt

ManualAdjustment
  └─ module, field, previousValue, newValue, reason, userId, timestamp

AuditEvent
  └─ entityType, entityId, action, userId, timestamp, metadata{}

KindergartenAccount
  └─ id, label, currentValue, targetValue, targetDate

KindergartenContribution
  └─ accountId, type [pac | spot], amount, date, label, auditRef
```

### 5.2 Data Separation Principle

| Layer | Description | Mutable? |
|---|---|---|
| Raw documents | Original uploaded files | No |
| Extracted data | Fields parsed from documents | No (confidence-scored) |
| Derived data | Calculated values (e.g., net worth) | Recomputable |
| Monthly snapshot | End-of-month immutable record | No |
| Manual overrides | Human corrections with audit trail | Append-only |
| Recommendations | Allocation proposals with decision status | Append-only |

---

## 6. Technical Architecture

### 6.1 Stack Selection

| Layer | Technology | Rationale |
|---|---|---|
| Repository | GitHub | Source of truth, agentic workflow, CI/CD |
| Hosting | Firebase Hosting | Google ecosystem, free tier, fast CDN |
| Authentication | Firebase Auth (Google / Gmail) | Seamless Google integration, secure, free |
| Database | Firestore | Real-time sync, flexible schema, free tier |
| File Storage | Cloud Storage for Firebase | Document storage, access-controlled, free tier |
| Server functions | Cloud Functions for Firebase | Event-driven, low-cost, only runs when needed |
| Frontend | React + TypeScript | Component model, strong typing, ecosystem |
| Document intake | Gmail dedicated address + Google Drive | Native Google stack, no additional cost |

### 6.2 Cost Model

| Service | Free Tier Limit | Expected Usage | Cost Risk |
|---|---|---|---|
| Firestore | 1 GB storage, 50k reads/day | < 1,000 reads/day | None |
| Cloud Storage | 5 GB | < 500 MB documents | None |
| Cloud Functions | 2M invocations/month | < 5,000/month | None |
| Firebase Hosting | 10 GB/month bandwidth | < 100 MB/month | None |
| Firebase Auth | Unlimited Google Auth | 2 users | None |

**Total expected monthly cost at steady state: €0–3**

### 6.3 Security Model

- Firebase Security Rules at Firestore and Storage level
- Only authenticated users can read or write
- Role-based access: `owner` (full) vs. `viewer` (read-only)
- No public endpoints
- All documents in user-scoped Storage paths
- Cloud Functions validate auth token on every invocation
- Audit log entries are append-only; no delete permission

---

## 7. UX & Design Specifications

### 7.1 Design Principles

- **Mobile-first**: every layout designed at 375px before extending
- **iPad-first secondary**: at 768px+, two-column layout (overview + detail)
- **Maximum 7 KPIs on home** without scrolling
- **Drill-down progressive**: summary visible immediately; detail always one tap away
- **No visual noise**: no decorative elements, no gradients for decoration, no icon circles
- **High information density where appropriate**: financial data benefits from tabular density
- **Monochrome-first**: accent colour used only for action and status

### 7.2 Navigation Model

- **Mobile**: bottom tab bar with 5 primary items; remaining sections via "More" menu
- **iPad**: persistent left sidebar with full navigation list
- **Desktop**: persistent left sidebar, wider content area

Primary navigation tabs (mobile):
1. Dashboard
2. Investimenti
3. Document Inbox (with badge for pending items)
4. Mutuo
5. More (Kindergarten, Previdenza, Cash, What-If, Settings)

### 7.3 Page Anatomy

Every module page follows the same structure:

```
┌──────────────────────────────────┐
│  [Module Name]   [Period Toggle] │
│  [Current Value]  [MoM Delta]    │
├──────────────────────────────────┤
│  [Trend Sparkline — 6/12 months] │
├──────────────────────────────────┤
│  [Current Month Detail]          │
├──────────────────────────────────┤
│  [History — collapsible]         │
├──────────────────────────────────┤
│  [Source Documents — linked]     │
├──────────────────────────────────┤
│  [Manual Adjustments Log]        │
└──────────────────────────────────┘
```

### 7.4 Typography & Colour

- Clean, modern sans-serif pairing — display font for values and headings, body font for labels and metadata
- Dark neutral base for dark mode (primary), light neutral for light mode
- Single teal accent for CTAs, confirmations, and positive deltas
- Amber/orange for warnings; red for errors and negative deltas
- Tabular-nums for all financial figures; colour-coded deltas; consistent decimal alignment

### 7.5 Key UX Flows

#### Flow 1 — Payslip Received
```
Email arrives → Document Inbox shows badge →
User opens inbox → Document listed as "New" →
User taps to review → Extracted fields shown →
Confidence flags highlighted → User confirms or corrects →
System updates all modules → Allocation Engine runs →
Dashboard shows new recommendation
```

#### Flow 2 — Monthly Close Review
```
User opens Dashboard →
"Close Month" button visible →
System shows summary: income / investments / mortgage / pension / cash →
User reviews → Confirms close →
Snapshot created and locked
```

#### Flow 3 — Spot Mortgage Repayment
```
User opens Mutuo → Taps "Rimborso Anticipato" →
Enters amount and date →
System shows new amortisation plan and interest saving →
User confirms → Event logged to audit trail →
Allocation Engine recalculates future projections
```

---

## 8. Agentic Development Model

### 8.1 Guiding Principles

- Every agent operates within a clearly defined module boundary
- No agent makes changes across module boundaries without explicit approval
- All work via Pull Requests on GitHub; no direct commits to main
- Each PR must include: scope, acceptance criteria, tests, and a changelog note
- Agents must never modify the data model without a schema migration plan

### 8.2 Agent Roles

| Agent | Responsibility |
|---|---|
| Architecture Agent | Codebase structure, module scaffolding, shared utilities |
| Data / Parser Agent | Document ingestion pipeline, OCR, field extraction, confidence scoring |
| Finance Rules Agent | Payroll engine, mortgage ledger, pension calculations, allocation logic |
| UI / UX Agent | Frontend components, responsive layouts, design system implementation |
| QA Agent | Test coverage, regression detection, acceptance criteria verification |
| Refactor Agent | Technical debt reduction, performance improvements, code quality |

### 8.3 Development Phases

| Phase | Name | Objective |
|---|---|---|
| Phase 0 | Blueprint & Analysis | Approve this document; analyse `manti_finance` repo |
| Phase 1 | Gap Analysis | Identify reusable components, refactor candidates, and deletions |
| Phase 2 | Foundation | Firebase setup, Auth, data model, CI/CD, audit trail |
| Phase 3 | Core Modules | Payroll, Mortgage, Investments, Pension, Cash, Kindergarten |
| Phase 4 | Intelligence Layer | Allocation Engine, What-If Engine, Alert Engine |
| Phase 5 | UX Overhaul | Full redesign, mobile-first, dark mode, design system |
| Phase 6 | Hardening | Performance, security audit, edge cases, monitoring |

---

## 9. Success Criteria

### Functional
- [ ] Payslip ingestion triggers automatic update of all related modules
- [ ] Monthly Allocation Engine produces a motivated recommendation after each payslip
- [ ] Mortgage ledger updates automatically each month and logs spot repayments
- [ ] Fon.Te. and INPS update from payslip without manual entry
- [ ] Investment portfolio refreshes every 15 minutes automatically
- [ ] Multiple brokers and accounts can be configured
- [ ] What-if engine supports all defined scenario types
- [ ] Kindergarten operates independently with no cross-contamination of personal KPIs

### Technical
- [ ] All data points traceable to source document or audit-logged manual entry
- [ ] Monthly snapshot is immutable after close
- [ ] Firebase security rules prevent unauthorised access
- [ ] Confidence scoring applied to all parsed fields
- [ ] All Cloud Functions testable in isolation

### Operational
- [ ] Monthly infrastructure cost ≤ €5 at steady state
- [ ] No dependency on third-party services that could fail or become costly
- [ ] Platform operable with < 30 minutes of human effort per month after full setup

### UX
- [ ] Home dashboard loads in < 2 seconds on mobile
- [ ] All critical flows completable on mobile without desktop fallback
- [ ] Dark mode and light mode both polished and tested
- [ ] Design is distinctly professional — not template or consumer app aesthetic

---

## 10. Constraints & Assumptions

- Total build budget: €50–70 one-time
- Target monthly operating cost: €0–5
- Users: 2 (owner with full access, spouse with read-only access)
- Primary devices: iPhone and iPad
- Auth: Google/Gmail only
- Repository: GitHub (existing account)
- Infrastructure: Google Cloud ecosystem (Firebase)

---

## Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | May 2026 | Platform Strategy Team | Initial release |
| 1.1 | June 2026 | Senior VP Engineering | Committed to repo; gap analysis reconciled |

> **Status note (June 2026):** All service-layer gaps identified in the original Gap Analysis have been implemented as TypeScript services in `src/services/`. The remaining work is UI implementation (M2), connecting services to pages (M3), and intelligence layer activation (M4–M5). See `AGENTS.md` for the current execution roadmap.

*This document is the official v1 Product Blueprint for Manti Finance v2. It supersedes all previous notes and conversations. Any scope change must be reflected as a versioned update to this document before development begins.*

---

*Manti Finance v2 — Confidential — Personal Use Only*
