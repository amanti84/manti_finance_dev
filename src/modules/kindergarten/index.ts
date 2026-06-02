/**
 * Kindergarten module — public API
 * Exports ONLY what the rest of the app needs to know.
 * Internal services (kindergartenInvestment, kindergartenPac) must NOT
 * be imported directly by other modules — only through this barrel.
 */
export { default as KindergartenPage } from './KindergartenPage'
export { useKindergartenInvestments } from './useKindergartenInvestments'
export { useKindergartenPacs } from './useKindergartenPacs'
export type {
  KindergartenInvestment,
  KindergartenPAC,
  KindergartenMovement,
  KindergartenKPIs,
} from '../../types/kindergarten'
