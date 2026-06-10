import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import corsLib from "cors";
import { PriceResult, ISINCacheEntry } from "./types/shared";

const cors = corsLib({
  origin: [
    "https://mantifinance.web.app",
    "https://mantifinance.firebaseapp.com",
    "http://localhost:5173",
    "http://localhost:5174",
  ],
});

const CACHE_COLLECTION = "isin_cache";
const CACHE_VALIDITY_DAYS = 7;
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY;

// EUR exchange suffixes to try in order (most common European exchanges)
const EUR_SUFFIXES = [".MI", ".AS", ".PA", ".DE", ".F", ".L", ".MC", ".SW", ""];

/**
 * Fetch EUR/XXX rate from ECB for currency conversion fallback
 */
async function getECBRate(fromCurrency: string): Promise<number | null> {
  if (fromCurrency === "EUR") return 1;
  try {
    const url = `https://data-api.ecb.europa.eu/service/data/EXR/D.${fromCurrency}.EUR.SP00.A?lastNObservations=1&format=jsondata`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const data = await response.json();
    const obs = data?.dataSets?.[0]?.series?.["0:0:0:0:0"]?.observations;
    if (!obs) return null;
    const keys = Object.keys(obs).sort();
    const rate = obs[keys[keys.length - 1]]?.[0];
    return rate ? parseFloat(rate) : null;
  } catch {
    return null;
  }
}

/**
 * Try fetching price for a specific ticker from Yahoo Finance
 * Returns PriceResult with actual currency (not forced to EUR)
 */
async function tryYahooTicker(ticker: string, isin: string): Promise<PriceResult | null> {
  try {
    if (!ticker) return null;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (result?.meta) {
      const price = result.meta.regularMarketPrice;
      const currency = result.meta.currency;
      const name = result.meta.longName || result.meta.shortName || ticker;
      if (price && currency) {
        return {
          isin,
          symbol: ticker,
          price,
          currency,
          name,
          source: "Yahoo Finance",
          fetchedAt: Timestamp.now(),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Auto-discover ticker from ISIN via Yahoo Finance Search
 * Returns the best EUR-listed ticker found, or the first result as fallback
 */
async function findTickerFromISIN(isin: string): Promise<string | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(isin)}&quotesCount=10&newsCount=0`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const quotes = data.quotes || [];
    if (quotes.length === 0) return null;

    // Prefer EUR-denominated exchanges
    const eurExchanges = ["MIL", "AMS", "PAR", "GER", "FRA", "LSE", "SWX", "MCE"];
    const eurQuote = quotes.find((q: { exchange?: string; symbol?: string }) =>
      eurExchanges.some(ex => q.exchange?.toUpperCase().includes(ex))
    );
    return (eurQuote?.symbol || quotes[0]?.symbol) ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch price from Yahoo Finance for a given ISIN
 * Strategy:
 * 1. Try auto-discovery via Yahoo Search to find the best ticker
 * 2. Try all EUR suffixes on the discovered ticker
 * 3. If price is not in EUR, attempt ECB conversion
 */
async function fetchFromYahoo(isin: string): Promise<PriceResult | null> {
  try {
    const discoveredTicker = await findTickerFromISIN(isin);
    if (!discoveredTicker) return null;

    // Try the discovered ticker as-is first
    const directResult = await tryYahooTicker(discoveredTicker, isin);
    if (directResult?.currency === "EUR") return directResult;

    // Try EUR exchange suffixes on the base symbol (strip existing suffix)
    const baseTicker = discoveredTicker.includes(".")
      ? discoveredTicker.split(".")[0]
      : discoveredTicker;

    for (const suffix of EUR_SUFFIXES) {
      if (suffix === "" && discoveredTicker.includes(".")) continue; // already tried
      const candidate = `${baseTicker}${suffix}`;
      const result = await tryYahooTicker(candidate, isin);
      if (result?.currency === "EUR") return result;
    }

    // Last resort: use best result found and try ECB conversion
    if (directResult) {
      const rate = await getECBRate(directResult.currency);
      if (rate) {
        return {
          ...directResult,
          price: parseFloat((directResult.price * rate).toFixed(6)),
          currency: "EUR",
          source: `Yahoo Finance (converted from ${directResult.currency} via ECB)`,
        };
      }
    }

    return null;
  } catch (e) {
    console.error("Yahoo fetch error:", e);
    return null;
  }
}

/**
 * Fetch price directly for a ticker (tickerOnly mode: crypto, stocks without ISIN)
 * No ISIN lookup needed — ticker is used directly
 */
async function fetchByTicker(ticker: string): Promise<PriceResult | null> {
  try {
    // Try direct ticker first
    const direct = await tryYahooTicker(ticker, ticker);
    if (direct?.currency === "EUR") return direct;

    // For non-EUR (e.g. USD crypto), try ECB conversion
    if (direct) {
      const rate = await getECBRate(direct.currency);
      if (rate) {
        return {
          ...direct,
          isin: ticker,
          price: parseFloat((direct.price * rate).toFixed(6)),
          currency: "EUR",
          source: `Yahoo Finance (converted from ${direct.currency} via ECB)`,
        };
      }
      // Return as-is if no conversion available (rare edge case)
      return { ...direct, isin: ticker };
    }

    return null;
  } catch (e) {
    console.error("fetchByTicker error:", e);
    return null;
  }
}

/**
 * Fetch price from Alpha Vantage (fallback for ISIN-based lookup)
 */
async function fetchFromAlphaVantage(isin: string): Promise<PriceResult | null> {
  if (!ALPHA_VANTAGE_KEY) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${isin}&apikey=${ALPHA_VANTAGE_KEY}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const data = await response.json();
    const quote = data["Global Quote"];
    if (quote?.["05. price"]) {
      const price = parseFloat(quote["05. price"]);
      return {
        isin,
        price,
        currency: "EUR",
        source: "Alpha Vantage",
        fetchedAt: Timestamp.now(),
      };
    }
    return null;
  } catch (e) {
    console.error("Alpha Vantage fetch error:", e);
    return null;
  }
}

/**
 * Fetch price from Financial Times (fallback for ISIN-based lookup)
 */
async function fetchFromFinancialTimes(isin: string): Promise<PriceResult | null> {
  try {
    const url = `https://markets.ft.com/data/etfs/tearsheet/summary?s=${isin}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const text = await response.text();
    const priceMatch = text.match(/<span class="mod-ui-data-list__value">([0-9,.]+)<\/span>/);
    const currencyMatch = text.match(/<span class="mod-ui-data-list__label">Price \(([A-Z]{3})\)<\/span>/);
    if (priceMatch && currencyMatch) {
      const price = parseFloat(priceMatch[1].replace(",", ""));
      const currency = currencyMatch[1];
      if (currency === "EUR") {
        return {
          isin,
          price,
          currency,
          source: "Financial Times",
          fetchedAt: Timestamp.now(),
        };
      }
    }
    return null;
  } catch (e) {
    console.error("FT fetch error:", e);
    return null;
  }
}

/**
 * Core internal logic for ISIN-based price fetching
 * Cascade: Cache → FT → Alpha Vantage → Yahoo (auto-discovery) → Expired Cache fallback
 */
export async function fetchPriceInternal(isin: string): Promise<ISINCacheEntry | null> {
  const db = getFirestore();
  const now = Timestamp.now();
  const cacheKey = isin.toUpperCase();

  // 1. Check valid cache
  const cacheDoc = await db.collection(CACHE_COLLECTION).doc(cacheKey).get();
  if (cacheDoc.exists) {
    const cacheData = cacheDoc.data() as ISINCacheEntry;
    const expiresAt = cacheData.expiresAt as Timestamp;
    if (expiresAt.toMillis() > now.toMillis()) {
      console.log(`📦 Cache hit for ${cacheKey}`);
      return cacheData;
    }
    console.log(`⏰ Cache expired for ${cacheKey}, refreshing...`);
  }

  // 2. Live fetch cascade
  let result: PriceResult | null = null;

  result = await fetchFromFinancialTimes(isin);
  if (!result) result = await fetchFromAlphaVantage(isin);
  if (!result) result = await fetchFromYahoo(isin);

  if (result) {
    const cacheEntry: ISINCacheEntry = {
      ...result,
      fetchedAt: now,
      expiresAt: new Timestamp(now.seconds + CACHE_VALIDITY_DAYS * 24 * 60 * 60, 0),
    };
    await db.collection(CACHE_COLLECTION).doc(cacheKey).set(cacheEntry);
    console.log(`✅ Price fetched and cached for ${cacheKey}: ${result.price} ${result.currency} (${result.source})`);
    return cacheEntry;
  }

  // 3. Fallback to expired cache rather than returning null
  if (cacheDoc.exists) {
    console.warn(`⚠️ All sources failed for ${cacheKey}, using expired cache as fallback`);
    return cacheDoc.data() as ISINCacheEntry;
  }

  return null;
}

/**
 * Core internal logic for ticker-only price fetching (crypto, stocks without ISIN)
 * Cache key = ticker. Same cascade but skips ISIN-discovery step.
 */
export async function fetchPriceByTickerInternal(ticker: string): Promise<ISINCacheEntry | null> {
  const db = getFirestore();
  const now = Timestamp.now();
  const cacheKey = `ticker:${ticker.toUpperCase()}`;

  // 1. Check valid cache
  const cacheDoc = await db.collection(CACHE_COLLECTION).doc(cacheKey).get();
  if (cacheDoc.exists) {
    const cacheData = cacheDoc.data() as ISINCacheEntry;
    const expiresAt = cacheData.expiresAt as Timestamp;
    if (expiresAt.toMillis() > now.toMillis()) {
      console.log(`📦 Cache hit for ticker ${ticker}`);
      return cacheData;
    }
    console.log(`⏰ Cache expired for ticker ${ticker}, refreshing...`);
  }

  // 2. Live fetch
  const result = await fetchByTicker(ticker);

  if (result) {
    const cacheEntry: ISINCacheEntry = {
      ...result,
      fetchedAt: now,
      expiresAt: new Timestamp(now.seconds + CACHE_VALIDITY_DAYS * 24 * 60 * 60, 0),
    };
    await db.collection(CACHE_COLLECTION).doc(cacheKey).set(cacheEntry);
    console.log(`✅ Price fetched and cached for ticker ${ticker}: ${result.price} ${result.currency} (${result.source})`);
    return cacheEntry;
  }

  // 3. Fallback to expired cache
  if (cacheDoc.exists) {
    console.warn(`⚠️ All sources failed for ticker ${ticker}, using expired cache as fallback`);
    return cacheDoc.data() as ISINCacheEntry;
  }

  return null;
}

/**
 * getPriceByISIN — Cloud Function HTTP endpoint
 *
 * Supports two modes:
 *   1. ISIN mode:       GET ?isin=IE00B4L5Y983&shares=10
 *   2. TickerOnly mode: GET ?ticker=BTC-EUR&tickerOnly=true&shares=0.5
 *
 * Auto-discovers ticker from ISIN via Yahoo Search on first call.
 * Results are cached in Firestore (isin_cache collection) for 7 days.
 * No hardcoded ticker map — fully dynamic, works with any new asset.
 */
export const getPriceByISIN = onRequest(async (req, res) => {
  await new Promise((resolve) => cors(req, res, resolve));

  const isin = (req.query.isin as string || req.body?.isin as string)?.toUpperCase()?.trim();
  const ticker = (req.query.ticker as string || req.body?.ticker as string)?.trim();
  const tickerOnly = req.query.tickerOnly === "true" || req.body?.tickerOnly === true;
  const sharesParam = parseFloat((req.query.shares as string) || (req.body?.shares as string) || "1");
  const shares = isNaN(sharesParam) ? 1 : sharesParam;

  // Validate input
  if (!isin && !ticker) {
    res.status(400).send({ success: false, error: "ISIN or ticker is required" });
    return;
  }

  if (tickerOnly && !ticker) {
    res.status(400).send({ success: false, error: "ticker is required when tickerOnly=true" });
    return;
  }

  try {
    let result: ISINCacheEntry | null = null;

    if (tickerOnly && ticker) {
      // TickerOnly mode: crypto, stocks without ISIN
      result = await fetchPriceByTickerInternal(ticker);
    } else if (isin) {
      // ISIN mode: standard ETF, funds, stocks
      result = await fetchPriceInternal(isin);
    }

    if (result) {
      const currentValue = shares > 0 ? parseFloat((result.price * shares).toFixed(6)) : result.price;
      res.status(200).send({
        success: true,
        data: {
          ...result,
          shares,
          currentValue,
          lastUpdateTime: result.fetchedAt,
        },
      });
      return;
    }

    const identifier = tickerOnly ? `ticker ${ticker}` : `ISIN ${isin}`;
    res.status(404).send({ success: false, error: `Price not found for ${identifier}` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("getPriceByISIN error:", error);
    res.status(500).send({ success: false, error: message || "Internal Server Error" });
  }
});
