// Regenerate: node scripts/generate-slide-fit-metrics.mjs
// Dependency-free TrueType reader: cmap formats 4/12, hmtx, head and hhea.
import { readFileSync, writeFileSync } from 'node:fs';
const characters = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('')
  + '‘’“”–—•×÷±≤≥≠≈π°⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉∞√→αβγδθλμσωΔΣΩ';
function readFace(name) {
  const data = readFileSync(new URL(`../src/app/fonts/Poppins-${name}.ttf`, import.meta.url));
  const u16 = p => data.readUInt16BE(p), i16 = p => data.readInt16BE(p), u32 = p => data.readUInt32BE(p);
  const tables = {};
  for (let i = 0; i < u16(4); i++) {
    const p = 12 + i * 16; tables[data.toString('ascii', p, p + 4)] = u32(p + 8);
  }
  const em = u16(tables.head + 18), hhea = tables.hhea;
  const count = u16(hhea + 34), cmap = tables.cmap;
  const maps = Array.from({ length: u16(cmap + 2) }, (_, i) => cmap + u32(cmap + 8 + i * 8));
  const map = maps.find(p => u16(p) === 12) ?? maps.find(p => u16(p) === 4);
  function glyph(code) {
    if (u16(map) === 12) {
      for (let i = 0; i < u32(map + 12); i++) {
        const p = map + 16 + i * 12;
        if (code >= u32(p) && code <= u32(p + 4)) return u32(p + 8) + code - u32(p);
      }
    } else {
      const n = u16(map + 6) / 2, ends = map + 14, starts = ends + 2 * n + 2;
      for (let i = 0; i < n; i++) {
        if (code < u16(starts + i * 2) || code > u16(ends + i * 2)) continue;
        const delta = i16(starts + 2 * n + i * 2), range = starts + 4 * n + i * 2, offset = u16(range);
        if (!offset) return (code + delta) & 0xffff;
        const id = u16(range + offset + 2 * (code - u16(starts + i * 2)));
        return id ? (id + delta) & 0xffff : 0;
      }
    }
    return 0;
  }
  const widths = Object.fromEntries(Array.from(characters, char => {
    const id = glyph(char.codePointAt(0));
    return [char, Math.round(u16(tables.hmtx + Math.min(id, count - 1) * 4) / em * 1000)];
  }));
  return { lineHeight: (i16(hhea + 4) - i16(hhea + 6) + i16(hhea + 8)) / em,
    fallback: Math.round(Array.from('abcdefghijklmnopqrstuvwxyz', c => widths[c]).reduce((a, b) => a + b) / 26), widths };
}
writeFileSync(new URL('../src/lib/slide-fit-metrics.ts', import.meta.url),
  '// Generated from bundled Poppins fonts. Regenerate: node scripts/generate-slide-fit-metrics.mjs\n'
  + 'export const POPPINS_METRICS: Record<\'regular\' | \'bold\', { lineHeight: number; fallback: number; widths: Record<string, number> }> = '
  + JSON.stringify({ regular: readFace('Regular'), bold: readFace('Bold') }, null, 2) + ';\n');
