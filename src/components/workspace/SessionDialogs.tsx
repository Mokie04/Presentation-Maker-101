'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { PresentationData } from '@/types/presentation';
import type { SupportedSubject } from '@/lib/utils/subject-options';
import { SESSION_OPTIONS, type SessionOption } from '@/lib/utils/session-options';
import { generatePresentation } from '@/lib/generate-client';
import { useDialogFocus } from './use-dialog-focus';

const buttonClass = 'min-h-11 rounded-lg px-4 py-2 text-sm font-bold';
const refreshNote = 'Nothing is saved if the page is refreshed.';

function SessionDialog({ title, children, onEscape }: { title: string; children: React.ReactNode; onEscape: () => void }) {
  const ref = useDialogFocus(true);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3">
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="session-dialog-title" tabIndex={-1}
        className="max-h-[calc(100dvh-24px)] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl bg-white p-5 text-slate-800 shadow-xl"
        onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onEscape(); } }}>
        <h2 id="session-dialog-title" className="text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function AnotherSessionDialog({ text, lessonName, subject, sessions, activeSession, onClose, onSuccess }: {
  text: string;
  lessonName: string;
  subject: SupportedSubject | '';
  sessions: SessionOption[];
  activeSession: SessionOption;
  onClose: () => void;
  onSuccess: (data: PresentationData, session: SessionOption) => void;
}) {
  const [session, setSession] = useState<SessionOption | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); }, []);
  const cancel = () => { request.current?.abort(); request.current = null; onClose(); };
  const generate = async () => {
    if (!session || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setIsLoading(true); setError('');
    try {
      const data = await generatePresentation({ text, session, subject: subject || undefined }, controller.signal, setStage);
      if (request.current === controller && !controller.signal.aborted) onSuccess(data, session);
    } catch (err) {
      if (request.current === controller && !controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'An error occurred during generation.');
      }
    } finally {
      if (request.current === controller && !controller.signal.aborted) {
        request.current = null; setIsLoading(false); setStage('');
      }
    }
  };
  return (
    <SessionDialog title="Another session" onEscape={() => { if (!isLoading) cancel(); }}>
      <p className="break-words text-sm"><span className="font-semibold">{lessonName}</span> · {text.length} characters</p>
      <div className="space-y-1">
        <label htmlFor="another-session" className="block text-sm font-semibold">Select Session</label>
        <select id="another-session" value={session} disabled={isLoading} className="min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 text-sm"
          onChange={event => { setSession(event.target.value as SessionOption | ''); setError(''); }}>
          <option value="">Choose a session</option>
          {SESSION_OPTIONS.map(option => <option key={option} value={option}>
            {option}{sessions.includes(option) ? ' (ready)' : ''}{option === activeSession ? ' (current)' : ''}
          </option>)}
        </select>
      </div>
      <div className="text-sm"><span className="font-semibold">Subject: </span><span>{subject || 'Automatic'}</span></div>
      {session && sessions.includes(session) && <p className="text-sm text-amber-900">{session} already has slides. They will be replaced.</p>}
      <p className="text-sm text-slate-600">{refreshNote}</p>
      {isLoading && <p role="status" className="text-sm text-sky-800">{stage}</p>}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" disabled={!session || isLoading} onClick={generate} className={`${buttonClass} bg-sky-700 text-white disabled:opacity-50`}>Generate</button>
        <button type="button" onClick={cancel} className={`${buttonClass} bg-slate-100 text-slate-800`}>Cancel</button>
      </div>
    </SessionDialog>
  );
}

export function ResetSessionsDialog({ count, onClose, onConfirm }: { count: number; onClose: () => void; onConfirm: () => void }) {
  return (
    <SessionDialog title="Start over?" onEscape={onClose}>
      <p className="text-sm">All {count} session decks will be cleared. Download them first if you need them.</p>
      <p className="text-sm text-slate-600">{refreshNote}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onConfirm} className={`${buttonClass} bg-sky-700 text-white`}>Start over</button>
        <button type="button" onClick={onClose} className={`${buttonClass} bg-slate-100 text-slate-800`}>Cancel</button>
      </div>
    </SessionDialog>
  );
}
