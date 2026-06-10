import { useState, useMemo } from 'react'
import type { FC } from 'react'
import { Input } from './Input'
import { Button } from './Button'
import { Card, CardContent } from './Card'
import { Badge } from './Badge'
import { isValidISIN, formatISIN, getPriceByISIN, getUpdateFrequency } from '../../services/isin'
import type { PriceData } from '../../types'

interface ISINPickerFieldProps {
  isin: string
  ticker: string
  tickerOnly: boolean
  onISINChange: (isin: string) => void
  onTickerChange: (ticker: string) => void
  onTickerOnlyChange: (tickerOnly: boolean) => void
  onPriceResolved?: (price: number, currency: string, name: string) => void
  disabled?: boolean
}

export const ISINPickerField: FC<ISINPickerFieldProps> = ({
  isin,
  ticker,
  tickerOnly,
  onISINChange,
  onTickerChange,
  onTickerOnlyChange,
  onPriceResolved,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resolvedData, setResolvedData] = useState<PriceData | null>(null)

  const isinError = useMemo(() => {
    if (!isin || tickerOnly) return null
    return isValidISIN(isin) ? null : 'Formato ISIN non valido (es. IE00B4L5Y983)'
  }, [isin, tickerOnly])

  const handleSearch = async () => {
    setError(null)
    setResolvedData(null)
    setLoading(true)

    try {
      const result = await getPriceByISIN(
        tickerOnly ? null : formatISIN(isin),
        0,
        ticker || null,
        tickerOnly
      )

      if (result.success) {
        setResolvedData(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la ricerca')
    } finally {
      setLoading(false)
    }
  }

  const handleUseData = () => {
    if (resolvedData && onPriceResolved) {
      onPriceResolved(resolvedData.price, resolvedData.currency, resolvedData.name)
      if (resolvedData.ticker && !tickerOnly) {
        onTickerChange(resolvedData.ticker)
      }
      setResolvedData(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <input
          id="tickerOnly"
          type="checkbox"
          checked={tickerOnly}
          onChange={(e) => {
            onTickerOnlyChange(e.target.checked)
            setError(null)
            setResolvedData(null)
          }}
          disabled={disabled || loading}
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
        />
        <label htmlFor="tickerOnly" className="text-sm font-medium cursor-pointer">
          Usa solo Ticker (Crypto, ecc.)
        </label>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-end">
        {!tickerOnly ? (
          <div className="flex-1">
            <Input
              label="Codice ISIN"
              placeholder="es. IE00B4L5Y983"
              value={isin}
              onChange={(e) => onISINChange(e.target.value.toUpperCase())}
              error={isinError ?? undefined}
              disabled={disabled || loading}
            />
          </div>
        ) : (
          <div className="flex-1">
            <Input
              label="Ticker"
              placeholder="es. BTC-USD, ETH-USD"
              value={ticker}
              onChange={(e) => onTickerChange(e.target.value)}
              helperText="Hint: es. BTC-USD, ETH-USD per Yahoo Finance"
              disabled={disabled || loading}
            />
          </div>
        )}

        <Button
          type="button"
          onClick={handleSearch}
          disabled={disabled || loading || (!tickerOnly && (!!isinError || !isin)) || (tickerOnly && !ticker)}
          isLoading={loading}
          className="md:mb-0.5"
        >
          Cerca
        </Button>
      </div>

      {error && (
        <div className="mt-2">
          <Badge variant="error">{error}</Badge>
        </div>
      )}

      {resolvedData && (
        <Card className="mt-4 border-success/30 bg-success/5 animate-in fade-in slide-in-from-top-2">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-success flex items-center gap-1">
                  ✅ {resolvedData.name}
                </p>
                <p className="text-sm text-text-muted">
                  Prezzo: <span className="font-semibold text-text">{resolvedData.price.toFixed(4)} {resolvedData.currency}</span>
                  {resolvedData.ticker && (
                    <> | Ticker: <span className="font-semibold text-text">{resolvedData.ticker}</span></>
                  )}
                  {resolvedData.source && (
                    <> | Fonte: <span className="font-semibold text-text">{resolvedData.source}</span></>
                  )}
                </p>
                {!tickerOnly && isin && (
                   <p className="text-xs text-text-muted mt-1">
                     Aggiornamento: {getUpdateFrequency(isin)}
                   </p>
                )}
              </div>
              <Button size="sm" variant="secondary" onClick={handleUseData}>
                Usa questi dati
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
