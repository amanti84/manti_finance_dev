import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase
vi.mock('../../firebase', () => ({
  db: {},
  auth: {},
  storage: {},
  default: {},
}))

import { render, screen, fireEvent } from '@testing-library/react'
import { MutuoPage } from './MutuoPage'
import * as useMutuoHook from '../../hooks/useMutuo'
import type { UseMutuoReturn } from '../../hooks/useMutuo'
import { Timestamp } from 'firebase/firestore'

vi.mock('../../hooks/useMutuo')

describe('MutuoPage', () => {
  const mockConfig = {
    importoOriginale: 200000,
    debitoResiduo: 150000,
    rataMensile: 1000,
    tasso: 2.5,
    dataInizio: Timestamp.fromDate(new Date('2020-01-01')),
    dataFine: Timestamp.fromDate(new Date('2040-01-01')),
    isMutuoVariabile: false,
    banca: 'Banca Test'
  }

  const mockSummary = {
    debitoResiduo: 150000,
    importoPagato: 50000,
    interessiPagati: 10000,
    percentualeRimborso: 25,
    rateRimanenti: 240,
    ratePagate: 120,
    rataTotale: 1000,
    prossimaRata: new Date('2026-07-01'),
    scadenza: new Date('2040-01-01')
  }

  const mockPiano = {
    rate: [
      {
        numero: 1,
        data: new Date('2020-02-01'),
        rataTotale: 1000,
        quotaCapitale: 800,
        quotaInteressi: 200,
        debitoResiduo: 199200
      }
    ],
    config: mockConfig
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useMutuoHook.useMutuo).mockReturnValue({
      config: mockConfig,
      piano: mockPiano,
      summary: mockSummary,
      loading: false,
      error: null,
      saveConfig: vi.fn(),
      updateResidual: vi.fn(),
      refresh: vi.fn(),
    } as unknown as UseMutuoReturn)
  })

  it('should render KPIs and title correctly (happy path)', () => {
    render(<MutuoPage />)

    expect(screen.getByText('Mutuo Immobiliare')).toBeDefined()
    expect(screen.getByText('Banca Test')).toBeDefined()
    // Debito Residuo appears in KPI and Table header
    expect(screen.getAllByText('Debito Residuo').length).toBeGreaterThanOrEqual(1)
    // Flexible matcher for currency formatting
    expect(screen.getAllByText(/150\.000,00/)).toBeDefined()
  })

  it('should show empty state when no config (edge case)', () => {
    vi.mocked(useMutuoHook.useMutuo).mockReturnValue({
      config: null,
      piano: null,
      summary: null,
      loading: false,
      error: null,
      saveConfig: vi.fn(),
      updateResidual: vi.fn(),
      refresh: vi.fn(),
    })

    render(<MutuoPage />)

    expect(screen.getByText('Nessun mutuo configurato')).toBeDefined()
    const configButton = screen.getByRole('button', { name: /^Configura Mutuo$/i })
    expect(configButton).toBeDefined()

    fireEvent.click(configButton)
    expect(screen.getByRole('heading', { name: /^Configura Mutuo$/i })).toBeDefined()
  })

  it('should show error state (error handling)', () => {
    vi.mocked(useMutuoHook.useMutuo).mockReturnValue({
      config: null,
      piano: null,
      summary: null,
      loading: false,
      error: 'Fetch error',
      saveConfig: vi.fn(),
      updateResidual: vi.fn(),
      refresh: vi.fn(),
    })

    render(<MutuoPage />)

    expect(screen.getByText(/Fetch error/i)).toBeDefined()
  })

  it('should open edit modal when clicking edit button', () => {
    render(<MutuoPage />)

    // Be more specific since there are multiple buttons with "Modifica"
    const editButton = screen.getByRole('button', { name: /^Modifica$/i })
    fireEvent.click(editButton)

    expect(screen.getByRole('heading', { name: /Modifica Mutuo/i })).toBeDefined()
    expect(screen.getByDisplayValue('Banca Test')).toBeDefined()
  })
})
