// =============================================================
// src/types/index.ts
// Core TypeScript interfaces per manti_finance_dev
// Generato dal PM — NON modificare senza aprire una PR dedicata
// =============================================================

// -------------------------------------------------------
// ENTITA' BASE
// -------------------------------------------------------

export type Currency = 'EUR' | 'USD';
export type DocumentStatus = 'raw' | 'extracted' | 'verified';
export type SnapshotStatus = 'open' | 'closed';

// -------------------------------------------------------
// PAYROLL
// -------------------------------------------------------

export interface Payslip {
  id: string;
  userId: string;
  period: string;          // 'YYYY-MM'
  grossSalary: number;
  netSalary: number;
  totalDeductions: number;
  inps: number;
  irpef: number;
  tfr: number;
  currency: Currency;
  documentUrl?: string;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
}

// -------------------------------------------------------
// MUTUO
// -------------------------------------------------------

export interface MortgageInstallment {
  id: string;
  userId: string;
  period: string;          // 'YYYY-MM'
  installmentAmount: number;
  principalAmount: number;
  interestAmount: number;
  remainingBalance: number;
  currency: Currency;
  paidAt?: Date;
  createdAt: Date;
}

// -------------------------------------------------------
// INVESTIMENTI
// -------------------------------------------------------

export interface Investment {
  id: string;
  userId: string;
  name: string;
  isin?: string;
  ticker?: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  currency: Currency;
  category: 'ETF' | 'azione' | 'obbligazione' | 'liquidita' | 'altro';
  lastUpdatedAt: Date;
  createdAt: Date;
}

export interface PAC {
  id: string;
  userId: string;
  investmentId: string;
  monthlyAmount: number;
  frequency: 'mensile' | 'trimestrale';
  startDate: Date;
  active: boolean;
  currency: Currency;
  createdAt: Date;
}

// -------------------------------------------------------
// SNAPSHOT MENSILE
// -------------------------------------------------------

export interface Snapshot {
  id: string;
  userId: string;
  period: string;          // 'YYYY-MM'
  status: SnapshotStatus;
  totalNetWorth: number;
  liquidAssets: number;
  investmentValue: number;
  mortgageBalance: number;
  currency: Currency;
  closedAt?: Date;
  createdAt: Date;
}

// -------------------------------------------------------
// AUDIT TRAIL
// -------------------------------------------------------

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'snapshot_open'
  | 'snapshot_close';

export interface AuditEntry {
  id: string;
  userId: string;
  entityType: string;      // es. 'payslip', 'investment', 'snapshot'
  entityId: string;
  action: AuditAction;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  performedAt: Date;
  source: 'user' | 'system' | 'agent';
}

// -------------------------------------------------------
// KINDERGARTEN
// -------------------------------------------------------

export interface KindergartenExpense {
  id: string;
  userId: string;
  period: string;          // 'YYYY-MM'
  description: string;
  amount: number;
  category: 'retta' | 'extra' | 'rimborso' | 'altro';
  currency: Currency;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
