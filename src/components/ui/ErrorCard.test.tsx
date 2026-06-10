import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorCard } from './ErrorCard';

describe('ErrorCard Component', () => {
  it('renders correctly with message', () => {
    render(<ErrorCard message="Test error message" />);
    expect(screen.getByText('Test error message')).toBeTruthy();
    expect(screen.getByText('Errore di caricamento')).toBeTruthy();
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorCard message="Test error" onRetry={onRetry} />);
    const retryButton = screen.getByRole('button', { name: /riprova/i });
    expect(retryButton).toBeTruthy();
    retryButton.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders correctly in compact mode', () => {
    render(<ErrorCard message="Compact error" compact />);
    expect(screen.getByText('Compact error')).toBeTruthy();
    // In compact mode we don't have "Errore di caricamento" header
    expect(screen.queryByText('Errore di caricamento')).toBeNull();
  });

  it('renders retry button in compact mode', () => {
    const onRetry = vi.fn();
    render(<ErrorCard message="Compact error" compact onRetry={onRetry} />);
    const retryButton = screen.getByRole('button', { name: /riprova/i });
    expect(retryButton).toBeTruthy();
    retryButton.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
