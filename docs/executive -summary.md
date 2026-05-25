# manti_finance_dev — Executive Summary

## Vision

manti_finance_dev is a personal finance operating system designed to centralize payroll, investments, mortgage, pension, cash flow, and document intake into a single decision-support platform. The product is not intended as a passive tracker: it is a structured financial copilot that ingests real-world inputs, normalizes them, computes financial states, and produces actionable recommendations.

The long-term objective is to replace fragmented spreadsheets, manual calculations, and inconsistent record-keeping with a controlled, auditable, and extensible system that can support both day-to-day financial visibility and medium-term planning.

## Product Objective

The platform must enable the user to:
- Track salary and payroll variables from monthly payslips.
- Consolidate investments, PAC plans, and multi-instrument holdings.
- Model mortgage evolution and compare payoff strategies.
- Track pension and TFR-related positions.
- Monitor cash flow and monthly consolidation.
- Ingest documents automatically from email or upload.
- Produce decision-oriented insights, scenarios, and alerts.
- Support a family-sharing mode for visibility, especially for the “Kindergarten” area.

## Strategic Principles

The platform must be designed around the following principles:
- Centralization: one source of truth for all personal finance domains.
- Automation first: reduce manual data entry wherever possible.
- Auditability: every relevant financial change must be traceable.
- Decision support: the system must explain what changed and why it matters.
- Extensibility: new finance domains must be addable without redesigning the core.
- Security and privacy: personal and financial data must remain protected.
- Clarity of UX: the interface must be dense in information but visually clean and readable.

## Scope

The core scope includes:
- Payroll parsing and normalization.
- Investment portfolio tracking.
- PAC and recurring investment plans.
- Mortgage modeling and amortization logic.
- Pension and TFR tracking.
- Cash flow aggregation.
- Financial document intake and extraction.
- Dashboard and decision layers.
- Alerts and scenario simulation.
- Goal tracking.
- Infrastructure and deployment foundations.

The secondary scope includes:
- Family-access areas with restricted visibility.
- “Kindergarten” as a dedicated isolated domain for family-specific savings and child-related financial planning.
- Future decision engine enhancements.
- Integration with external market or reference data sources.

## Functional Model

### Payroll
The payroll engine must extract salary-relevant fields from monthly payslips, normalize them into a structured model, and compute useful outputs such as monthly surplus, variable components, bonuses, deductions, and net/cash implications.

### Investments
The investment core must support portfolio records at instrument level, with support for ISIN/ticker identification, pricing, valuation, allocation views, and recurring contributions.

### PAC
The PAC module must track periodic investments, contribution cadence, accumulated amount, and the relation between planned and actual flows.

### Mortgage
The mortgage module must represent the loan structure, simulate amortization, evaluate extra-payment strategies, and support what-if comparisons.

### Pension and TFR
The pension layer must track pension instruments, TFR evolution, and long-term accumulation logic.

### Cash Flow
The cash flow module must consolidate inflows and outflows and provide monthly and periodic visibility.

### Document Intake
The document intake layer must ingest financial documents from email or upload, classify them, and extract useful structured data.

### Decision Engine
The decision engine must transform raw facts into suggestions, scenarios, thresholds, and alertable states.

## Non-Functional Requirements

The platform must satisfy the following:
- Reliable and deterministic calculations.
- Clean separation between domain logic and UI.
- Strong typing and consistent data models.
- Accessible and responsive interface.
- Maintainable codebase with modular ownership.
- Secure handling of sensitive user data.
- Good testability across calculations and data transformations.

## Architectural Direction

The target architecture is modular and domain-driven:
- A foundation layer for authentication, security, rules, and shared types.
- Domain services for payroll, investments, mortgage, pension, cash flow, and documents.
- A decision layer for scenarios, alerts, and recommendations.
- A UI layer for dashboard, detail views, and action surfaces.
- Infrastructure for hosting, deployment, and document storage.

The architecture should prioritize small coherent modules over a single monolithic implementation.

## Delivery Model

Development should proceed through:
1. Foundation hardening.
2. Domain module implementation.
3. Decision support features.
4. UX refinement.
5. Automated deployment and reliability improvements.

The delivery model should remain compatible with agent-based development, with issues written in a way that an automated coding agent can execute independently.

## Success Criteria

The project can be considered successful when:
- Payroll and investment data are consistently normalized.
- Mortgage, pension, and cash-flow data are integrated.
- Document intake works with minimal manual intervention.
- The dashboard gives a clear financial overview.
- Scenarios and alerts produce useful decision support.
- The system remains understandable and maintainable over time.

## Closing Perspective

manti_finance_dev is best understood as a personal finance copilot rather than a traditional tracker. Its value comes from combining structure, automation, and financial reasoning into one operational environment.

The implementation should therefore focus on creating a trustworthy foundation first, then adding progressively more intelligence and automation.