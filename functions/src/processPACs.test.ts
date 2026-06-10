import { describe, it, expect, vi, beforeEach } from "vitest";
import { processPACsManually } from "./processPACs";

// Mock firestore
const mockUpdate = vi.fn();
const mockAdd = vi.fn();
const mockGet = vi.fn();
const mockDoc = vi.fn(() => ({ update: mockUpdate, get: mockGet }));
const mockLimit = vi.fn().mockReturnThis();
const mockWhere = vi.fn().mockReturnThis();
const mockCollection = vi.fn(() => ({
  add: mockAdd,
  where: mockWhere,
  limit: mockLimit,
  get: mockGet,
  doc: mockDoc
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: mockCollection,
    doc: mockDoc,
  }),
  Timestamp: {
    now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() }),
  },
  FieldValue: {
    serverTimestamp: () => "server-timestamp",
  },
}));

vi.mock("firebase-functions/v2/https", () => ({
  onCall: (handler: any) => handler,
  HttpsError: class extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

vi.mock("firebase-functions/v2/scheduler", () => ({
  onSchedule: (opts: any, handler: any) => handler || opts,
}));

// Mock fetchPriceInternal from getPriceByISIN
vi.mock("./getPriceByISIN", () => ({
  fetchPriceInternal: vi.fn().mockResolvedValue({ price: 10, source: "test" }),
}));

describe("processPACs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processPACsManually should process a single PAC", async () => {
    const mockRequest = {
      auth: { uid: "test-user" },
      data: { pacId: "pac-123", isKindergarten: false },
    } as any;

    // Mock PAC data
    mockGet.mockResolvedValueOnce({
      exists: true,
      id: "pac-123",
      data: () => ({
        name: "Test PAC",
        isin: "IE123",
        monthlyAmount: 100,
        shares: 10,
        avgCost: 5,
        active: true
      })
    });

    // Mock Investment search result
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: "inv-123",
        ref: { update: mockUpdate },
        data: () => ({ quantity: 10, avgCost: 5 })
      }]
    });

    const result = await (processPACsManually as any)(mockRequest);

    expect(result.success).toBe(true);
    expect(result.data.sharesPurchased).toBe(10); // 100 / 10 = 10
    expect(mockUpdate).toHaveBeenCalled(); // PAC update
    expect(mockAdd).toHaveBeenCalled(); // Transaction record and Audit log
  });

  it("should return error if PAC not found", async () => {
    const mockRequest = {
      auth: { uid: "test-user" },
      data: { pacId: "invalid-pac" },
    } as any;

    mockGet.mockResolvedValueOnce({ exists: false });

    await expect((processPACsManually as any)(mockRequest)).rejects.toThrow("PAC not found");
  });
});
