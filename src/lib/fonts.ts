import localFont from 'next/font/local';

export const poppins = localFont({
  src: [
    { path: '../app/fonts/Poppins-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../app/fonts/Poppins-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../app/fonts/Poppins-Italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-slide-poppins',
  display: 'swap',
  preload: false,
});

export const arimo = localFont({
  src: [
    { path: '../app/fonts/Arimo-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../app/fonts/Arimo-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../app/fonts/Arimo-Italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-slide-arimo',
  display: 'swap',
  preload: false,
});

export const gelasio = localFont({
  src: [
    { path: '../app/fonts/Gelasio-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../app/fonts/Gelasio-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../app/fonts/Gelasio-Italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-slide-gelasio',
  display: 'swap',
  preload: false,
});
