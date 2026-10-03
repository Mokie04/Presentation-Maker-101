import PptxGenJS from 'pptxgenjs';
import type { PresentationData } from '@/types/presentation';
import { parseFormulaToSegments } from '@/lib/utils/formula-parser';

export const SHADE_PRIMARY = '0284C7';
export const SHADE_SECONDARY = '06B6D4';
export const SHADE_BACKGROUND = 'F0F9FF';
export const SHADE_TEXT_DARK = '0F172A';
export const FALLBACK_BG = 'E0F2FE';
export const FALLBACK_BORDER = '7DD3FC';

export const DEFAULT_FONT_FACE = 'Poppins';

/**
 * Converts a text string into PptxGenJS text runs with native subscript/superscript.
 * Additional options (e.g. bullet, breakLine) are merged into each run.
 */
function formulaToTextRuns(
  text: string,
  extraOptions?: Record<string, unknown>
): PptxGenJS.TextProps[] {
  const segments = parseFormulaToSegments(text);
  if (segments.length === 0) {
    return [{ text: text || '', options: { ...extraOptions } }];
  }
  return segments.map((seg, idx) => {
    const opts: Record<string, unknown> = {};
    if (seg.subscript) opts.subscript = true;
    if (seg.superscript) opts.superscript = true;
    // Merge extra options only into the first run (e.g. bullet, breakLine)
    if (idx === 0 && extraOptions) {
      Object.assign(opts, extraOptions);
    }
    return { text: seg.text, options: opts };
  });
}

export function createPresentationPptx(
  presentationData: PresentationData,
  slideImages?: Record<number, string>
): PptxGenJS {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // Standard 16:9 modern widescreen: 13.333" x 7.5"

  const slides = presentationData.slides || [];
  const totalSlides = slides.length;

  slides.forEach((slide, idx) => {
    const slideObj = pptx.addSlide();

    // 1. Background
    slideObj.background = { fill: SHADE_BACKGROUND };

    // Slide 1: Special Hero Title Slide Layout
    if (idx === 0) {
      // Session Badge
      const partText = (slide.part || 'TITLE PAGE').toUpperCase();
      slideObj.addText(partText, {
        x: 0.8,
        y: 1.0,
        w: '85%',
        h: 0.45,
        fontSize: 16,
        color: SHADE_SECONDARY,
        bold: true,
        fontFace: DEFAULT_FONT_FACE,
      });

      // Big Title (minimum 40pt, aim 45pt)
      const titleRuns = formulaToTextRuns(slide.title || 'Lesson Presentation');
      slideObj.addText(titleRuns, {
        x: 0.8,
        y: 1.55,
        w: '85%',
        h: 1.6,
        fontSize: 45,
        color: SHADE_PRIMARY,
        bold: true,
        fontFace: DEFAULT_FONT_FACE,
        fit: 'shrink',
      });

      // Subtitle / Writers Attribution (Clean un-bulleted card layout)
      const contentPoints = [...(slide.contentPoints || [])];
      const writers = presentationData.originalWriters;
      if (
        writers &&
        !contentPoints.some(
          (pt) =>
            pt.toLowerCase().includes('writer') ||
            pt.toLowerCase().includes('author') ||
            pt.toLowerCase().includes(writers.toLowerCase())
        )
      ) {
        contentPoints.push(`Original Lesson Plan Writers: ${writers}`);
      }

      if (contentPoints.length > 0) {
        const textItems = contentPoints.map((pt, pIdx) => ({
          text: pt + (pIdx < contentPoints.length - 1 ? '\n' : ''),
          options: {
            fontSize: pIdx === 0 ? 28 : 22,
            color: pIdx === 0 ? '1E293B' : '475569',
            bold: pIdx === 0 || pt.toLowerCase().includes('writer') || pt.toLowerCase().includes('author'),
          },
        }));

        slideObj.addText(textItems, {
          x: 0.8,
          y: 3.4,
          w: '85%',
          h: 2.6,
          fontFace: DEFAULT_FONT_FACE,
          lineSpacing: 34,
          fit: 'shrink',
        });
      }

      // Slide counter
      slideObj.addText(`Slide 1 of ${totalSlides}`, {
        x: '80%',
        y: 6.85,
        w: '16%',
        h: 0.35,
        fontSize: 11,
        color: '94A3B8',
        align: 'right',
        fontFace: DEFAULT_FONT_FACE,
      });
      return;
    }

    // Slides 2+: Content Slides
    // 2. Part header
    const partText = (slide.part || '').toUpperCase();
    slideObj.addText(partText, {
      x: 0.8,
      y: 0.45,
      w: '85%',
      h: 0.35,
      fontSize: 14,
      color: SHADE_SECONDARY,
      bold: true,
      fontFace: DEFAULT_FONT_FACE,
    });

    // 3. Title (minimum 40pt, aim 45pt)
    const titleFontSize = slide.title && slide.title.length > 35 ? 40 : 45;
    const titleRuns = formulaToTextRuns(slide.title || '');
    slideObj.addText(titleRuns, {
      x: 0.8,
      y: 0.85,
      w: '88%',
      h: 1.15,
      fontSize: titleFontSize,
      color: SHADE_PRIMARY,
      bold: true,
      fontFace: DEFAULT_FONT_FACE,
      fit: 'shrink',
    });

    // 4. Bullet content (minimum 35pt body text)
    const hasVisual = Boolean(slide.visualDescription && slide.visualDescription.trim().length > 0);
    const contentWidth = hasVisual ? '55%' : '88%';
    const contentPoints = slide.contentPoints || [];
    const textItems: PptxGenJS.TextProps[] = [];
    contentPoints.forEach((pt, pIdx) => {
      const extra: Record<string, unknown> = { bullet: true };
      if (pIdx > 0) extra.breakLine = true;
      textItems.push(...formulaToTextRuns(pt, extra));
    });

    if (textItems.length > 0) {
      slideObj.addText(textItems, {
        x: 0.8,
        y: 2.1,
        w: contentWidth,
        h: 4.6,
        lineSpacing: 46,
        fontFace: DEFAULT_FONT_FACE,
        fontSize: 35,
        color: SHADE_TEXT_DARK,
        fit: 'shrink',
      });
    }

    // 5. Visual element (occupies <= 40% of slide space)
    if (hasVisual) {
      const imageData = slideImages ? slideImages[idx] : undefined;

      // Always draw a handsome rounded card background container (w: 33% <= 40% of slide space)
      slideObj.addShape(pptx.ShapeType.roundRect, {
        x: '62%',
        y: 2.1,
        w: '33%',
        h: 4.5,
        fill: { color: FALLBACK_BG },
        line: { color: FALLBACK_BORDER, width: 1.5 },
      });

      if (imageData && imageData !== 'failed') {
        const rawBase64 = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        const isJpeg = rawBase64.startsWith('/9j/');
        const mime = isJpeg ? 'image/jpeg' : 'image/png';
        slideObj.addImage({
          data: `${mime};base64,` + rawBase64,
          x: '62.5%',
          y: 2.15,
          w: '32%',
          h: 4.4,
          sizing: { type: 'contain', w: 4.2, h: 4.4 },
        });
      } else {
        // Fallback placeholder text inside container
        const placeholderText =
          '[PHILIPPINES CLASSROOM VISUAL DESIGN]\n\n' + slide.visualDescription;
        slideObj.addText(placeholderText, {
          x: '63%',
          y: 2.3,
          w: '31%',
          h: 4.1,
          fontSize: 13,
          color: SHADE_PRIMARY,
          italic: true,
          align: 'center',
          valign: 'middle',
          fontFace: DEFAULT_FONT_FACE,
          fit: 'shrink',
        });
      }
    }

    // 6. Slide counter
    slideObj.addText(`Slide ${idx + 1} of ${totalSlides}`, {
      x: '80%',
      y: 6.85,
      w: '16%',
      h: 0.35,
      fontSize: 11,
      color: '94A3B8',
      align: 'right',
      fontFace: DEFAULT_FONT_FACE,
    });
  });

  return pptx;
}

export async function buildPresentationPptx(
  presentationData: PresentationData,
  slideImages?: Record<number, string>
): Promise<Buffer> {
  const pptx = createPresentationPptx(presentationData, slideImages);
  const output = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}
