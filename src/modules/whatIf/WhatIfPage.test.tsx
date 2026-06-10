import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhatIfPage } from './WhatIfPage'
import { useAuth } from '../../hooks/useAuth'
import * as mutuoService from '../../services/mutuo'
import * as investmentService from '../../services/investment'
import * as previdenzaService from '../../services/previdenza'
import type { Mock } from 'vitest'

// Mock services
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../services/mutuo', () => ({
  getMutuoConfig: vi.fn(),
}))

vi.mock('../../services/investment', () => ({
  getAllInvestments: vi.fn(),
}))

vi.mock('../../services/previdenza', () => ({
  getPrevidenzaConfig: vi.fn(),
  getAllPensionFunds: vi.fn(),
}))

// Mock Recharts to avoid issues in test environment
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Line: () => <div />,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  Cell: () => <div />,
}))

describe('WhatIfPage', () => {
  const mockUser = { uid: 'user123', email: 'test@example.com' }

  beforeEach(() => {
    vi.clearAllMocks()

    // Stub environment variables to avoid Firebase config error
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'mock-api-key')
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'mock-auth-domain')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'mock-project-id')
    vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'mock-storage-bucket')
    vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'mock-sender-id')
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'mock-app-id')

    ;(useAuth as Mock).mockReturnValue({ user: mockUser })
    ;(mutuoService.getMutuoConfig as Mock).mockResolvedValue({
      success: true,
      data: {
        debitoResiduo: 100000,
        tasso: 3,
        rataMensile: 500,
        dataInizio: '2020-01-01',
        dataFine: '2040-01-01',
        importoOriginale: 150000,
        isMutuoVariabile: false,
      },
    })
    ;(investmentService.getAllInvestments as Mock).mockResolvedValue({
      success: true,
      data: [],
    })
    ;(previdenzaService.getPrevidenzaConfig as Mock).mockResolvedValue({
      success: true,
      data: null,
    })
    ;(previdenzaService.getAllPensionFunds as Mock).mockResolvedValue({
      success: true,
      data: [],
    })
  })

  it('renders the page heading and tabs', () => {
    render(<WhatIfPage />)

    expect(screen.getByText(/What-If Scenarios/i)).toBeDefined()
    // Multiple elements (tabs + mobile select)
    expect(screen.getAllByText(/Anticipo Mutuo/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Variazione PAC/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Ribilanciamento/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Pensione Anticipata/i).length).toBeGreaterThan(0)
  })

  it('initially shows the mortgage scenario', async () => {
    render(<WhatIfPage />)

    // Using findByText because of the async data loading and Skeleton
    expect(await screen.findByText(/Importo da anticipare/i)).toBeDefined()
    expect(screen.getByText(/Strategia/i)).toBeDefined()
  })
})
