import React from 'react';
import { Sparkles } from 'lucide-react';

export function Header() {
  return (
    <header className="w-full bg-gradient-to-r from-slate-900 via-sky-900 to-cyan-950 text-white shadow-lg border-b border-sky-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center p-1.5 bg-sky-500/20 backdrop-blur rounded-lg border border-sky-400/30 text-sky-200">
                <Sparkles className="w-5 h-5 text-sky-300 animate-pulse" />
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white uppercase drop-shadow-sm">
                SAYUNA AI PRESENTATION MAKER
              </h1>
            </div>
            <p className="text-sm sm:text-base text-sky-100 font-medium pl-9">
              Upload Lesson Plan and generate PowerPoint Presentation instantly.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
