# manti_finance_dev — Gap Analysis

## Purpose

This document compares the intended target platform for manti_finance_dev against the current repository direction and identifies what is missing, what should be refactored, and what must be built from scratch.

The goal is to turn the existing codebase and backlog into an executable roadmap, not just a feature list.

## Executive Assessment

The current project is already beyond the idea stage. The repository has been structured into clear functional areas, and the issue system reflects a mature delivery plan. The gap is no longer conceptual design; the gap is implementation depth, integration quality, and production readiness.

The largest remaining work is concentrated in:
- Domain engine completion.
- Data normalization.
- Cross-module integration.
- Decision logic.
- Document intake automation.
- UX refinement.
- Security and deployment hardening.

## Current State vs Target State

### What is already in place
- A structured backlog split by domains.
- Clear feature families such as payroll, investments, PAC, mortgage, pension, cash flow, dashboard, and document intake.
- A planned agentic delivery model.
- Foundation-level issues covering infrastructure, rules, and deployment.
- A clear product vision with a personal finance copilot orientation.

### What is still missing
- Fully working domain engines.
- A single canonical data model.
- End-to-end data flow across all modules.
- Automated document ingestion and extraction.
- Complete monthly consolidation flow.
- Scenario and alert engines with practical usefulness.
- Mature UI state handling and dashboard orchestration.
- Verified deployment pipeline with stable hosting.

## Domain-by-Domain Gap Review

### Payroll Engine
#### Target
Parse monthly payslips, normalize all fields, and compute useful financial outputs.

#### Gap
The current plan includes payroll issues, but the engine still needs robust parsing, normalization, validation, and calculation consistency. The raw payslip data must be converted into a stable internal model.

#### Required work
- Define a canonical payslip schema.
- Build parsing and normalization logic.
- Standardize variables such as bonuses, deductions, TFR, INPS, taxes, and net pay.
- Implement tests for varied payslip layouts.

### Investment Core
#### Target
Track instruments, holdings, prices, valuation, and allocation.

#### Gap
The repository direction indicates investment tracking exists conceptually, but the portfolio engine must be made robust enough to handle multiple instruments, recurring contributions, and market data updates.

#### Required work
- Support ISIN/ticker and instrument metadata.
- Build position and valuation model.
- Add portfolio allocation logic.
- Separate core portfolio data from UI aggregation.

### PAC
#### Target
Track recurring investment plans with contributions and growth.

#### Gap
PAC is present in the backlog, but it needs a formal model for frequency, contribution history, accumulated capital, and progress comparison.

#### Required work
- Create PAC entity model.
- Define contribution schedule representation.
- Build accumulation and progress calculations.
- Integrate PAC data into the investment dashboard.

### Mortgage
#### Target
Model mortgage structure and payoff scenarios.

#### Gap
The mortgage domain needs amortization logic, interest handling, simulation capability, and extra-payment strategy support.

#### Required work
- Define loan and installment schema.
- Implement amortization schedules.
- Add payoff simulation and what-if comparisons.
- Support different repayment strategies.

### Pension and TFR
#### Target
Track pension instruments and long-term accrual components.

#### Gap
The current backlog indicates pension and TFR are planned, but the data model and calculations likely remain incomplete.

#### Required work
- Define pension fund tracking structure.
- Add TFR accumulation logic.
- Compute long-term projections.
- Integrate pension data into monthly and annual views.

### Cash Flow
#### Target
Consolidate inflows and outflows with monthly clarity.

#### Gap
Cash flow is identified as a module, but it needs reliable source aggregation and grouping logic.

#### Required work
- Define cash transaction model.
- Aggregate income and expense streams.
- Support monthly rollups.
- Link cash flow to goal tracking and decision outputs.

### Document Intake
#### Target
Ingest documents from email or upload, classify them, and extract data.

#### Gap
This is one of the largest functional gaps. The platform needs document capture, classification, extraction, and linkage to financial entities.

#### Required work
- Add upload and email ingestion pathways.
- Create document classification logic.
- Extract key values from payslips, statements, and notices.
- Link documents to payroll, cash flow, and investments.

### Dashboard and UI
#### Target
Provide a clean, fast, decision-oriented interface.

#### Gap
The dashboard exists as a concept, but it must be upgraded into a true control center with meaningful summaries and drill-downs.

#### Required work
- Build responsive dashboard layout.
- Create modular cards and summary chips.
- Add domain-specific views.
- Prioritize clarity over visual noise.
- Ensure consistency in typography, spacing, and hierarchy.

### Decision Engine
#### Target
Generate scenarios, suggestions, thresholds, and alerts.

#### Gap
The decision layer is still conceptual in many places and should not become a vague AI feature. It must be rule-driven and grounded in real financial data.

#### Required work
- Define rule-based scenario inputs.
- Build threshold and alert logic.
- Produce recommendations from explicit financial rules.
- Avoid opaque outputs that cannot be audited.

## Cross-Cutting Gaps

### Data Model
A single source of truth is missing. The project needs a unified canonical model for all core entities:
- Payroll.
- Investments.
- PAC.
- Mortgage.
- Pension.
- Cash flow.
- Documents.
- Goals.

Without this, modules will diverge and become difficult to reconcile.

### State Synchronization
Different financial domains must be kept coherent. For example, a payroll change may affect cash flow, goals, and surplus allocation. This linkage must be designed deliberately.

### Test Coverage
Calculation-heavy modules require reliable unit tests and regression tests. Without this, financial outputs may drift or become inconsistent.

### Security
Because the platform handles sensitive personal finance data, security cannot be added later as an afterthought. Authentication, access control, and rules enforcement should be part of the foundation.

### Deployment
The app needs a stable deployment path so that each module can be reviewed and validated in real use rather than just in local development.

## Priority Gaps

### Highest Priority
1. Canonical data model.
2. Payroll normalization engine.
3. Investment core.
4. Document intake.
5. Dashboard integration.

### Medium Priority
1. PAC.
2. Mortgage simulation.
3. Pension/TFR.
4. Alert engine.
5. Goal tracker.

### Later Priority
1. What-if engine.
2. Monthly close automation.
3. Advanced UI polish.
4. Family-sharing refinements.
5. Expanded external integrations.

## Recommended Delivery Sequence

### Phase 1
- Stabilize foundations.
- Finalize shared types.
- Lock security and deployment basics.
- Complete payroll and investment core.

### Phase 2
- Add PAC, mortgage, pension, and cash flow.
- Connect these modules to the dashboard.
- Validate calculations and test coverage.

### Phase 3
- Add document intake and extraction.
- Complete decision support features.
- Improve alerts, scenarios, and goal tracking.

### Phase 4
- Polish UI and responsive experience.
- Harden the deployment pipeline.
- Prepare for private production-style usage.

## Conclusion

The project gap is real but manageable. The backlog is already mature enough to support delivery; the remaining challenge is to convert a strong functional concept into stable, testable, and integrated software.

The most important thing now is execution discipline: one canonical model, one stable foundation, and one controlled sequence of module delivery.