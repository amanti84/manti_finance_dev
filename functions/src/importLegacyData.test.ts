import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFirestore } from 'firebase-admin/firestore';
import { importLegacyData } from './importLegacyData';

// Mock firebase-functions
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (fn: any) => fn,
  HttpsError: class extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

// Mock firebase-admin/firestore
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  Timestamp: {
    now: () => ({ toMillis: () => 123456789 }),
    fromDate: (d: Date) => d,
  },
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
}));

describe('importLegacyData', () => {
  let mockDb: any;
  let mockDoc: any;
  let mockCollection: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDoc = {
      get: vi.fn(),
      set: vi.fn(),
    };

    mockCollection = {
      doc: vi.fn(() => mockDoc),
      add: vi.fn(),
    };

    mockDb = {
      collection: vi.fn(() => mockCollection),
    };

    vi.mocked(getFirestore).mockReturnValue(mockDb);
  });

  it('should throw unauthenticated if no auth context', async () => {
    const request = { auth: null, data: {} };
    await expect((importLegacyData as any)(request as any)).rejects.toThrow(
      expect.objectContaining({ code: 'unauthenticated' })
    );
  });

  it('should throw permission-denied if not admin', async () => {
    const request = {
      auth: { token: { email: 'user@test.com' }, uid: 'user123' },
      data: {},
    };
    await expect((importLegacyData as any)(request as any)).rejects.toThrow(
      expect.objectContaining({ code: 'permission-denied' })
    );
  });

  it('should import data correctly for admin', async () => {
    const request = {
      auth: { token: { email: 'ant.manti@gmail.com' }, uid: 'admin123' },
      data: {
        pacs: [{ id: 'p1', name: 'PAC 1' }],
        investments: [{ id: 'i1', name: 'Inv 1', quantity: 10 }],
      },
    };

    mockDoc.get.mockResolvedValue({ exists: false });

    const result = (await (importLegacyData as any)(request as any)) as any;

    expect(result.data.inserted).toBe(2);
    expect(mockDoc.set).toHaveBeenCalledTimes(2);
    expect(mockCollection.add).toHaveBeenCalledWith(expect.objectContaining({
      action: 'LEGACY_IMPORT',
    }));
  });

  it('should skip existing documents', async () => {
    const request = {
      auth: { token: { email: 'ant.manti@gmail.com' }, uid: 'admin123' },
      data: {
        pacs: [{ id: 'p1', name: 'PAC 1' }],
      },
    };

    mockDoc.get.mockResolvedValue({ exists: true });

    const result = (await (importLegacyData as any)(request as any)) as any;

    expect(result.data.inserted).toBe(0);
    expect(result.data.skipped).toBe(1);
    expect(mockDoc.set).not.toHaveBeenCalled();
  });

  it('should handle dryRun', async () => {
    const request = {
      auth: { token: { email: 'ant.manti@gmail.com' }, uid: 'admin123' },
      data: {
        pacs: [{ id: 'p1', name: 'PAC 1' }],
        dryRun: true,
      },
    };

    mockDoc.get.mockResolvedValue({ exists: false });

    const result = (await (importLegacyData as any)(request as any)) as any;

    expect(result.data.inserted).toBe(1);
    expect(mockDoc.set).not.toHaveBeenCalled();
  });
});
