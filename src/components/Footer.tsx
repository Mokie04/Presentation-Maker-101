import React from 'react';
import Image from 'next/image';
import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-slate-900 border-t border-slate-800 text-slate-400 py-6 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Image
            src="/logo.png"
            alt="Sayuna AI"
            width={20}
            height={20}
            className="w-5 h-5 object-contain inline-block drop-shadow-xs"
          />
          <p className="text-xs sm:text-sm font-semibold tracking-wider text-slate-300 uppercase">
            DEVELOPED BY JOHN M. NAVARRO
          </p>
        </div>
        <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
          <span>Empowering Teachers with Next-Gen AI</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
          <span>SAYUNA AI PRESENTATION MAKER</span>
        </p>
      </div>
    </footer>
  );
}
