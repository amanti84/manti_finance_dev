/**
 * Kindergarten module — public API
 *
 * Dominio: SOLO investimenti + PAC bambini.
 * Vietato: spese, budget, cashflow, finanza personale.
 * Ref: docs/architecture/kindergarten-domain-rules.md
 *
 * Regola di import: nessun altro modulo deve importare direttamente
 * da kindergartenInvestment.ts o kindergartenPac.ts — solo attraverso
 * questo barrel o attraverso i componenti/hook di questo modulo.
 */
export { default as KindergartenPage } from './KindergartenPage'
export { default as KindergartenSummaryCard } from './KindergartenSummaryCard'
export { default as KindergartenKPICard } from './KindergartenKPICard'
export { default as KindergartenInvestmentList } from './KindergartenInvestmentList'
export { default as KindergartenPACList } from './KindergartenPACList'
export { useKindergartenInvestments } from './useKindergartenInvestments'
export { useKindergartenPacs } from './useKindergartenPacs'
export type {
  KindergartenInvestment,
  KindergartenPAC,
  KindergartenMovement,
  KindergartenKPIs,
} from '../../types/kindergarten'
