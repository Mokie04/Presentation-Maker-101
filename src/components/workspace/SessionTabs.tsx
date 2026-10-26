'use client';

import React, { useRef } from 'react';
import type { SessionOption } from '@/lib/utils/session-options';

export function sessionTabId(session: string) { return `session-tab-${session.replace(' ', '-')}`; }

export function SessionTabs({ sessions, activeSession, onSwitch, onAnother }: {
  sessions: SessionOption[];
  activeSession: SessionOption;
  onSwitch: (session: SessionOption) => void;
  onAnother: () => void;
}) {
  const tabs = useRef<HTMLDivElement>(null);
  return (
    <div className="flex min-w-0 basis-full flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
      <div ref={tabs} role="tablist" aria-label="Lesson sessions" className="flex min-w-0 flex-wrap gap-1"
        onKeyDown={event => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          const index = sessions.indexOf(activeSession);
          let next: number;
          switch (event.key) {
            case 'ArrowRight': next = (index + 1) % sessions.length; break;
            case 'ArrowLeft': next = (index + sessions.length - 1) % sessions.length; break;
            case 'Home': next = 0; break;
            case 'End': next = sessions.length - 1; break;
            default: return;
          }
          event.preventDefault(); event.stopPropagation();
          onSwitch(sessions[next]);
          tabs.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
        }}>
        {sessions.map(session => (
          <button key={session} type="button" role="tab" id={sessionTabId(session)} aria-controls="session-workspace-panel"
            aria-selected={session === activeSession} tabIndex={session === activeSession ? 0 : -1}
            onClick={() => onSwitch(session)}
            className={`rounded-lg px-3 py-2 text-sm font-bold ${session === activeSession ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-sky-50'}`}>
            {session}
          </button>
        ))}
      </div>
      <button type="button" onClick={onAnother} className="rounded-lg border border-sky-700 px-3 py-2 text-sm font-bold text-sky-800 hover:bg-sky-50">
        Another session
      </button>
    </div>
  );
}
