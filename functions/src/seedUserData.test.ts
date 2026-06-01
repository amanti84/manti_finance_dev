import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedUserData } from './seedUserData';

// Mock firebase-admin
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));

const mockDoc = vi.fn();
const mockSet = vi.fn();
const mockGet = vi.fn();
const mockAdd = vi.fn();
const mockCollection = vi.fn();

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    doc: mockDoc,
    collection: mockCollection,
  })),
  Timestamp: {
    now: vi.fn(() => ({
        toMillis: () => 123456789,
        seconds: 123456789,
        nanoseconds: 0
    })),
  },
}));

const mockVerifyIdToken = vi.fn();
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

// Mock firebase-functions v2 onRequest
vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn((handler) => handler),
}));

// Mock cors
vi.mock('cors', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

describe('seedUserData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.mockReturnValue({ get: mockGet, set: mockSet });
    mockCollection.mockReturnValue({ add: mockAdd });

    // Setup default mock behaviors
    mockGet.mockResolvedValue({ exists: false });
    mockSet.mockResolvedValue(undefined);
    mockAdd.mockResolvedValue(undefined);
  });

  it('should return 405 if method is not POST', async () => {
    const req = { method: 'GET' } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as any;

    await (seedUserData as any)(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'Method Not Allowed' }));
  });

  it('should return 401 if no auth header', async () => {
    const req = { method: 'POST', headers: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as any;

    await (seedUserData as any)(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: "L'utente deve essere autenticato" }));
  });

  it('should return 403 if not admin email', async () => {
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' }
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as any;

    mockVerifyIdToken.mockResolvedValue({ email: 'user@example.com', uid: 'user123' });

    await (seedUserData as any)(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: "Accesso limitato all'amministratore" }));
  });

  it('should seed data successfully for admin', async () => {
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-token' }
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as any;

    mockVerifyIdToken.mockResolvedValue({ email: 'amanti84@gmail.com', uid: 'admin123' });

    await (seedUserData as any)(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ inserted: expect.any(Number) })
    }));
    expect(mockSet).toHaveBeenCalled();
    expect(mockAdd).toHaveBeenCalled(); // Audit log
  });
});
