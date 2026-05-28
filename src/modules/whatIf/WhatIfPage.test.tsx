import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WhatIfPage } from './WhatIfPage'
import { useAuth } from '../../hooks/useAuth'
import * as whatIfService from '../../services/whatIf'
import * as snapshotService from '../../services/snapshot'
import { BrowserRouter } from 'react-router-dom'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../services/whatIf', () => ({
  simulateScenario: vi.fn(),
  saveScenario: vi.fn(),
  getSavedScenarios: vi.fn(),
  deleteScenario: vi.fn(),
}))

vi.mock('../../services/snapshot', () => ({
  listSnapshots: vi.fn(),
}))

describe('WhatIfPage', () => {
  const mockUser = { uid: 'user123', email: 'test@example.com' }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as any).mockReturnValue({ user: mockUser })
    ;(snapshotService.listSnapshots as any).mockResolvedValue([
      { id: '2026-05', patrimonioNetto: 50000 },
    ])
    ;(whatIfService.getSavedScenarios as any).mockResolvedValue({
      success: true,
      data: [],
    })
  })

  it('renders the page heading', async () => {
    render(
      <BrowserRouter>
        <WhatIfPage />
      </BrowserRouter>
    )
    expect(screen.getByText('What-if Engine')).toBeDefined()
    expect(screen.getByText('Nuova Simulazione')).toBeDefined()
  })

  it('shows simulation results after clicking Simula', async () => {
    ;(whatIfService.simulateScenario as any).mockResolvedValue({
      success: true,
      data: {
        patrimonioProiettato: 60000,
        surplusMensileProiettato: 500,
        costoOpportunita: 100,
        descrizione: 'Simulated output',
      },
    })

    render(
      <BrowserRouter>
        <WhatIfPage />
      </BrowserRouter>
    )

    const simButton = screen.getByText('Simula')
    fireEvent.click(simButton)

    expect(await screen.findByText('Simulated output')).toBeDefined()
    // Use flexible matcher for formatted numbers
    expect(screen.getByText(/60.*000/)).toBeDefined()
  })
})
