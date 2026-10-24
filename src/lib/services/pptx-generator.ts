import PptxGenJS from 'pptxgenjs';
import imageSize from 'image-size';
import type { PresentationData } from '@/types/presentation';
import { describeImageCredit } from '@/lib/image-credit';
import { isUsableImage, sniffImageMime, toRawBase64 } from '@/lib/slide-image';
import { parseFormulaToSegments } from '@/lib/utils/formula-parser';

import {
  SHADE_PRIMARY, SHADE_SECONDARY, SHADE_BACKGROUND, SHADE_TEXT_DARK,
  FALLBACK_BG, FALLBACK_BORDER, DEFAULT_FONT_FACE, TEXT_HEADING, TEXT_MUTED, TEXT_SUBTLE,
  CREDIT_LAYOUT, SLIDE_COUNTER, TITLE_LAYOUT, CONTENT_LAYOUT, slideLayoutFor, hasVisual,
} from '@/lib/slide-theme';

export {
  SHADE_PRIMARY, SHADE_SECONDARY, SHADE_BACKGROUND, SHADE_TEXT_DARK,
  FALLBACK_BG, FALLBACK_BORDER, DEFAULT_FONT_FACE,
} from '@/lib/slide-theme';

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

/** Fit selected library images using decoded dimensions; legacy sizing uses box dimensions. */
function addLibraryImage(slide: PptxGenJS.Slide, image: string, box: { x: number; y: number; w: number; h: number }): void {
  const raw = toRawBase64(image);
  const dimensions = imageSize(Buffer.from(raw, 'base64'));
  if (!dimensions.width || !dimensions.height) throw new Error('Library export image dimensions are unavailable.');
  const scale = Math.min(box.w / dimensions.width, box.h / dimensions.height);
  const w = dimensions.width * scale;
  const h = dimensions.height * scale;
  slide.addImage({
    data: `${sniffImageMime(raw)};base64,${raw}`,
    x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h,
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

    if (slide.imageMetadata) {
      const credit = describeImageCredit(slide.imageMetadata);
      slideObj.addText(`${credit.heading} — ${credit.creditLine}`, {
        ...CREDIT_LAYOUT, color: TEXT_MUTED,
        fontFace: DEFAULT_FONT_FACE, fit: 'shrink',
        hyperlink: { url: credit.sourceLink },
      });
      slideObj.addNotes(credit.notes);
    }

    // 1. Background
    slideObj.background = { fill: SHADE_BACKGROUND };

    // Slide 1: Special Hero Title Slide Layout
    if (slideLayoutFor(idx) === 'title') {
      // Session Badge
      const partText = (slide.part || 'TITLE PAGE').toUpperCase();
      slideObj.addText(partText, {
        ...TITLE_LAYOUT.part,
        color: SHADE_SECONDARY,
        bold: true,
        fontFace: DEFAULT_FONT_FACE,
      });

      // Big Title (minimum 40pt, aim 45pt)
      const titleRuns = formulaToTextRuns(slide.title || 'Lesson Presentation');
      slideObj.addText(titleRuns, {
        ...TITLE_LAYOUT.title,
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
        const textItems = contentPoints.flatMap((pt, pIdx) => {
          const pointOptions = {
            fontSize: pIdx === 0 ? TITLE_LAYOUT.firstPointFontSize : TITLE_LAYOUT.pointFontSize,
            color: pIdx === 0 ? TEXT_HEADING : TEXT_MUTED,
            bold: pIdx === 0 || pt.toLowerCase().includes('writer') || pt.toLowerCase().includes('author'),
          };
          return formulaToTextRuns(pt + (pIdx < contentPoints.length - 1 ? '\n' : '')).map((run) => ({
            ...run, options: { ...pointOptions, ...run.options },
          }));
        });

        slideObj.addText(textItems, {
          ...TITLE_LAYOUT.points,
          w: slide.imageMetadata ? TITLE_LAYOUT.pointsWithImageWidth : TITLE_LAYOUT.points.w,
          fontFace: DEFAULT_FONT_FACE,
          fit: 'shrink',
        });
      }

      const titleImage = slideImages?.[idx];
      if (slide.imageMetadata && titleImage && isUsableImage(titleImage)) {
        addLibraryImage(slideObj, titleImage, TITLE_LAYOUT.image);
      }

      // Slide counter
      slideObj.addText(`Slide 1 of ${totalSlides}`, {
        ...SLIDE_COUNTER,
        color: TEXT_SUBTLE,
        align: 'right',
        fontFace: DEFAULT_FONT_FACE,
      });
      return;
    }

    // Slides 2+: Content Slides
    // 2. Part header
    const partText = (slide.part || '').toUpperCase();
    slideObj.addText(partText, {
      ...CONTENT_LAYOUT.part,
      color: SHADE_SECONDARY,
      bold: true,
      fontFace: DEFAULT_FONT_FACE,
    });

    // 3. Title (minimum 40pt, aim 45pt)
    const titleFontSize = slide.title && slide.title.length > CONTENT_LAYOUT.longTitleThreshold
      ? CONTENT_LAYOUT.longTitleFontSize : CONTENT_LAYOUT.title.fontSize;
    const titleRuns = formulaToTextRuns(slide.title || '');
    slideObj.addText(titleRuns, {
      ...CONTENT_LAYOUT.title,
      fontSize: titleFontSize,
      color: SHADE_PRIMARY,
      bold: true,
      fontFace: DEFAULT_FONT_FACE,
      fit: 'shrink',
    });

    // 4. Bullet content (minimum 35pt body text)
    const visual = hasVisual(slide);
    const contentWidth = visual ? CONTENT_LAYOUT.bulletsWithVisualWidth : CONTENT_LAYOUT.bullets.w;
    const contentPoints = slide.contentPoints || [];
    const textItems: PptxGenJS.TextProps[] = [];
    contentPoints.forEach((pt, pIdx) => {
      const extra: Record<string, unknown> = { bullet: true };
      if (pIdx > 0) extra.breakLine = true;
      textItems.push(...formulaToTextRuns(pt, extra));
    });

    if (textItems.length > 0) {
      slideObj.addText(textItems, {
        ...CONTENT_LAYOUT.bullets,
        w: contentWidth,
        fontFace: DEFAULT_FONT_FACE,
        color: SHADE_TEXT_DARK,
        fit: 'shrink',
      });
    }

    // 5. Visual element (occupies <= 40% of slide space)
    if (visual) {
      const imageData = slideImages ? slideImages[idx] : undefined;

      // Always draw a handsome rounded card background container (w: 33% <= 40% of slide space)
      slideObj.addShape(pptx.ShapeType.roundRect, {
        ...CONTENT_LAYOUT.visualCard,
        fill: { color: FALLBACK_BG },
        line: { color: FALLBACK_BORDER, width: CONTENT_LAYOUT.visualBorderWidth },
      });

      if (imageData && isUsableImage(imageData)) {
        if (slide.imageMetadata) {
          addLibraryImage(slideObj, imageData, CONTENT_LAYOUT.libraryImage);
        } else {
          const rawBase64 = toRawBase64(imageData);
          slideObj.addImage({
            data: `${sniffImageMime(rawBase64)};base64,` + rawBase64,
            ...CONTENT_LAYOUT.image,
            sizing: { type: 'contain', ...CONTENT_LAYOUT.imageSizing },
          });
        }
      } else {
        // Fallback placeholder text inside container
        const placeholderText =
          '[PHILIPPINES CLASSROOM VISUAL DESIGN]\n\n' + slide.visualDescription;
        slideObj.addText(placeholderText, {
          ...CONTENT_LAYOUT.placeholder,
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
      ...SLIDE_COUNTER,
      color: TEXT_SUBTLE,
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
