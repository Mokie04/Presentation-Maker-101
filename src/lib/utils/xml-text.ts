/** Remove only characters forbidden in XML 1.0; preserve tab, LF, CR and Unicode text. */
export function stripIllegalXmlCharacters(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '');
}
