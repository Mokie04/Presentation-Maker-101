/** The legacy pdf.js bundled with pdf-parse is unsupported on Node 25 and later. */
export function shouldSkipRealPdfTest(nodeVersion: string): boolean {
  return Number(nodeVersion.split('.')[0]) >= 25;
}
