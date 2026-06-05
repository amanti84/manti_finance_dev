import React, { useEffect, useState } from 'react';
import { getTopRecommendation } from '../../services/decision-engine';
import { listSnapshots } from '../../services/snapshot';
import { getAvailableBalance } from '../../services/cashflow';
import { getPayslips } from '../../services/payroll';
import { calculateAllocatableSurplus } from '../../services/payroll';
import type { DecisionResult, DecisionContext } from '../../types';

interface DecisionWidgetProps {
  uid: string;
}

const DecisionWidget: React.FC<DecisionWidgetProps> = ({ uid }) => {
  const [recommendation, setRecommendation] = useState<DecisionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const snapshotsResult = await listSnapshots(uid, 1);
        const balanceResult = await getAvailableBalance(uid);
        const payslipsResult = await getPayslips(uid);

        if (snapshotsResult.success && snapshotsResult.data.length > 0 && balanceResult.success && payslipsResult.success) {
          const lastSnapshot = snapshotsResult.data[0];
          const payslips = payslipsResult.data || [];

          const allocatableResult = calculateAllocatableSurplus(payslips);
          const surplusMensile = allocatableResult.success ? allocatableResult.data.allocatableSurplus : 0;

          // Build a basic context from available data
          // Some values are placeholders as full UserConfig integration is pending
          const ctx: DecisionContext = {
            uid,
            surplusMensile,
            sogliaInvestimento: 500,
            debitoResiduoMutuo: lastSnapshot.mutuo || 0,
            anniResiduiMutuo: 15, // Placeholder
            sogliaAnniMutuo: 5,
            saldoPensione: lastSnapshot.fondoPensione || 0,
            targetPensionePct: 15,
            redditoAnnuo: 40000, // Placeholder
            saldoConto: balanceResult.data?.availableBalance || 0,
            bufferSicurezza: 5000,
          };

          const recResult = getTopRecommendation(ctx);
          if (recResult.success) {
            setRecommendation(recResult.data);
          }
        }
      } catch (error) {
        console.error('Error fetching decision data:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [uid]);

  if (loading) return <p className="text-gray-500 italic">Analisi in corso...</p>;
  if (!recommendation) return <p className="text-gray-500 italic">Nessuna raccomandazione al momento.</p>;

  return (
    <div className="mt-2">
      <p className="font-bold text-blue-800">{recommendation.recommendation}</p>
      <p className="text-sm text-gray-700 mt-1 italic">&quot;{recommendation.motivation}&quot;</p>
      {recommendation.amount && (
        <p className="text-sm font-medium mt-1">
          Importo suggerito: &euro; {recommendation.amount.toLocaleString('it-IT')}
        </p>
      )}
    </div>
  );
};

export default DecisionWidget;
