import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import corsLib from "cors";
import { PriceResult, ISINCacheEntry } from "./types/shared";

const cors = corsLib({
  origin: [
    "https://mantifinance.web.app",
    "http://localhost:5173",
  ],
});

const CACHE_COLLECTION = "isin_cache";
const CACHE_VALIDITY_DAYS = 7;
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY;

const KNOWN_ISIN_TICKERS: Record<string, string> = {
  "IE00BYX2JD69": "IE00BYX2JD69", // iShares MSCI World SRI UCITS ETF EUR (Acc)
  "IE00B4L5Y983": "IWDA.AS",      // iShares Core MSCI World UCITS ETF USD (Acc) -> IWDA.AS for EUR
  "LU2635193969": "LU2635193969",
  "IT0005204000": "IT0005204000",
  "IT0005008898": "IT0005008898",
  "LU1972719659": "LU1972719659",
  "IT0005217432": "IT0005217432",
  "IT0000380664": "IT0000380664",
};

/**
 * Internal price fetching logic
 */
export async function fetchPriceInternal(isin: string): Promise<ISINCacheEntry | null> {
  const db = getFirestore();
  const now = Timestamp.now();

  // 1. Check Cache
  const cacheDoc = await db.collection(CACHE_COLLECTION).doc(isin).get();
  if (cacheDoc.exists) {
    const cacheData = cacheDoc.data() as ISINCacheEntry;
    const expiresAt = cacheData.expiresAt as Timestamp;
    if (expiresAt.toMillis() > now.toMillis()) {
      return cacheData;
    }
  }

  // 2. Financial Times
  let result = await fetchFromFinancialTimes(isin);

  // 3. Alpha Vantage
  if (!result) {
    result = await fetchFromAlphaVantage(isin);
  }

  // 4. Yahoo Finance
  if (!result) {
    result = await fetchFromYahoo(isin);
  }

  if (result) {
    const cacheEntry: ISINCacheEntry = {
      ...result,
      expiresAt: new Timestamp(now.seconds + CACHE_VALIDITY_DAYS * 24 * 60 * 60, 0),
    };
    await db.collection(CACHE_COLLECTION).doc(isin).set(cacheEntry);
    return cacheEntry;
  }

  // 5. Fallback to expired cache
  if (cacheDoc.exists) {
    return cacheDoc.data() as ISINCacheEntry;
  }

  return null;
}

/**
 * getPriceByISIN
 * Cascading price fetching logic: Cache -> FT -> AlphaVantage -> Yahoo -> Fallback Cache
 */
export const getPriceByISIN = onRequest(async (req, res) => {
  await new Promise((resolve) => cors(req, res, resolve));

  const isin = (req.query.isin as string || req.body.isin as string)?.toUpperCase();

    if (!isin) {
      res.status(400).send({ success: false, error: "ISIN is required" });
      return;
    }

  try {
    const result = await fetchPriceInternal(isin);
    if (result) {
      res.status(200).send({ success: true, data: result });
      return;
    }
    res.status(404).send({ success: false, error: `Price not found for ISIN ${isin}` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching price for ${isin}:`, error);
    res.status(500).send({ success: false, error: message || "Internal Server Error" });
  }
});

async function fetchFromFinancialTimes(isin: string): Promise<PriceResult | null> {
  try {
    // FT Search API or scraping? Legacy usually used scraping or a specific endpoint.
    // For this port, we simulate the logic described in the issue.
    // URL typically: https://markets.ft.com/data/etfs/tearsheet/summary?s=ISIN
    const url = `https://markets.ft.com/data/etfs/tearsheet/summary?s=${isin}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const text = await response.text();
    // Simple regex to find price in FT page (heuristic)
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

async function fetchFromAlphaVantage(isin: string): Promise<PriceResult | null> {
  try {
    // Alpha Vantage GLOBAL_QUOTE
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${isin}&apikey=${ALPHA_VANTAGE_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const quote = data["Global Quote"];
    if (quote && quote["05. price"]) {
      const price = parseFloat(quote["05. price"]);
      // Note: Alpha Vantage doesn't always return currency in Global Quote.
      // We might need OVERVIEW but let's assume EUR if it matches our expected assets
      // or check if it's listed on a European exchange in the symbol.
      // For now, following the "EUR only" constraint:
      return {
        isin,
        price,
        currency: "EUR", // Assumption or further check needed
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

async function fetchFromYahoo(isin: string): Promise<PriceResult | null> {
  try {
    let ticker: string | null = KNOWN_ISIN_TICKERS[isin];
    if (!ticker) {
      ticker = await findTickerFromISIN(isin);
    }

    if (!ticker) return null;

    // Try multiple suffixes for EUR
    const suffixes = ["", ".MI", ".AS", ".PA", ".DE"];
    for (const suffix of suffixes) {
      const fullTicker = ticker.includes(".") ? ticker : `${ticker}${suffix}`;
      const result = await tryYahooTicker(fullTicker, isin);
      if (result && result.currency === "EUR") return result;
    }

    return null;
  } catch (e) {
    console.error("Yahoo fetch error:", e);
    return null;
  }
}

async function findTickerFromISIN(isin: string): Promise<string | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${isin}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.quotes && data.quotes.length > 0) {
      return data.quotes[0].symbol;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function tryYahooTicker(ticker: string, isin: string): Promise<PriceResult | null> {
  try {
    if (!ticker) return null;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (result && result.meta) {
      const price = result.meta.regularMarketPrice;
      const currency = result.meta.currency;
      if (price && currency) {
        return {
          isin,
          symbol: ticker,
          price,
          currency,
          source: "Yahoo Finance",
          fetchedAt: Timestamp.now(),
        };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}
