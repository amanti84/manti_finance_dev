# manti_finance_dev â€” Project Documentation
**Version:** 1.1 | **Date:** May 2026 | **Prepared by:** Senior Consulting Team â€” Project Lead

---

# DOCUMENT 1 â€” PRODUCT BLUEPRINT v1

---

## Executive Summary

`manti_finance_dev` is a personal finance operating system designed to centralize payroll, investments, mortgage, pension, cash flow, and document intake into a single decision-support platform.

The product is not intended as a passive tracker: it is a structured **financial copilot** that ingests real-world inputs, normalizes them, computes financial projections, and surfaces actionable decision recommendations. The target user is a single professional household operating across multiple financial instruments, banks, employer relationships, and investment accounts.

The platform is built on a React + TypeScript frontend, a Firebase Firestore + Storage backend, and a modular architecture designed for autonomous agentic development via GitHub Copilot and Claude-based agents.

### Vision Statement

> A fully autonomous personal finance operating system that removes the cognitive load of financial decision-making from its owner, replacing spreadsheets, manual reconciliation, and fragmented dashboards with a single, always-current, decision-ready financial environment.

### Measurable Objectives

| Objective | Target |
|-----------|--------|
| Consolidate all financial data sources | 100% of known accounts and instruments |
| Payroll ingestion automation | Monthly, zero-manual-entry |
| Portfolio net worth accuracy | Â±1% vs real-time source |
| Monthly allocation decision output | One actionable recommendation per month |
| Document intake latency | < 48h from document receipt |
| Human intervention in platform operation | < 30 min/month |

---

## Design Principles

1. **Document-driven first** â€” every financial event is anchored to a real document (payslip, bank statement, trade confirmation, mortgage schedule).
2. **Decision-support, not reporting** â€” the platform surfaces *what to do*, not just *what happened*.
3. **Modular and extensible** â€” each financial domain is a self-contained module with its own data model, UI, and computation engine.
4. **Agentic-ready** â€” all modules are designed to be buildable, testable, and deployable by AI coding agents without human scaffolding.
5. **Minimal human gate** â€” human input is required only for data upload, final decision approval, and exception handling.
6. **Audit trail by default** â€” all inputs, computed outputs, and decisions are versioned and traceable.

---

## Scope of Coverage

### In Scope

| Domain | Description |
|--------|-------------|
| **Payroll Engine** | Monthly payslip ingestion, net pay normalization, bonus detection, TFR tracking, INPS contributions |
| **Mortgage Module** | Amortization schedule, capital/interest split, residual debt tracker, extra-payment simulator |
| **Investment Portfolio** | Multi-account portfolio (Fineco, Revolut, etc.), ETF/stock tracking, XIRR/TWR performance |
| **Pension & TFR** | Fondo pensione contributions, TFR accumulation, projected pension gap |
| **Cash Flow** | Monthly income vs. expense reconciliation, category-level breakdown, balance projection |
| **Monthly Allocation Engine** | Rule-based engine that recommends monthly capital allocation across savings, investments, mortgage overpayment, and liquidity buffer |
| **Document Intake** | Structured ingestion pipeline for PDF payslips, bank statements, trade confirmations |
| **Kindergarten** | Dedicated page for child-related expenses (Asilo Nido fees, one-off purchases, grandparents' contributions) â€” accessible from main menu |
| **Net Worth Dashboard** | Consolidated real-time net worth view across all assets and liabilities |

### Out of Scope

- Tax filing and F24 generation (integration hook only)
- Multi-user / family sharing (single-user architecture)
- Real-time market data feeds (manual or scheduled batch refresh only)
- Banking API open-banking integration (Phase 2+)

---

## Information Architecture

### Navigation Structure

```
Dashboard (Home)
â”œâ”€â”€ Payroll
â”‚   â”œâ”€â”€ Current Month
â”‚   â”œâ”€â”€ Historical Payslips
â”‚   â””â”€â”€ Bonus & TFR Tracker
â”œâ”€â”€ Investments
â”‚   â”œâ”€â”€ Portfolio Overview
â”‚   â”œâ”€â”€ Account Detail (per broker)
â”‚   â””â”€â”€ Performance Analytics
â”œâ”€â”€ Mortgage
â”‚   â”œâ”€â”€ Amortization Schedule
â”‚   â”œâ”€â”€ Residual Debt
â”‚   â””â”€â”€ Extra Payment Simulator
â”œâ”€â”€ Pension
â”‚   â”œâ”€â”€ Fondo Pensione
â”‚   â””â”€â”€ TFR Projection
â”œâ”€â”€ Cash Flow
â”‚   â”œâ”€â”€ Monthly P&L
â”‚   â”œâ”€â”€ Category Breakdown
â”‚   â””â”€â”€ 12-Month Projection
â”œâ”€â”€ Kindergarten
â”‚   â”œâ”€â”€ Monthly Fees
â”‚   â”œâ”€â”€ One-off Expenses
â”‚   â””â”€â”€ External Contributions
â”œâ”€â”€ Documents
â”‚   â”œâ”€â”€ Inbox (pending classification)
â”‚   â”œâ”€â”€ Archive (classified)
â”‚   â””â”€â”€ Upload
â””â”€â”€ Settings
    â”œâ”€â”€ Data Sources
    â”œâ”€â”€ Rules & Thresholds
    â””â”€â”€ Notifications
```

### Dashboard Design Standard

The main dashboard surfaces:
- **Current net worth** (assets âˆ’ liabilities, real-time computed)
- **Monthly cash position** (income vs. spend, current month)
- **Allocation recommendation** (Monthly Allocation Engine output)
- **Document inbox count** (pending items)
- **Portfolio delta** (MTD performance, % and absolute)
- **Mortgage residual** (outstanding capital, next rate reset if applicable)

---

## Functional Requirements

### FR-01 â€” Payroll Engine

- Ingest monthly payslip (PDF or structured input)
- Extract: gross salary, net salary, IRPEF withheld, INPS contributions, bonus, TFR quota
- Normalize to canonical PayrollRecord data model
- Detect and flag anomalies (salary change > 5%, missing bonus vs. prior year)
- Compute YTD cumulative figures for tax and TFR tracking

### FR-02 â€” Monthly Allocation Engine

- Inputs: net salary (from Payroll), monthly fixed expenses (from Cash Flow), current liquidity buffer, investment portfolio value, mortgage residual
- Rules engine:
  - Maintain liquidity buffer = 3Ã— monthly fixed expenses
  - If liquidity > buffer: allocate surplus to investment or mortgage overpayment per configured priority
  - If liquidity < buffer: flag deficit, suggest rebalancing
- Output: one structured recommendation per month (JSON + UI card)
- Human gate: owner approves or overrides recommendation before execution

### FR-03 â€” Document Intake Pipeline

- Upload interface: drag-and-drop PDF, mobile-compatible
- Classification: automatic document type detection (payslip / bank statement / trade confirmation / mortgage statement)
- Storage: Firebase Storage with structured metadata
- Routing: classified documents trigger corresponding module update
- Pending items visible in Document Inbox with age indicator

### FR-04 â€” Investment Portfolio

- Support multiple accounts (Fineco, Revolut, manual entry)
- Asset types: ETF, stocks, bonds, cash equivalents
- Performance metrics: XIRR, TWR, absolute gain/loss, % allocation by asset class
- Refresh: manual upload of CSV/JSON export from broker, or scheduled batch
- Benchmark comparison: configurable (e.g., MSCI World)

### FR-05 â€” Mortgage Module

- Input: original loan amount, rate (fixed/variable), start date, duration, current residual
- Compute: full amortization schedule, monthly capital/interest split, residual at any future date
- Extra-payment simulator: recalculate schedule with one-off or recurring extra payments
- Alert: rate reset date (for variable mortgages), residual milestone (e.g., 50% repaid)

### FR-06 â€” Kindergarten Module

- Monthly fee tracker (recurring, configurable amount)
- One-off expense log (purchases, activities, equipment)
- External contributions: log amounts received from grandparents or other sources
- Net monthly cost: fees + one-off âˆ’ external contributions
- Annual summary for tax deduction reference

### FR-07 â€” Net Worth Dashboard

- Real-time computation: Î£(assets) âˆ’ Î£(liabilities)
- Assets: investment portfolio, cash accounts, TFR accrued, pension fund value
- Liabilities: mortgage residual, any other registered debt
- Historical net worth chart: monthly snapshots
- Projection: 12/24/36-month forward simulation based on current savings rate and portfolio growth assumption

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Performance** | Dashboard load < 2s on 4G mobile |
| **Availability** | Firebase-hosted, 99.9% uptime SLA |
| **Security** | Firebase Auth (email/Google SSO), Firestore security rules, no sensitive data in client-side state |
| **Auditability** | All writes to Firestore include `updatedAt`, `updatedBy`, `source` fields |
| **Testability** | Each module has unit tests (Vitest), core computation functions tested in isolation |
| **Maintainability** | TypeScript strict mode, ESLint enforced, modular file structure |
| **Agentic compatibility** | All modules buildable from GitHub issue spec without human scaffolding |

---

## Data Model

### Core Entities

```typescript
PayrollRecord {
  id: string
  month: string                  // YYYY-MM
  grossSalary: number
  netSalary: number
  irpefWithheld: number
  inpsContributions: number
  tfr: number
  bonus?: number
  documentRef: string            // Firebase Storage path
  createdAt: Timestamp
}

PortfolioSnapshot {
  id: string
  date: string                   // YYYY-MM-DD
  accountId: string
  holdings: Holding[]
  totalValue: number
  currency: string
}

Holding {
  ticker: string
  name: string
  quantity: number
  price: number
  value: number
  assetClass: 'ETF' | 'Stock' | 'Bond' | 'Cash'
}

MortgageRecord {
  id: string
  originalAmount: number
  currentResidual: number
  rate: number
  rateType: 'fixed' | 'variable'
  startDate: string
  durationMonths: number
  nextRateResetDate?: string
}

AllocationRecommendation {
  id: string
  month: string
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

Document {
  id: string
  type: 'payslip' | 'bank_statement' | 'trade_confirmation' | 'mortgage_statement' | 'other'
  uploadedAt: Timestamp
  storagePath: string
  status: 'pending' | 'classified' | 'processed'
  linkedEntityId?: string
}

KindergartenEntry {
  id: string
  month: string
  type: 'fee' | 'one_off' | 'contribution'
  amount: number
  description: string
  createdAt: Timestamp
}
```

---

## Agentic Development Playbook

### Agent Operating Model

The platform is developed by AI coding agents (GitHub Copilot + Claude) orchestrated by the project lead. The human owner acts as **financier and final approver**, not as developer or architect.

### Agent Roles

| Role | Responsibility |
|------|---------------|
| **Project Lead Agent** | Backlog management, issue specification, PR review, architecture decisions |
| **Feature Agent** | Implements one GitHub issue at a time, commits to feature branch, opens PR |
| **Test Agent** | Writes Vitest unit tests for computation functions |
| **Review Agent** | Reviews PR diff against issue spec before merge |

### Task Specification Template

Every GitHub issue assigned to an agent must include:

```markdown
## Context
[Why this module/function is needed]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Data Model
[Relevant types / interfaces]

## Implementation Notes
[Preferred libraries, patterns, constraints]

## Test Coverage Required
[Functions to be unit tested]
```

### Delivery Phases

| Phase | Scope | Human Gate |
|-------|-------|------------|
| **M1 â€” Foundation** | Auth, Firestore setup, routing, shared layout, CI/CD | Review PR #32 |
| **M2 â€” Core Modules** | Payroll Engine, Mortgage Module, Document Intake | Review 3 PRs |
| **M3 â€” Intelligence Layer** | Monthly Allocation Engine, Net Worth Dashboard, Portfolio performance | Review 3 PRs |
| **M4 â€” Extended Modules** | Kindergarten, Pension, Cash Flow projection | Review 3 PRs |
| **M5 â€” Polish & Hardening** | Mobile optimization, error handling, audit trail, notifications | Final sign-off |

---

## Success Criteria

### Functional Checklist

- [ ] All 8 modules accessible from navigation
- [ ] Payroll record ingested and displayed for current month
- [ ] Net worth computed in real-time from live Firestore data
- [ ] Monthly Allocation Engine produces recommendation and records approval
- [ ] Document inbox shows pending items with classification
- [ ] Mortgage amortization schedule renders correctly
- [ ] Kindergarten net monthly cost computed correctly
- [ ] All modules have at least one happy-path unit test passing in CI

### Technical Checklist

- [ ] TypeScript strict mode: zero `any` types in production code
- [ ] ESLint: zero warnings on `main` branch
- [ ] CI pipeline green on every PR merge
- [ ] Firestore security rules tested and locked (no public read/write)
- [ ] Firebase Storage rules tested
- [ ] No sensitive data (keys, credentials) in repository

### Operational Checklist

- [ ] Monthly platform operation requires < 30 min human time
- [ ] New payslip processed within 48h of upload
- [ ] Allocation recommendation available by day 5 of each month

---

## Constraints & Assumptions

- **Budget**: GitHub Free plan (Copilot Pro activation pending); Google Cloud / Firebase Spark plan with upgrade path
- **User**: Single user (Antonino Manti), Milan-based, Italian tax regime
- **Stack**: React 18 + TypeScript + Vite + Firebase (Firestore + Auth + Storage) â€” no backend server
- **External APIs**: Preferred free/open-source where possible; no open-banking API in Phase 1
- **Language**: Italian for UI labels and notifications; English for code and documentation
- **AI agents**: Prefer Google-platform or open/free services for new agent functions; security-first
- **Timeline**: No hard deadline; milestone-based delivery with quality gate at each phase

---

## Next Steps

| Step | Owner | Phase |
|------|-------|-------|
| Activate GitHub Copilot Pro | Antonino | Pre-M1 |
| Merge foundation PR #32 | Agent + Antonino review | M1 |
| Implement PayrollRecord data model and UI | Feature Agent | M2 |
| Implement Document Intake pipeline | Feature Agent | M2 |
| Implement Mortgage Module | Feature Agent | M2 |
| Build Monthly Allocation Engine | Feature Agent | M3 |
| Build Net Worth Dashboard | Feature Agent | M3 |

---

---

# DOCUMENT 2 â€” EXECUTIVE SUMMARY

---

## Platform Vision

`manti_finance_dev` is a personal finance operating system designed to centralize payroll, investments, mortgage, pension, cash flow, and document intake into a single decision-support platform. The product is not intended as a passive tracker: it is a structured **financial copilot** that ingests real-world inputs, normalizes them, computes financial projections, and surfaces actionable decision recommendations.

The target user is a single professional household (Milan, Italy) operating across multiple financial instruments, banks, employer relationships, and investment accounts. The ambition is to replace all spreadsheets, manual reconciliations, and fragmented dashboards with a single environment that is always current and always decision-ready.

---

## Why This Platform Exists

The existing `manti_finance` repository demonstrates strong product intuition and real functional coverage, but is architecturally fragmented: no canonical data model, no computation engine, no document intake, no allocation logic. It works as a display layer but not as an operating system.

The new platform addresses four structural gaps:

1. **No single source of truth** â€” financial data lives in spreadsheets, PDF files, and disconnected UI components with no normalized model underneath
2. **No computation engine** â€” figures are displayed but not computed; no amortization, no XIRR, no allocation logic
3. **No document pipeline** â€” payslips and statements are not ingested; the platform cannot be fed real-world data without manual entry
4. **No decision layer** â€” the platform reports history but does not recommend actions

---

## Scope Summary

The platform covers eight financial domains:

| Module | Core Output |
|--------|-------------|
| Payroll Engine | Monthly net pay, YTD figures, TFR/INPS tracking |
| Mortgage Module | Live amortization schedule, extra-payment simulator |
| Investment Portfolio | Multi-account portfolio, XIRR/TWR, benchmark comparison |
| Pension & TFR | Fondo pensione balance, projected pension gap |
| Cash Flow | Monthly P&L, category breakdown, 12-month projection |
| Monthly Allocation Engine | One actionable allocation recommendation per month |
| Document Intake | PDF classification, storage, module routing |
| Kindergarten | Net monthly child cost with external contribution tracking |

---

## Operating Model

The platform is built and maintained by AI coding agents (GitHub Copilot, Claude) orchestrated by the project lead. The human owner is the **financier and final approver**: he reviews PRs, approves allocation recommendations, and uploads documents. All other work â€” architecture, implementation, testing, deployment â€” is executed by agents.

Monthly human time target: **< 30 minutes**.

---

## Delivery Model

Five milestones, each ending with a human review gate:

- **M1** â€” Foundation: auth, routing, CI/CD, shared layout
- **M2** â€” Core modules: Payroll, Mortgage, Document Intake
- **M3** â€” Intelligence: Allocation Engine, Net Worth Dashboard, Portfolio performance
- **M4** â€” Extended modules: Kindergarten, Pension, Cash Flow projection
- **M5** â€” Polish & hardening: mobile, error handling, audit trail

---

## Key Decisions

- **No backend server**: React + Firebase architecture, serverless by design
- **No open-banking in Phase 1**: manual or batch-import data ingestion
- **Italian tax regime**: IRPEF, INPS, TFR, Fondo Pensione modeled explicitly
- **Single-user architecture**: no sharing, no multi-tenant complexity
- **Stack locked**: React 18 + TypeScript strict + Vite + Firebase â€” no migration risk

---

---

# DOCUMENT 3 â€” GAP ANALYSIS v1.0

**Repository analysed:** `amanti84/manti_finance`
**Analysis date:** May 2026
**Analyst:** Senior Consulting Team

---

## Repository Overview

| Attribute | Value |
|-----------|-------|
| Stack | React + Firebase (Firestore + Auth + Storage) |
| Commits | 277 |
| Primary language | JavaScript (partial TypeScript migration) |
| CI/CD | GitHub Actions (partially configured) |
| Test coverage | Near-zero |
| Architecture | Single-layer display app, no computation engine |

The repository demonstrates genuine product thinking and real functional intent. The navigation structure covers the right domains, and several UI components are well-conceived. However, the platform is architecturally a **display layer without a data model underneath**: it shows data but does not compute, normalize, or persist it in a structured way.

---

## Module-by-Module Gap Assessment

### Dashboard

| Aspect | Current State | Target State | Gap |
|--------|--------------|--------------|-----|
| Net worth display | Hardcoded or manually entered | Real-time computed from Firestore | Full rebuild |
| Allocation recommendation | Not present | Monthly Allocation Engine output card | Build from scratch |
| Document inbox | Not present | Pending document count + routing | Build from scratch |
| Portfolio delta | Static | Live from PortfolioSnapshot | Rebuild |

**Verdict:** `Dashboard.jsx` â†’ redesign completely. No reusable logic.

---

### Payroll

| Aspect | Current State | Target State | Gap |
|--------|--------------|--------------|-----|
| Data model | No canonical model | `PayrollRecord` TypeScript interface | Define and implement |
| PDF ingestion | Not present | Document Intake pipeline | Build from scratch |
| YTD computation | Not present | Running totals (IRPEF, TFR, INPS) | Build from scratch |
| Anomaly detection | Not present | Delta check vs prior month | Build from scratch |
| UI | Basic display | Monthly view + historical list | Partial rebuild |

**Verdict:** Keep UI shell, rebuild data layer and computation entirely.

---

### Mortgage

| Aspect | Current State | Target State | Gap |
|--------|--------------|--------------|-----|
| Amortization schedule | Not computed | Full schedule from `MortgageRecord` | Build from scratch |
| Extra-payment simulator | Not present | Interactive calculator | Build from scratch |
| Residual tracker | Manual | Computed from schedule | Rebuild |
| Rate reset alert | Not present | Date-triggered notification | Build from scratch |

**Verdict:** Full rebuild. Existing component has no computation logic.

---

### Investment Portfolio

| Aspect | Current State | Target State | Gap |
|--------|--------------|--------------|-----|
| Multi-account support | Partial | Fineco + Revolut + manual | Extend |
| Performance metrics | Not computed | XIRR, TWR, absolute gain | Build from scratch |
| Asset class allocation | Not present | Pie chart by class | Build from scratch |
| Benchmark comparison | Not present | vs MSCI World or configurable | Build from scratch |
| Data ingestion | Manual | CSV/JSON broker export | Build intake adapter |

**Verdict:** Significant gap. Display components partially reusable; all computation new.

---

### Pension & TFR

| Aspect | Current State | Target State | Gap |
|--------|--------------|--------------|-----|
| TFR tracking | Embedded in payroll | Dedicated tracker | Extract and formalize |
| Fondo pensione | Not present | Contribution log + projected balance | Build from scratch |
| Pension gap projection | Not present | Simulated monthly pension vs target | Build from scratch |

**Verdict:** Near-full build. TFR logic exists but is embedded in payroll display.

---

### Cash Flow

| Aspect | Current State | Target State | Gap |
|--------|--------------|--------------|-----|
| Income categorization | Partial | Full category taxonomy | Extend |
| Expense categorization | Partial | Full category taxonomy with rules | Extend |
| Monthly P&L | Partial | Computed from Firestore transactions | Rebuild |
| 12-month projection | Not present | Forward simulation from current trend | Build from scratch |

**Verdict:** Partial rebuild. Category structure is a starting point; computation layer is missing.

---

### Monthly Allocation Engine

| Aspect | Current State | Target State | Gap |
|--------|--------------|--------------|-----|
| Rules engine | Not present | Configurable allocation rules | Build from scratch |
| Recommendation output | Not present | Structured JSON + UI card | Build from scratch |
| Approval workflow | Not present | Human gate with override | Build from scratch |
| Historical log | Not present | Versioned recommendation archive | Build from scratch |

**Verdict:** Does not exist. Full build required. Highest-value module in the platform.

---

### Document Intake

| Aspect | Current State | Target State | Gap |
|--------|--------------|--------------|-----|
| Upload interface | Not present | Drag-and-drop, mobile-compatible | Build from scratch |
| Auto-classification | Not present | Rule-based type detection | Build from scratch |
| Firebase Storage integration | Not present | Structured path + metadata | Build from scratch |
| Module routing | Not present | Classified doc triggers module update | Build from scratch |

**Verdict:** Does not exist. Full build required. Critical enabler for all other modules.

---

### Kindergarten

| Aspect | Current State | Target State | Gap |
|--------|--------------|--------------|-----|
| Module existence | Present (basic) | Full module with net cost computation | Extend |
| External contributions | Not tracked | Logged and subtracted from gross cost | Extend |
| Annual summary | Not present | Tax deduction reference output | Build |

**Verdict:** Module exists. Extend rather than rebuild. Lowest-effort high-value addition.

---

## Technical Debt Inventory

| Item | Severity | Action |
|------|----------|--------|
| No TypeScript strict mode | High | Enable strict, fix all `any` types |
| No canonical data model | Critical | Define all interfaces in `src/types/` |
| No unit tests | High | Vitest setup + tests for all computation functions |
| CI pipeline incomplete | Medium | Fix `.github/workflows/ci.yml` (lint + test + build) |
| No Firestore security rules | Critical | Write and test rules before any production data |
| No Firebase Storage rules | High | Restrict to authenticated user only |
| JavaScript files in TypeScript project | Medium | Migrate to `.tsx`/`.ts` progressively |
| Dashboard.jsx monolithic | High | Decompose into module cards |
| `Summary.jsx` not integrated | Medium | Integrate or deprecate |
| Timer logic in UI components | Low | Extract to utility, add 15-min cap |
| Hardcoded values in components | Medium | Move to config / Firestore settings |
| No error boundaries | Medium | Add React error boundaries per module |

---

## What to Keep, Rebuild, Build from Scratch

| Module / Component | Decision | Rationale |
|-------------------|----------|-----------|
| Firebase project setup | **Keep** | Auth + Firestore + Storage correctly configured |
| React + Vite + TypeScript base | **Keep** | Correct stack, minor config cleanup needed |
| Navigation structure | **Keep (refactor)** | Right domains, needs TypeScript and routing tidy |
| Kindergarten module | **Keep (extend)** | Functional base, extend with net cost logic |
| Cash Flow categories | **Keep (extend)** | Good taxonomy start, needs computation layer |
| Dashboard.jsx | **Rebuild** | Monolithic, no live data, no computation |
| Payroll display | **Rebuild** | No data model, no computation |
| Mortgage component | **Rebuild** | No amortization logic |
| Investment display | **Rebuild** | No performance metrics |
| Document Intake | **Build from scratch** | Does not exist |
| Monthly Allocation Engine | **Build from scratch** | Does not exist â€” highest priority new module |
| Pension & TFR module | **Build from scratch** | TFR embedded, no pension logic |
| Firestore security rules | **Build from scratch** | Critical security gap |
| CI/CD pipeline | **Fix + extend** | Skeleton exists, non-functional |
| TypeScript types / data model | **Build from scratch** | No canonical model exists |
| Unit test suite | **Build from scratch** | Zero coverage today |

---

## Gap Analysis Summary

The existing repository covers approximately **30â€“35% of the target platform** in terms of functional coverage. The navigation and Firebase setup are solid foundations. The critical gaps are:

1. **No canonical data model** â€” everything else depends on this being fixed first
2. **No Document Intake pipeline** â€” without it, the platform cannot ingest real-world data
3. **No computation engines** â€” amortization, XIRR, YTD, allocation logic are all missing
4. **No Monthly Allocation Engine** â€” the highest-value module does not exist
5. **No security hardening** â€” Firestore rules are incomplete; not production-safe

The gap is large but manageable. The backlog is already mature enough to support delivery; the remaining challenge is to convert a strong functional concept into stable, testable, and integrated software.

The most important thing now is **execution discipline**: one canonical data model, one stable foundation, and one controlled sequence of module delivery.

---

*End of documentation â€” manti_finance_dev v1.1 â€” May 2026*