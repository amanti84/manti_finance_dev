export interface LegacyPAC {
  id: string;
  name: string;
  isin: string;
  ticker?: string;
  monthlyAmount: number;
  startDate: string;
  endDate?: string;
  active: boolean;
  autoUpdate: boolean;
  platform?: string;
  monthlyDays?: number[];
  dayOfMonth?: number;
  shares?: number;
  avgCost?: number;
  lastPrice?: number;
}

export interface LegacyKindergartenPAC extends LegacyPAC {}

export interface LegacyInvestment {
  id: string;
  name: string;
  isin?: string;
  ticker?: string;
  type: string;
  amountInvested: number;
  avgCost?: number;
  currentValue: number;
  lastPrice?: number;
  quantity?: number;
  shares?: number;
  purchaseDate: string;
  platform?: string;
}

export interface LegacyKindergartenInvestment {
  id: string;
  name: string;
  isin?: string;
  ticker?: string;
  shares: number;
  avgCost: number;
  lastPrice: number;
  purchaseDate: string;
  platform?: string;
}

export interface MigrationPayload {
  pacs: LegacyPAC[];
  investments: LegacyInvestment[];
  kindergartenPacs: LegacyKindergartenPAC[];
  kindergartenInvestments: LegacyKindergartenInvestment[];
  dryRun?: boolean;
}
