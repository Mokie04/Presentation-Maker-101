// Regenerate: node scripts/generate-slide-fit-metrics.mjs [Poppins ...fontFaces]
// Dependency-free TrueType reader: cmap formats 4/12, hmtx, head and hhea.
// Reads the source TTFs in src/app/fonts/source; the app serves the woff2 copies.
// Importing this module never writes files; only the CLI entry point does.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
export const characters = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('')
  + '‘’“”–—•×÷±≤≥≠≈π°⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉∞√→αβγδθλμσωΔΣΩ';
/** @param {string | URL | Buffer} font a TTF path or its bytes */
export function readFontMetrics(font, { rounded = true, includeMissing = false } = {}) {
  const data = Buffer.isBuffer(font) ? font : readFileSync(font);
  const quantize = value => rounded ? Math.round(value) : value;
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
    return [char, quantize(u16(tables.hmtx + Math.min(id, count - 1) * 4) / em * 1000)];
  }));
  return { lineHeight: (i16(hhea + 4) - i16(hhea + 6) + i16(hhea + 8)) / em,
    fallback: Math.round(Array.from('abcdefghijklmnopqrstuvwxyz', c => widths[c]).reduce((a, b) => a + b) / 26), widths,
    ...(includeMissing && { missing: Array.from(characters).filter(char => glyph(char.codePointAt(0)) === 0) }) };
}
/** The source TTF for a face and style, for example sourceFont('Arimo', 'Bold'). */
export function sourceFont(font, style) {
  return new URL(`../src/app/fonts/source/${font}-${style}.ttf`, import.meta.url);
}

/** The committed metrics module for a face. Poppins keeps its legacy module path. */
export function metricsModuleFile(font) {
  if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(font)) throw new Error(`Invalid font face: ${font}`);
  const moduleName = font === 'Poppins' ? 'slide-fit-metrics' : `slide-fit-metrics-${font.toLowerCase()}`;
  return new URL(`../src/lib/${moduleName}.ts`, import.meta.url);
}

/**
 * The generated TypeScript source for a face, computed in memory from its Regular and Bold
 * TTFs (or the bytes given). The CLI writes exactly this text.
 * @param {string} font
 * @param {{ regular?: Buffer, bold?: Buffer }} [fonts]
 */
export function metricsModuleSource(font, fonts = {}) {
  metricsModuleFile(font);
  const constantName = `${font.replaceAll('-', '_').toUpperCase()}_METRICS`;
  return `// Generated from bundled ${font} fonts. Regenerate: node scripts/generate-slide-fit-metrics.mjs\n`
    + `export const ${constantName}: Record<'regular' | 'bold', { lineHeight: number; fallback: number; widths: Record<string, number> }> = `
    + JSON.stringify({ regular: readFontMetrics(fonts.regular ?? sourceFont(font, 'Regular')), bold: readFontMetrics(fonts.bold ?? sourceFont(font, 'Bold')) }, null, 2) + ';\n';
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const fontFaces = process.argv.slice(2);
  for (const font of fontFaces.length ? fontFaces : ['Poppins']) writeFileSync(metricsModuleFile(font), metricsModuleSource(font));
}
