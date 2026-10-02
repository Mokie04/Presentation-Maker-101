'use client';

import React, { useEffect, useState } from 'react';

type SessionStatus = 'checking' | 'authenticated' | 'access-required' | 'unavailable';

export function SessionGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('checking');

  useEffect(() => {
    let cancelled = false;
    const currentUrl = new URL(window.location.href);
    const access = currentUrl.searchParams.get('access');
    const sessionUrl = access
      ? `/api/session?access=${encodeURIComponent(access)}`
      : '/api/session';

    fetch(sessionUrl, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((response) => {
        if (cancelled) return;

        if (!response.ok) {
          setStatus(response.status === 401 ? 'access-required' : 'unavailable');
          return;
        }

        if (access) {
          currentUrl.searchParams.delete('access');
          window.history.replaceState(
            window.history.state,
            document.title,
            `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
          );
        }

        setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'authenticated') return <>{children}</>;

  const title =
    status === 'checking'
      ? 'Checking your Sayuna AI session...'
      : status === 'access-required'
        ? 'Access required'
        : 'Authentication is unavailable';
  const message =
    status === 'checking'
      ? 'Please wait while we verify your App Store access.'
      : status === 'access-required'
        ? 'Open Presentation Maker Pro from the Sayuna AI App Store.'
        : 'Please return to the Sayuna AI App Store and try again.';

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6 text-center">
      <section className="max-w-md rounded-2xl border border-sky-100 bg-white p-8 shadow-md">
        <h1 className="text-2xl font-black text-slate-900">{title}</h1>
        <p className="mt-3 text-sm font-medium text-slate-600">{message}</p>
      </section>
    </main>
  );
}
