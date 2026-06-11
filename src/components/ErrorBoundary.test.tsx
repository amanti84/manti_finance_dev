import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import * as auditService from '../services/audit';

// Mock audit service
vi.mock('../services/audit', () => ({
  logAudit: vi.fn(() => Promise.resolve({ success: true, data: {} })),
}));

// Mock firebase auth
vi.mock('../firebase', () => ({
  auth: {
    currentUser: { uid: 'test-uid' },
  },
}));

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Silencing console.error for the expected error
    vi.spyOn(console, 'error').mockImplementation(() => { /* ignore */ });
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('renders fallback UI when an error occurs', () => {
    render(
      <ErrorBoundary moduleName="TestModule">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Si è verificato un errore')).toBeTruthy();
    expect(screen.getByText(/TestModule/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /riprova/i })).toBeTruthy();
  });

  it('calls logAudit when an error occurs', () => {
    render(
      <ErrorBoundary moduleName="AuditModule">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(auditService.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'sistema',
      entityId: 'AuditModule',
      source: 'system',
    }));
  });

  it('resets error state when Retry button is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary moduleName="RetryModule">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Si è verificato un errore')).toBeTruthy();

    // To test retry, we need to make sure the next render doesn't throw
    rerender(
      <ErrorBoundary moduleName="RetryModule">
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /riprova/i });
    fireEvent.click(retryButton);

    expect(screen.queryByText('Si è verificato un errore')).toBeNull();
    expect(screen.getByText('No error')).toBeTruthy();
  });
});
