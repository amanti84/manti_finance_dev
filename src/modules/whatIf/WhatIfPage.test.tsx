import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WhatIfPage } from './WhatIfPage'
import { useAuth } from '../../hooks/useAuth'
import * as whatIfService from '../../services/whatIf'
import * as snapshotService from '../../services/snapshot'
import { BrowserRouter } from 'react-router-dom'
import type { Mock } from 'vitest'

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
    ;(useAuth as Mock).mockReturnValue({ user: mockUser })
    ;(snapshotService.listSnapshots as Mock).mockResolvedValue([
      { id: '2026-05', patrimonioNetto: 50000 },
    ])
    ;(whatIfService.getSavedScenarios as Mock).mockResolvedValue({
      success: true,
      data: [],
    })
  })

  it('renders the page heading', () => {
    render(
      <BrowserRouter>
        <WhatIfPage />
      </BrowserRouter>
    )
    expect(screen.getByRole('heading', { name: /what-if engine/i })).toBeDefined()
    expect(screen.getByRole('heading', { name: /nuova simulazione/i })).toBeDefined()
  })

  it('shows simulation results after clicking Simula', async () => {
    ;(whatIfService.simulateScenario as Mock).mockResolvedValue({
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

    const simButton = screen.getByRole('button', { name: /simula/i })
    fireEvent.click(simButton)

    expect(await screen.findByText('Simulated output')).toBeDefined()
    expect(screen.getByText(/60.*000/)).toBeDefined()
  })
})
