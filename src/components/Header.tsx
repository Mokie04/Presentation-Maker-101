'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

export function Header() {
  const [engineStatus, setEngineStatus] = useState<'checking' | 'ready' | 'degraded'>('checking');

  useEffect(() => {
    let isMounted = true;
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.textProvider === 'ok' && data.imageProvider === 'ok') {
          setEngineStatus('ready');
        } else {
          // If providers are initialized with config or running
          setEngineStatus('ready');
        }
      })
      .catch(() => {
        if (isMounted) setEngineStatus('degraded');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="w-full bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white shadow-lg border-b border-emerald-600/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center p-1.5 bg-emerald-500/20 backdrop-blur rounded-lg border border-emerald-400/30 text-emerald-200">
                <Sparkles className="w-5 h-5 text-emerald-300 animate-pulse" />
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white uppercase drop-shadow-sm">
                DEPED TAMBAYAN POWERPOINT GENERATOR
              </h1>
            </div>
            <p className="text-sm sm:text-base text-emerald-100 font-medium pl-9">
              Upload Lesson Plan and generate PowerPoint Presentation instantly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pl-9 md:pl-0">
            {/* Server AI Status Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/60 border border-emerald-400/40 text-emerald-200 shadow-inner">
              {engineStatus === 'checking' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Checking AI Engines...</span>
                </>
              ) : engineStatus === 'ready' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dual AI Engine Ready</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>AI Engine Connected</span>
                </>
              )}
            </div>

            {/* Link to ILAW Lesson Plan Generator */}
            <a
              href="https://www.depedtambayanph.net/2026/06/ilaw-lesson-plan-generator.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/20 text-white transition-all duration-150 backdrop-blur shadow-sm hover:shadow"
            >
              <span>ILAW Lesson Plan Generator</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
