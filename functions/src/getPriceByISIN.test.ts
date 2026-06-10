import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPriceByISIN } from "./getPriceByISIN";

import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Mock firebase-admin/firestore
const mockGet = vi.fn();
const mockSet = vi.fn();

vi.mock("firebase-admin/firestore", () => {
  class MockTimestamp {
    constructor(public seconds: number, public nanoseconds: number) {}
    static now() {
      const n = Date.now();
      return new MockTimestamp(Math.floor(n / 1000), (n % 1000) * 1e6);
    }
    toMillis() {
      return this.seconds * 1000 + this.nanoseconds / 1e6;
    }
  }

  return {
    getFirestore: vi.fn(),
    Timestamp: MockTimestamp,
  };
});

vi.mock("firebase-functions/v2/https", () => ({
  onRequest: (opts: any, handler: any) => handler || opts,
}));

// Mock fetch
global.fetch = vi.fn();

describe("getPriceByISIN", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getFirestore).mockReturnValue({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: mockGet,
          set: mockSet,
        })),
      })),
    } as any);
  });

  it("should return price from cache if valid", async () => {
    const mockReq = { query: { isin: "IE00BYX2JD69" } } as any;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      setHeader: vi.fn(),
      getHeader: vi.fn(),
    } as any;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        isin: "IE00BYX2JD69",
        price: 100,
        currency: "EUR",
        expiresAt: { toMillis: () => futureDate.getTime() },
      }),
    });

    // Extract the handler from onRequest (since we can't easily trigger the onRequest mock)
    // Actually, in our implementation getPriceByISIN is the result of onRequest which is a function (req, res) => ...
    mockReq.on = vi.fn();
    mockReq.headers = { origin: 'http://localhost:5173' };
    await (getPriceByISIN as any)(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ price: 100 })
    }));
  });

  it("should fetch from Yahoo if cache is empty and FT/AV fail", async () => {
    const mockReq = { query: {}, body: { isin: "IE00B4L5Y983" }, on: vi.fn(), headers: { origin: 'http://localhost:5173' } } as any;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      setHeader: vi.fn(),
      getHeader: vi.fn(),
    } as any;

    mockGet.mockResolvedValueOnce({ exists: false }); // Cache miss

    // Mock FT fail
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as any);
    // Mock Alpha Vantage fail
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as any);
    // Mock Yahoo search
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ quotes: [{ symbol: "IWDA.AS" }] })
    } as any);
    // Mock Yahoo chart
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        chart: {
          result: [{
            meta: { regularMarketPrice: 123.45, currency: "EUR" }
          }]
        }
      })
    } as any);

    await (getPriceByISIN as any)(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ price: 123.45, source: "Yahoo Finance" })
    }));
    expect(mockSet).toHaveBeenCalled(); // Should save to cache
  });

  it("should return 400 if ISIN is missing", async () => {
    const mockReq = { query: {}, body: {}, on: vi.fn(), headers: { origin: 'http://localhost:5173' } } as any;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      setHeader: vi.fn(),
      getHeader: vi.fn(),
    } as any;

    await (getPriceByISIN as any)(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith({ success: false, error: "ISIN is required" });
  });
});
