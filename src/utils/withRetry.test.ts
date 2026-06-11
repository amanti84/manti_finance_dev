import { describe, it, expect, vi } from 'vitest';
import { withRetry } from './withRetry';
import type { ApiResult } from '../types';

describe('withRetry utility', () => {
  it('returns success result immediately if successful', async () => {
    const fn = vi.fn(() => Promise.resolve({ success: true, data: 'ok' } as ApiResult<string>));
    const result = await withRetry(fn);

    expect(result.success).toBe(true);
    expect(result.data).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries up to maxAttempts on failure', async () => {
    const fn = vi.fn(() => Promise.resolve({ success: false, error: 'fail' } as ApiResult<string>));
    const result = await withRetry(fn, { maxAttempts: 3, delayMs: 1 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('fail');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('stops retrying if it eventually succeeds', async () => {
    let calls = 0;
    const fn = vi.fn(() => {
      calls++;
      if (calls === 2) return Promise.resolve({ success: true, data: 'second time charm' } as ApiResult<string>);
      return Promise.resolve({ success: false, error: 'fail' } as ApiResult<string>);
    });

    const result = await withRetry(fn, { maxAttempts: 3, delayMs: 1 });

    expect(result.success).toBe(true);
    expect(result.data).toBe('second time charm');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry on "non trovato" error', async () => {
    const fn = vi.fn(() => Promise.resolve({ success: false, error: 'Dato non trovato' } as ApiResult<string>));
    const result = await withRetry(fn, { maxAttempts: 3, delayMs: 1 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Dato non trovato');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry on 403 error', async () => {
    const fn = vi.fn(() => Promise.resolve({ success: false, error: 'Error 403: Forbidden' } as ApiResult<string>));
    const result = await withRetry(fn, { maxAttempts: 3, delayMs: 1 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Error 403: Forbidden');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry on permission-denied error', async () => {
    const fn = vi.fn(() => Promise.resolve({ success: false, error: 'permission-denied' } as ApiResult<string>));
    const result = await withRetry(fn, { maxAttempts: 3, delayMs: 1 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('permission-denied');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
