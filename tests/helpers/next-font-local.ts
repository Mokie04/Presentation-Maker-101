/** Next's build-time font transform is unavailable in Vitest; no font fetch is needed in DOM tests. */
export default function localFont() {
  return { className: 'local-font', variable: 'local-font-variable', style: { fontFamily: 'sans-serif' } };
}
