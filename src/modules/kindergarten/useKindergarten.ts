// FILE RIMOSSO — sostituito da useKindergartenInvestments + useKindergartenPacs
// L'hook precedente gestiva expenses/config/summary, dominio fuori scope.
// Usare: useKindergartenInvestments(uid) e useKindergartenPacs(uid)
//
// Export stub mantenuto per compatibilità con KindergartenPage.test.tsx (legacy test).
// Il test verrà aggiornato separatamente per riflettere la nuova architettura.
export {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useKindergarten = (): any => {
  throw new Error('useKindergarten is deprecated. Use useKindergartenInvestments and useKindergartenPacs.')
}
