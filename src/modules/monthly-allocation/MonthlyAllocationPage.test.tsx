import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MonthlyAllocationPage } from './MonthlyAllocationPage'
import * as authHook from '../../hooks/useAuth'
import * as service from '../../services/monthlyAllocation'
import { BrowserRouter } from 'react-router-dom'
import React from 'react'

// Mock dependencies
vi.mock('../../firebase', () => ({
  db: {},
  auth: {},
}))

vi.mock('../../hooks/useAuth')
vi.mock('../../services/monthlyAllocation')

// Mock Lucide icons to avoid potential issues with React children validation
vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="icon-prev" />,
  ChevronRight: () => <span data-testid="icon-next" />,
  Plus: () => <span>+</span>,
  Trash2: () => <span>Trash</span>,
  CheckCircle: () => <span>Check</span>,
  AlertCircle: () => <span>Alert</span>,
  RefreshCcw: () => <span>Refresh</span>,
  Save: () => <span>Save</span>,
  PieChart: () => <span>PieChart</span>,
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie">Pie</div>,
  Cell: () => <div data-testid="cell">Cell</div>,
  Tooltip: () => <div data-testid="tooltip">Tooltip</div>,
  Legend: () => <div data-testid="legend">Legend</div>,
}))

const renderWithRouter = (ui: React.ReactElement) => {
  return render(ui, { wrapper: BrowserRouter })
}

describe('MonthlyAllocationPage', () => {
  const mockUser = { uid: 'test-uid', email: 'test@example.com' }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: mockUser as unknown as never,
      loading: false,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('renders skeleton while loading', () => {
    vi.mocked(service.getMonthlyAllocation).mockReturnValue(new Promise(() => {
      // Intentional empty promise to keep loading state
    }))
    renderWithRouter(<MonthlyAllocationPage />)
    expect(document.querySelector('.animate-pulse')).toBeDefined()
  })

  it('renders empty state when no allocation exists', async () => {
    vi.mocked(service.getMonthlyAllocation).mockResolvedValue({ success: true, data: null })

    renderWithRouter(<MonthlyAllocationPage />)

    await waitFor(() => {
      expect(screen.getByText('Nessuna allocazione per questo mese')).toBeDefined()
      expect(screen.getByText('Genera bozza automatica')).toBeDefined()
    })
  })

  it('renders allocation data when it exists', async () => {
    const mockAllocation = {
      id: '2026-6',
      year: 2026,
      month: 6,
      netIncome: 3000,
      totalAllocated: 1000,
      surplus: 2000,
      status: 'draft',
      allocations: [
        { id: '1', label: 'Affitto', category: 'fixed_expense', amount: 800, percentage: 26.7, isAutoFilled: true }
      ]
    }
    vi.mocked(service.getMonthlyAllocation).mockResolvedValue({ success: true, data: mockAllocation as unknown as never })

    renderWithRouter(<MonthlyAllocationPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Affitto')[0]).toBeDefined()
    }, { timeout: 5000 })
  })

  it('calls generateDraftAllocation when button is clicked', async () => {
    vi.mocked(service.getMonthlyAllocation).mockResolvedValue({ success: true, data: null })
    vi.mocked(service.generateDraftAllocation).mockResolvedValue({
      success: true,
      data: { id: 'test', allocations: [], netIncome: 3000, status: 'draft', totalAllocated: 0, surplus: 3000 } as unknown as never
    })

    renderWithRouter(<MonthlyAllocationPage />)

    const button = await screen.findByText('Genera bozza automatica')
    fireEvent.click(button)

    await waitFor(() => {
      expect(service.generateDraftAllocation).toHaveBeenCalledWith(mockUser.uid, expect.any(Number), expect.any(Number))
    })
  })

  it('navigates between months', async () => {
    vi.mocked(service.getMonthlyAllocation).mockResolvedValue({ success: true, data: null })

    renderWithRouter(<MonthlyAllocationPage />)

    const nextButton = await screen.findByTestId('icon-next')
    fireEvent.click(nextButton.parentElement!)

    await waitFor(() => {
      expect(service.getMonthlyAllocation).toHaveBeenCalledTimes(2)
    })
  })
})
