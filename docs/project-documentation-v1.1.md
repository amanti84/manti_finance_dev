# manti_finance_dev — Project Documentation
**Version:** 1.1 | **Date:** May 2026 | **Prepared by:** Senior Consulting Team — Project Lead

---

# DOCUMENT 1 — PRODUCT BLUEPRINT v1

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
| Portfolio net worth accuracy | ±1% vs real-time source |
| Monthly allocation decision output | One actionable recommendation per month |
| Document intake latency | < 48h from document receipt |
| Human intervention in platform operation | < 30 min/month |

---

## Design Principles

1. **Document-driven first** — every financial event is anchored to a real document (payslip, bank statement, trade confirmation, mortgage schedule).
2. **Decision-support, not reporting** — the platform surfaces *what to do*, not just *what happened*.
3. **Modular and extensible** — each financial domain is a self-contained module with its own data model, UI, and computation engine.
4. **Agentic-ready** — all modules are designed to be buildable, testable, and deployable by AI coding agents without human scaffolding.
5. **Minimal human gate** — human input is required only for data upload, final decision approval, and exception handling.
6. **Audit trail by default** — all inputs, computed outputs, and decisions are versioned and traceable.

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
| **Kindergarten** | Dedicated page for child-related expenses (Asilo Nido fees, one-off purchases, grandparents' contributions) — accessible from main menu |
| **Net Worth Dashboard** | Consolidated real-time net worth view across all assets and liabilities |

### Out of Scope

- Tax filing and F24 generation (integration hook only)
- Multi-user / family sharing (single-user architecture)
- Real-time market data feeds (manual or scheduled batch refresh only)
- Banking API open-banking integration (Phase 2+)

---

## Information Architecture

### Navigation Structure

Dashboard (Home)
├── Payroll
│   ├── Current Month
│   ├── Historical Payslips
│   └── Bonus & TFR Tracker
├── Investments
│   ├── Portfolio Overview
│   ├── Account Detail (per broker)
│   └── Performance Analytics
├── Mortgage
│   ├── Amortization Schedule
│   ├── Residual Debt
│   └── Extra Payment Simulator
├── Pension
│   ├── Fondo Pensione
│   └── TFR Projection
├── Cash Flow
│   ├── Monthly P&L
│   ├── Category Breakdown
│   └── 12-Month Projection
├── Kindergarten
│   ├── Monthly Fees
│   ├── One-off Expenses
│   └── External Contributions
├── Documents
│   ├── Inbox (pending classification)
│   ├── Archive (classified)
│   └── Upload
└── Settings
├── Data Sources
├── Rules & Thresholds
└── Notifications


### Dashboard Design Standard

The main dashboard surfaces:
- **Current net worth** (assets − liabilities, real-time computed)
- **Monthly cash position** (income vs. spend, current month)
- **Allocation recommendation** (Monthly Allocation Engine output)
- **Document inbox count** (pending items)
- **Portfolio delta** (MTD performance, % and absolute)
- **Mortgage residual** (outstanding capital, next rate reset if applicable)

---

## Functional Requirements

### FR-01 — Payroll Engine

- Ingest monthly payslip (PDF or structured input)
- Extract: gross salary, net salary, IRPEF withheld, INPS contributions, bonus, TFR quota
- Normalize to canonical PayrollRecord data model
- Detect and flag anomalies (salary change > 5%, missing bonus vs. prior year)
- Compute YTD cumulative figures for tax and TFR tracking

### FR-02 — Monthly Allocation Engine

- Inputs: net salary (from Payroll), monthly fixed expenses (from Cash Flow), current liquidity buffer, investment portfolio value, mortgage residual
- Rules engine:
  - Maintain liquidity buffer = 3× monthly fixed expenses
  - If liquidity > buffer: allocate surplus to investment or mortgage overpayment per configured priority
  - If liquidity < buffer: flag deficit, suggest rebalancing
- Output: one structured recommendation per month (JSON + UI card)
- Human gate: owner approves or overrides recommendation before execution

### FR-03 — Document Intake Pipeline

- Upload interface: drag-and-drop PDF, mobile-compatible
- Classification: automatic document type detection (payslip / bank statement / trade confirmation / mortgage statement)
- Storage: Firebase Storage with structured metadata
- Routing: classified documents trigger corresponding module update
- Pending items visible in Document Inbox with age indicator

### FR-04 — Investment Portfolio

- Support multiple accounts (Fineco, Revolut, manual entry)
- Asset types: ETF, stocks, bonds, cash equivalents
- Performance metrics: XIRR, TWR, absolute gain/loss, % allocation by asset class
- Refresh: manual upload of CSV/JSON export from broker, or scheduled batch
- Benchmark comparison: configurable (e.g., MSCI World)

### FR-05 — Mortgage Module

- Input: original loan amount, rate (fixed/variable), start date, duration, current residual
- Compute: full amortization schedule, monthly capital/interest split, residual at any future date
- Extra-payment simulator: recalculate schedule with one-off or recurring extra payments
- Alert: rate reset date (for variable mortgages), residual milestone (e.g., 50% repaid)

### FR-06 — Kindergarten Module

- Monthly fee tracker (recurring, configurable amount)
- One-off expense log (purchases, activities, equipment)
- External contributions: log amounts received from grandparents or other sources
- Net monthly cost: fees + one-off − external contributions
- Annual summary for tax deduction reference

### FR-07 — Net Worth Dashboard

- Real-time computation: Σ(assets) − Σ(liabilities)
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

Every GitHub issue assigned to an agent must include


