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

const CACHE_COLLECTION = "isin_mappings";
const CACHE_VALIDITY_DAYS = 7;
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY;

/**
 * Maps OpenFIGI exchange codes to Yahoo Finance ticker suffixes.
 * Only EUR-denominated exchanges are listed - if exchange is not here,
 * we skip it rather than risk getting a non-EUR price.
 */
const EXCHANGE_TO_YAHOO_SUFFIX: Record<string, string> = {
  XETRA: ".DE",
  MIL:   ".MI",
  PAR:   ".PA",
  AMS:   ".AS",
  BME:   ".MC",
  HEL:   ".HE",
  LIS:   ".LS",
  VIE:   ".VI",
  ATH:   ".AT",
  BRU:   ".BR",
  // LSE and SIX intentionally excluded: GBP and CHF
};

// ============================================================
// CACHE
// ============================================================

interface CachedMapping {
  isin?: string;
  ticker?: string;
  name?: string;
  source?: string;
  lastPrice?: number;
  currency?: string;
  lastVerified?: Timestamp;
  failureCount?: number;
}

async function getFromCache(key: string): Promise<CachedMapping | null> {
  try {
    const db = getFirestore();
    const doc = await db.collection(CACHE_COLLECTION).doc(key).get();
    if (!doc.exists) return null;
    const data = doc.data() as CachedMapping;
    const lastVerified = data.lastVerified as Timestamp | undefined;
    if (!lastVerified) return data;
    const ageMs = Date.now() - lastVerified.toMillis();
    const validMs = CACHE_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
    if (ageMs < validMs) {
      console.log(`Cache hit for ${key} (age: ${Math.round(ageMs / 3600000)}h)`);
      return data;
    }
    console.log(`Cache expired for ${key}`);
    return null;
  } catch (e) {
    console.error("Cache read error:", e);
    return null;
  }
}

async function saveToCache(key: string, priceData: PriceResult, ticker?: string): Promise<void> {
  if (priceData.currency !== "EUR") {
    console.log(`Not caching non-EUR price (${priceData.currency})`);
    return;
  }
  try {
    const db = getFirestore();
    await db.collection(CACHE_COLLECTION).doc(key).set(
      {
        isin: key,
        ticker: ticker || priceData.symbol || null,
        name: priceData.name || null,
        source: priceData.source,
        lastVerified: Timestamp.now(),
        lastPrice: priceData.price,
        currency: priceData.currency,
        failureCount: 0,
      },
      { merge: true }
    );
    console.log(`Cache saved for ${key}`);
  } catch (e) {
    console.error("Cache write error:", e);
  }
}

// ============================================================
// OPENFIGI - official ISIN -> ticker resolution
// ============================================================

interface FIGIResult {
  ticker: string;
  exchCode: string;
  name?: string;
}

async function findTickerViaOpenFIGI(isin: string): Promise<FIGIResult | null> {
  try {
    const response = await fetch("https://api.openfigi.com/v3/mapping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ idType: "ID_ISIN", idValue: isin }]),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const results: FIGIResult[] = data?.[0]?.data;
    if (!results?.length) return null;

    // Prefer a result whose exchange has a known EUR suffix
    const eurResult = results.find((r) => EXCHANGE_TO_YAHOO_SUFFIX[r.exchCode] !== undefined);
    return eurResult || results[0];
  } catch (e) {
    console.error("OpenFIGI error:", e);
    return null;
  }
}

// ============================================================
// YAHOO FINANCE
// ============================================================

async function tryYahooTicker(ticker: string, isin: string): Promise<PriceResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const result = data.chart?.result?.[0];
    const meta = result?.meta;
    const closes = result?.indicators?.quote?.[0]?.close?.filter((p: number | null) => p !== null);
    if (!meta) return null;
    const price = (closes?.length ? closes[closes.length - 1] : null) ?? meta.regularMarketPrice;
    const currency: string = meta.currency;
    if (!price || !currency) return null;
    return {
      isin,
      symbol: ticker,
      price,
      currency,
      name: meta.longName || meta.shortName || undefined,
      source: "Yahoo Finance",
      fetchedAt: Timestamp.now(),
    };
  } catch {
    return null;
  }
}

async function fetchFromYahooByISIN(isin: string, cachedTicker?: string): Promise<PriceResult | null> {
  let ticker = cachedTicker || null;

  if (!ticker) {
    const figi = await findTickerViaOpenFIGI(isin);
    if (figi) {
      const suffix = EXCHANGE_TO_YAHOO_SUFFIX[figi.exchCode] ?? "";
      ticker = `${figi.ticker}${suffix}`;
      console.log(`OpenFIGI: ${isin} -> ${ticker} (${figi.exchCode})`);
    }
  }

  if (!ticker) {
    console.log(`No ticker found for ${isin}`);
    return null;
  }

  const result = await tryYahooTicker(ticker, isin);
  if (result?.currency === "EUR") return result;

  // Try other EUR exchange suffixes on the base symbol
  const base = ticker.split(".")[0];
  for (const suffix of Object.values(EXCHANGE_TO_YAHOO_SUFFIX)) {
    if (ticker.endsWith(suffix)) continue;
    const candidate = `${base}${suffix}`;
    const r = await tryYahooTicker(candidate, isin);
    if (r?.currency === "EUR") {
      console.log(`Yahoo EUR found at ${candidate}`);
      return r;
    }
  }

  if (result) {
    console.log(`Yahoo found ${ticker} but currency is ${result.currency} (not EUR) - rejected`);
  }
  return null;
}

async function fetchFromYahooByTicker(ticker: string): Promise<PriceResult | null> {
  const result = await tryYahooTicker(ticker, ticker);
  if (result?.currency === "EUR") {
    console.log(`Yahoo (ticker-only): ${ticker} -> ${result.price} EUR`);
    return result;
  }
  if (result) {
    console.log(`Yahoo: ${ticker} found but currency ${result.currency} != EUR - rejected`);
  }
  return null;
}

// ============================================================
// FINANCIAL TIMES
// ============================================================

async function fetchFromFinancialTimes(isin: string): Promise<PriceResult | null> {
  try {
    const url = `https://markets.ft.com/data/funds/tearsheet/summary?s=${isin}:EUR`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const html = await response.text();

    // NOTE: use RegExp constructor to avoid TypeScript double-escaping \d in regex literals
    const patterns = [
      new RegExp('mod-ui-data-list__value"?>([\\d,.]+)<\\/span>', "i"),
      new RegExp("Price \\(EUR\\)[^>]*>([\\d,.]+)<", "i"),
      new RegExp('<span[^>]*class="[^"]*mod-ui-data-list__value[^"]*"[^>]*>([\\d,.]+)<\\/span>', "i"),
      new RegExp('"lastPrice":"([\\d,.]+)"', "i"),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const price = parseFloat(match[1].replace(",", ""));
        if (price > 0 && price < 100000) {
          const nameMatch =
            html.match(/<h1[^>]*class="[^"]*mod-ui-page-title[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
            html.match(/<title>([^<]+)<\/title>/i);
          const name = nameMatch ? nameMatch[1].replace(" | FT Markets Data", "").trim() : undefined;
          console.log(`Financial Times: ${isin} -> ${price} EUR`);
          return { isin, price, currency: "EUR", name, source: "Financial Times", fetchedAt: Timestamp.now() };
        }
      }
    }
    console.log(`Financial Times: no price found in HTML for ${isin}`);
    return null;
  } catch (e) {
    console.error("FT error:", e);
    return null;
  }
}

// ============================================================
// ALPHA VANTAGE
// ============================================================

async function fetchFromAlphaVantage(isin: string): Promise<PriceResult | null> {
  if (!ALPHA_VANTAGE_KEY) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${isin}&apikey=${ALPHA_VANTAGE_KEY}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const data = await response.json();
    const quote = data["Global Quote"];
    if (quote?.["05. price"]) {
      // Alpha Vantage does not reliably return currency - reject until confirmed EUR
      console.log(`Alpha Vantage: price found but currency unconfirmed - skipped`);
    }
    return null;
  } catch (e) {
    console.error("Alpha Vantage error:", e);
    return null;
  }
}

// ============================================================
// CORE INTERNAL LOGIC
// ============================================================

export async function fetchPriceInternal(isin: string): Promise<PriceResult | null> {
  const db = getFirestore();
  const key = isin.toUpperCase();

  // 1. Valid cache
  const cached = await getFromCache(key);
  if (cached?.lastPrice && cached.currency === "EUR") {
    return {
      isin: key,
      symbol: cached.ticker || undefined,
      price: cached.lastPrice,
      currency: "EUR",
      name: cached.name || undefined,
      source: cached.source || "cache",
      fetchedAt: cached.lastVerified || Timestamp.now(),
    };
  }

  // Stale doc for fallback + cached ticker hint
  const staleDoc = await db.collection(CACHE_COLLECTION).doc(key).get();
  const staleData: CachedMapping | null = staleDoc.exists ? (staleDoc.data() as CachedMapping) : null;
  const cachedTicker = staleData?.ticker || undefined;

  // 2. Financial Times (works natively with ISIN for LU/IT funds)
  let result: PriceResult | null = await fetchFromFinancialTimes(key);

  // 3. Alpha Vantage
  if (!result) result = await fetchFromAlphaVantage(key);

  // 4. Yahoo Finance via OpenFIGI (works well for IE/DE/FR ETFs)
  if (!result) result = await fetchFromYahooByISIN(key, cachedTicker);

  if (result) {
    await saveToCache(key, result, result.symbol);
    return result;
  }

  // 5. Expired cache fallback
  if (staleData?.lastPrice && staleData.currency === "EUR") {
    console.warn(`All sources failed for ${key} - using expired cache`);
    return {
      isin: key,
      symbol: staleData.ticker || undefined,
      price: staleData.lastPrice,
      currency: "EUR",
      name: staleData.name || undefined,
      source: "cache (expired fallback)",
      fetchedAt: staleData.lastVerified || Timestamp.now(),
    };
  }

  return null;
}

export async function fetchPriceByTickerInternal(ticker: string): Promise<PriceResult | null> {
  const db = getFirestore();
  const key = `ticker:${ticker.toUpperCase()}`;

  // 1. Valid cache
  const cached = await getFromCache(key);
  if (cached?.lastPrice && cached.currency === "EUR") {
    return {
      isin: ticker,
      symbol: ticker,
      price: cached.lastPrice,
      currency: "EUR",
      name: cached.name || undefined,
      source: cached.source || "cache",
      fetchedAt: cached.lastVerified || Timestamp.now(),
    };
  }

  const staleDoc = await db.collection(CACHE_COLLECTION).doc(key).get();
  const staleData: CachedMapping | null = staleDoc.exists ? (staleDoc.data() as CachedMapping) : null;

  // 2. Yahoo direct
  const result = await fetchFromYahooByTicker(ticker);

  if (result) {
    await saveToCache(key, result, ticker);
    return result;
  }

  // 3. Expired cache fallback
  if (staleData?.lastPrice && staleData.currency === "EUR") {
    console.warn(`Yahoo failed for ticker ${ticker} - using expired cache`);
    return {
      isin: ticker,
      symbol: ticker,
      price: staleData.lastPrice,
      currency: "EUR",
      name: staleData.name || undefined,
      source: "cache (expired fallback)",
      fetchedAt: staleData.lastVerified || Timestamp.now(),
    };
  }

  return null;
}

// ============================================================
// HTTP ENDPOINT
// ============================================================

/**
 * getPriceByISIN - Cloud Function HTTP endpoint
 *
 * Mode 1 (ISIN):       GET ?isin=IE00B4L5Y983&shares=10
 * Mode 2 (tickerOnly): GET ?ticker=BTC-EUR&tickerOnly=true&shares=0.5
 *
 * - Financial Times handles LU/IT funds natively via ISIN (no ticker needed)
 * - Yahoo Finance + OpenFIGI handles IE/DE/FR ETFs
 * - Results cached in Firestore (isin_mappings) for 7 days
 * - Only accepts EUR prices - no conversions
 * - Zero hardcoded tickers - add any new asset without deploy
 */
export const getPriceByISIN = onRequest(async (req, res) => {
  await new Promise((resolve) => cors(req, res, resolve));

  const isin      = (req.query.isin    as string | undefined || req.body?.isin)?.toUpperCase()?.trim();
  const ticker    = (req.query.ticker  as string | undefined || req.body?.ticker)?.trim();
  const tickerOnly = req.query.tickerOnly === "true" || req.body?.tickerOnly === true;
  const sharesRaw  = req.query.shares as string | undefined || req.body?.shares;
  const shares     = parseFloat(sharesRaw || "1") || 1;

  if (!isin && !ticker) {
    res.status(400).send({ success: false, error: "ISIN o ticker obbligatorio" });
    return;
  }
  if (tickerOnly && !ticker) {
    res.status(400).send({ success: false, error: "ticker obbligatorio quando tickerOnly=true" });
    return;
  }

  try {
    let result: PriceResult | null = null;

    if (tickerOnly && ticker) {
      result = await fetchPriceByTickerInternal(ticker);
    } else if (isin) {
      result = await fetchPriceInternal(isin);
    }

    if (!result) {
      const id = tickerOnly ? `ticker ${ticker}` : `ISIN ${isin}`;
      res.status(404).send({ success: false, error: `Prezzo non trovato per ${id}` });
      return;
    }

    const currentValue = parseFloat((result.price * shares).toFixed(6));

    res.status(200).send({
      success: true,
      isin:   isin   || null,
      ticker: ticker || result.symbol || null,
      price:  result.price,
      currency: result.currency,
      name:   result.name   || null,
      source: result.source,
      shares,
      currentValue,
      timestamp:      result.fetchedAt,
      lastUpdateTime: result.fetchedAt,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("getPriceByISIN error:", error);
    res.status(500).send({ success: false, error: message || "Internal Server Error" });
  }
});
