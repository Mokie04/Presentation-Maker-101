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
