import { describe, it, expect, vi, beforeEach } from "vitest";
import { manageISINCache } from "./manageISINCache";

const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockDoc = vi.fn(() => ({ delete: mockDelete }));
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn();
const mockBatch = vi.fn(() => ({ delete: mockBatchDelete, commit: mockBatchCommit }));
const mockCollection = vi.fn(() => ({ get: mockGet, doc: mockDoc }));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: mockCollection,
    batch: mockBatch,
  }),
}));

vi.mock("firebase-functions/v2/https", () => ({
  onCall: (handler: any) => handler,
  HttpsError: class extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

describe("manageISINCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list cache entries for admin", async () => {
    const mockRequest = {
      auth: { token: { email: "ant.manti@gmail.com" } },
      data: { action: "list" },
    } as any;

    mockGet.mockResolvedValueOnce({
      docs: [
        { id: "ISIN1", data: () => ({ price: 10 }) },
        { id: "ISIN2", data: () => ({ price: 20 }) },
      ]
    });

    const result = await (manageISINCache as any)(mockRequest);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].isin).toBe("ISIN1");
  });

  it("should deny access to non-admin", async () => {
    const mockRequest = {
      auth: { token: { email: "other@gmail.com" } },
      data: { action: "list" },
    } as any;

    await expect((manageISINCache as any)(mockRequest)).rejects.toThrow("Only administrators can manage the price cache");
  });

  it("should delete specific entry", async () => {
    const mockRequest = {
      auth: { token: { email: "ant.manti@gmail.com" } },
      data: { action: "delete", isin: "ISIN1" },
    } as any;

    const result = await (manageISINCache as any)(mockRequest);

    expect(result.success).toBe(true);
    expect(mockDoc).toHaveBeenCalledWith("ISIN1");
    expect(mockDelete).toHaveBeenCalled();
  });
});
