import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// Mock utility BEFORE other imports
vi.mock('../utils/config', () => ({
  getFirebaseConfig: vi.fn(() => ({
    apiKey: 'test-key',
    authDomain: 'test-auth',
    projectId: 'test-project',
    storageBucket: 'test-storage',
    messagingSenderId: 'test-sender',
    appId: 'test-app',
  }))
}));

import { render, screen, configure } from '@testing-library/react';

// Increase default timeout for waitFor
configure({ asyncUtilTimeout: 10000 });

import DashboardPage from './DashboardPage';
import { useAuth } from '../hooks/useAuth';
import { getPayslips } from '../services/payroll';
import { getAllPacPayments } from '../services/pac';
import { getAccounts, getRecurringExpenses } from '../services/cashflow';
import { getAllInvestments } from '../services/investment';
import { getMutuoConfig } from '../services/mutuo';
import { getActiveAlerts, evaluateAlerts, markAlertRead } from '../services/alert';
import { BrowserRouter } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import type { FinancialAlert } from '../types';

// Mock all services
vi.mock('../hooks/useAuth');
vi.mock('../services/payroll');
vi.mock('../services/pac');
vi.mock('../services/cashflow');
vi.mock('../services/investment');
vi.mock('../services/mutuo');
vi.mock('../services/alert');

// Mock components that might trigger complex nested fetches
vi.mock('../modules/decisionEngine', () => ({
  DecisionWidget: () => <div data-testid="mock-decision-widget">Decision Widget</div>
}));
vi.mock('../modules/goals', () => ({
  GoalWidget: () => <div data-testid="mock-goal-widget">Goal Widget</div>
}));

const mockUser = { uid: 'test-user', email: 'test@example.com' };

describe('DashboardPage', () => {
  // Increase Vitest timeout for this suite
  vi.setConfig({ testTimeout: 30000 });

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as Mock).mockReturnValue({ user: mockUser });
    (evaluateAlerts as Mock).mockResolvedValue({ success: true });
    (getActiveAlerts as Mock).mockResolvedValue({ success: true, data: [] });
    (markAlertRead as Mock).mockResolvedValue({ success: true });

    // Set default empty responses for data services to avoid unhandled rejections
    (getPayslips as Mock).mockResolvedValue({ success: true, data: [] });
    (getAllPacPayments as Mock).mockResolvedValue({ success: true, data: [] });
    (getAccounts as Mock).mockResolvedValue({ success: true, data: [] });
    (getRecurringExpenses as Mock).mockResolvedValue({ success: true, data: [] });
    (getAllInvestments as Mock).mockResolvedValue({ success: true, data: [] });
    (getMutuoConfig as Mock).mockResolvedValue({ success: false, error: 'Configurazione mutuo non trovata' });
  });

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );
  };

  it('shows loading state initially (skeletons)', () => {
    // Delay resolution to catch loading state
    (getAccounts as Mock).mockReturnValue(new Promise(() => { /* Never resolves */ }));

    renderDashboard();

    // Skeletons are rendered during loading
    const skeletons = screen.getAllByRole('generic').filter(el =>
      el.className.includes('animate-pulse')
    );
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders all cards with real data (success path)', async () => {
    // Setup mocks with data
    (getPayslips as Mock).mockResolvedValue({
      success: true,
      data: [
        { netSalary: 2500, month: 5, year: 2026, id: 'p1', parsed: true, grossSalary: 3500, irpef: 500, inps: 300, tfr: 200, fondoPensione: 0 },
        { netSalary: 2000, month: 4, year: 2026, id: 'p2', parsed: true, grossSalary: 3000, irpef: 400, inps: 200, tfr: 200, fondoPensione: 0 }
      ]
    });
    (getAllPacPayments as Mock).mockResolvedValue({
      success: true,
      data: [{ importo: 500, id: 'pac1' }, { importo: 500, id: 'pac2' }]
    });
    (getAccounts as Mock).mockResolvedValue({
      success: true,
      data: [{ currentBalance: 10000, id: 'acc1', name: 'Conto 1' }]
    });
    (getRecurringExpenses as Mock).mockResolvedValue({
      success: true,
      data: [{ amount: 1000, frequency: 'monthly', id: 'exp1', name: 'Affitto' }]
    });
    (getAllInvestments as Mock).mockResolvedValue({
      success: true,
      data: [{ currentValue: 5000, id: 'inv1', name: 'ETF World' }]
    });
    (getMutuoConfig as Mock).mockResolvedValue({
      success: true,
      data: { debitoResiduo: 100000, rataMensile: 500 }
    });

    renderDashboard();

    // Verify real data is displayed
    await screen.findByTestId('net-worth-value');
    await screen.findByTestId('last-payslip-value');
    await screen.findByTestId('pac-total-value');
    await screen.findByTestId('available-balance-value');

    // Values check (regex for formatted strings)
    expect(screen.getByTestId('net-worth-value').textContent).toMatch(/85.*000/);
    expect(screen.getByTestId('last-payslip-value').textContent).toMatch(/2.*500/);
    expect(screen.getByTestId('pac-total-value').textContent).toMatch(/1.*000/);
    expect(screen.getByTestId('available-balance-value').textContent).toMatch(/9.*000/);

    // Trend: ((2500-2000)/2000)*100 = 25%
    expect(screen.getByText(/25.*0%/)).toBeTruthy();
  });

  it('renders empty states when no data is available', async () => {
    renderDashboard();

    // Use findBy for empty states
    expect(await screen.findByText(/Nessun cedolino/i)).toBeTruthy();
    expect(await screen.findByText(/Nessun PAC/i)).toBeTruthy();
    expect(await screen.findByText(/Nessun conto/i)).toBeTruthy();
    expect(await screen.findByText(/Nessun dato/i)).toBeTruthy(); // Net Worth
  });

  it('shows "Dati parziali" badge when some net worth sources fail', async () => {
    (getAccounts as Mock).mockResolvedValue({ success: false, error: 'API Error' });
    (getAllInvestments as Mock).mockResolvedValue({ success: true, data: [{ currentValue: 5000, id: 'i1' }] });
    (getMutuoConfig as Mock).mockResolvedValue({ success: true, data: { debitoResiduo: 0 } });

    renderDashboard();

    expect(await screen.findByText(/Dati parziali/i)).toBeTruthy();
    const netWorthEl = await screen.findByTestId('net-worth-value');
    expect(netWorthEl.textContent).toMatch(/5.*000/);
  });

  it('renders alerts when available', async () => {
    const mockAlert: Partial<FinancialAlert> = {
      id: 'a1',
      type: 'SALDO_SOTTO_SOGLIA',
      severity: 'critical',
      message: 'Attenzione saldo basso',
      read: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    (getActiveAlerts as Mock).mockResolvedValue({ success: true, data: [mockAlert as FinancialAlert] });

    renderDashboard();

    // Diagnostic: Wait for any alert-related text
    const bannerText = await screen.findByText(/alert critici/i, {}, { timeout: 15000 });
    expect(bannerText).toBeTruthy();

    // Check for the specific alert message in the banner
    const bannerAlerts = screen.getAllByText(/Attenzione saldo basso/i);
    expect(bannerAlerts.length).toBeGreaterThan(0);

    // Check for the alert type in the list
    const listAlerts = screen.getAllByText(/SALDO SOTTO SOGLIA/i);
    expect(listAlerts.length).toBeGreaterThan(0);
  });
});
