import localFont from 'next/font/local';

export const poppins = localFont({
  src: [
    { path: '../app/fonts/Poppins-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../app/fonts/Poppins-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../app/fonts/Poppins-Italic.ttf', weight: '400', style: 'italic' },
  ],
  variable: '--font-slide-poppins',
  display: 'swap',
  preload: false,
});

export const arimo = localFont({
  src: [
    { path: '../app/fonts/Arimo-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../app/fonts/Arimo-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../app/fonts/Arimo-Italic.ttf', weight: '400', style: 'italic' },
  ],
  variable: '--font-slide-arimo',
  display: 'swap',
  preload: false,
});

export const gelasio = localFont({
  src: [
    { path: '../app/fonts/Gelasio-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../app/fonts/Gelasio-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../app/fonts/Gelasio-Italic.ttf', weight: '400', style: 'italic' },
  ],
  variable: '--font-slide-gelasio',
  display: 'swap',
  preload: false,
});
