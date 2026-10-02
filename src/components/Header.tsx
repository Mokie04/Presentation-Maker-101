import React from 'react';
import Image from 'next/image';

export function Header() {
  return (
    <header className="w-full bg-gradient-to-r from-slate-900 via-sky-900 to-cyan-950 text-white shadow-lg border-b border-sky-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-white/10 backdrop-blur p-1 border border-sky-400/30 shadow-md flex-shrink-0 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Sayuna AI Logo"
                  width={44}
                  height={44}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white uppercase drop-shadow-sm">
                SAYUNA AI PRESENTATION MAKER
              </h1>
            </div>
            <p className="text-sm sm:text-base text-sky-100 font-medium pl-13 sm:pl-14">
              Upload Lesson Plan and generate PowerPoint Presentation instantly.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
