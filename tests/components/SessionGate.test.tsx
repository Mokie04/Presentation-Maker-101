// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SessionGate } from '@/components/SessionGate';

function authenticatedResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ authenticated: true }),
  } as Response;
}

describe('SessionGate', () => {
  beforeEach(() => {
    window.history.replaceState(
      {},
      '',
      '/?access=handoff token&view=editor#slides'
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('hides protected children while the session bootstrap is pending', async () => {
    let resolveFetch: (response: Response) => void = () => undefined;
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal('fetch', vi.fn(() => pendingResponse));

    render(
      <SessionGate>
        <div data-testid="protected-content">Protected workspace</div>
      </SessionGate>
    );

    expect(screen.getByText(/checking your sayuna ai session/i)).toBeTruthy();
    expect(screen.queryByTestId('protected-content')).toBeNull();

    resolveFetch(authenticatedResponse());
    await waitFor(() => expect(screen.getByTestId('protected-content')).toBeTruthy());
  });

  it('exchanges an access token, preserves unrelated URL state, and renders children', async () => {
    const fetchMock = vi.fn().mockResolvedValue(authenticatedResponse());
    vi.stubGlobal('fetch', fetchMock);

    render(
      <SessionGate>
        <div data-testid="protected-content">Protected workspace</div>
      </SessionGate>
    );

    await waitFor(() => expect(screen.getByTestId('protected-content')).toBeTruthy());

    expect(fetchMock).toHaveBeenCalledWith('/api/session?access=handoff%20token', {
      credentials: 'include',
      cache: 'no-store',
    });
    expect(window.location.search).toBe('?view=editor');
    expect(window.location.hash).toBe('#slides');
  });

  it('bootstraps an existing cookie session without an access parameter', async () => {
    window.history.replaceState({}, '', '/');
    const fetchMock = vi.fn().mockResolvedValue(authenticatedResponse());
    vi.stubGlobal('fetch', fetchMock);

    render(
      <SessionGate>
        <div data-testid="protected-content">Protected workspace</div>
      </SessionGate>
    );

    await waitFor(() => expect(screen.getByTestId('protected-content')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith('/api/session', {
      credentials: 'include',
      cache: 'no-store',
    });
  });

  it('shows a generic access-required state for a 401 without rendering children', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'internal token detail' }),
      } as Response)
    );

    render(
      <SessionGate>
        <div data-testid="protected-content">Protected workspace</div>
      </SessionGate>
    );

    await waitFor(() => expect(screen.getByText(/access required/i)).toBeTruthy());
    expect(screen.queryByTestId('protected-content')).toBeNull();
    expect(screen.queryByText(/internal token detail/i)).toBeNull();
  });

  it('shows a generic unavailable state for non-401 failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'provider secret leaked here' }),
      } as Response)
    );

    render(
      <SessionGate>
        <div data-testid="protected-content">Protected workspace</div>
      </SessionGate>
    );

    await waitFor(() => expect(screen.getByText(/authentication is unavailable/i)).toBeTruthy());
    expect(screen.queryByTestId('protected-content')).toBeNull();
    expect(screen.queryByText(/provider secret leaked here/i)).toBeNull();
  });
});
