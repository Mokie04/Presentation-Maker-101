import React from 'react';

export function Header() {
  return (
    <header className="relative isolate w-full overflow-hidden bg-gradient-to-r from-slate-900 via-sky-900 to-cyan-950 text-white shadow-lg border-b border-sky-500/30">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 -z-10 h-72 w-72 rounded-full bg-sun-500/20 blur-3xl" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sayuna-logo.png?v=3"
            alt="Sayuna AI Logo"
            className="w-11 h-11 sm:w-13 sm:h-13 object-contain drop-shadow-md flex-shrink-0 bg-transparent"
          />
          <div className="min-w-0 space-y-0.5 break-words">
            <h1 className="home-heading text-base sm:text-lg font-extrabold tracking-tight text-white uppercase drop-shadow-sm leading-tight">
              SAYUNA AI PRESENTATION MAKER
            </h1>
            <p className="text-xs sm:text-sm text-sky-100/90 font-medium">
              Making Presentation very Sayuna
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
