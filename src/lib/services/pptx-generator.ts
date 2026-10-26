import { fitSlide, titlePointSize } from '@/lib/slide-fit';
import PptxGenJS from 'pptxgenjs';
import imageSize from 'image-size';
import type { PresentationData } from '@/types/presentation';
import { describeImageCredit } from '@/lib/image-credit';
import { isUsableImage, sniffImageMime, toRawBase64 } from '@/lib/slide-image';
import { parseFormulaToSegments } from '@/lib/utils/formula-parser';

import { slideLayoutFor, hasVisual, CONTENT_LAYOUT, SLIDE_WIDTH } from '@/lib/slide-theme';
import { DEFAULT_THEME, type SlideTheme } from '@/lib/themes';

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
  slideImages?: Record<number, string>,
  theme: SlideTheme = DEFAULT_THEME
): PptxGenJS {
  const { title: TITLE_LAYOUT, content: contentLayout, credit: CREDIT_LAYOUT, counter: SLIDE_COUNTER } = theme.layout;
  const palette = theme.palette;
  const fontFace = theme.typography.exportFace;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // Standard 16:9 modern widescreen: 13.333" x 7.5"

  const slides = presentationData.slides || [];
  const totalSlides = slides.length;

  slides.forEach((slide, idx) => {
    const slideObj = pptx.addSlide();
    const fit = fitSlide(slide, idx, presentationData.originalWriters, theme);

    if (slide.imageMetadata) {
      const credit = describeImageCredit(slide.imageMetadata);
      slideObj.addText(`${credit.heading} — ${credit.creditLine}`, {
        ...CREDIT_LAYOUT, color: palette.muted,
        fontFace, fit: 'shrink',
        hyperlink: { url: credit.sourceLink },
      });
      slideObj.addNotes(credit.notes);
    }

    // 1. Background
    slideObj.background = { fill: palette.background };

    // Slide 1: Special Hero Title Slide Layout
    if (slideLayoutFor(idx) === 'title') {
      // Session Badge
      const partText = (slide.part || 'TITLE PAGE').toUpperCase();
      slideObj.addText(partText, {
        ...TITLE_LAYOUT.part,
        color: palette.secondary,
        bold: true,
        fontFace,
      });

      // Big Title (minimum 40pt, aim 45pt)
      const titleRuns = formulaToTextRuns(slide.title || 'Lesson Presentation');
      slideObj.addText(titleRuns, {
        ...TITLE_LAYOUT.title,
        ...(fit.title.fontSize < TITLE_LAYOUT.title.fontSize && { fontSize: fit.title.fontSize }),
        color: palette.primary,
        bold: true,
        fontFace,
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
            fontSize: titlePointSize(pIdx, fit.body.fontSize, theme),
            color: pIdx === 0 ? palette.heading : palette.muted,
            bold: pIdx === 0 || pt.toLowerCase().includes('writer') || pt.toLowerCase().includes('author'),
          };
          return formulaToTextRuns(pt + (pIdx < contentPoints.length - 1 ? '\n' : '')).map((run) => ({
            ...run, options: { ...pointOptions, ...run.options },
          }));
        });

        slideObj.addText(textItems, {
          ...TITLE_LAYOUT.points,
          ...(fit.body.fontSize < TITLE_LAYOUT.firstPointFontSize && { lineSpacing: fit.body.lineHeightPt }),
          w: slide.imageMetadata ? TITLE_LAYOUT.pointsWithImageWidth : TITLE_LAYOUT.points.w,
          fontFace,
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
        color: palette.subtle,
        align: 'right',
        fontFace,
      });
      return;
    }

    // Slides 2+: Content Slides
    // 2. Part header
    const partText = (slide.part || '').toUpperCase();
    slideObj.addText(partText, {
      ...contentLayout.part,
      color: palette.secondary,
      bold: true,
      fontFace,
    });

    // 3. Title (minimum 40pt, aim 45pt)
    const titleFontSize = slide.title && slide.title.length > contentLayout.longTitleThreshold
      ? contentLayout.longTitleFontSize : contentLayout.title.fontSize;
    const titleRuns = formulaToTextRuns(slide.title || '');
    slideObj.addText(titleRuns, {
      ...contentLayout.title,
      fontSize: fit.title.fontSize < titleFontSize ? fit.title.fontSize : titleFontSize,
      color: palette.primary,
      bold: true,
      fontFace,
      fit: 'shrink',
    });

    // 4. Bullet content (minimum 35pt body text)
    const visual = hasVisual(slide);
    const contentWidth = visual ? contentLayout.bulletsWithVisualWidth : contentLayout.bullets.w;
    const contentPoints = slide.contentPoints || [];
    const textItems: PptxGenJS.TextProps[] = [];
    contentPoints.forEach((pt, pIdx) => {
      const extra: Record<string, unknown> = { bullet: true };
      if (pIdx > 0) extra.breakLine = true;
      textItems.push(...formulaToTextRuns(pt, extra));
    });

    if (textItems.length > 0) {
      slideObj.addText(textItems, {
        ...contentLayout.bullets,
        ...(fit.body.fontSize < contentLayout.bullets.fontSize && { fontSize: fit.body.fontSize, lineSpacing: fit.body.lineHeightPt }),
        w: contentWidth,
        fontFace,
        color: palette.textDark,
        fit: 'shrink',
      });
    }

    // 5. Visual element (occupies <= 40% of slide space)
    if (visual) {
      const imageData = slideImages ? slideImages[idx] : undefined;

      // Always draw a handsome rounded card background container (w: 33% <= 40% of slide space)
      // Classic uses DrawingML's native roundRect radius: omit an override to
      // preserve its exact XML. Other percentages map to inches of the shorter side.
      const radius = parseFloat(theme.shape.visualCornerRadius) / 100;
      const cardWidth = typeof contentLayout.visualCard.w === 'number' ? contentLayout.visualCard.w
        : parseFloat(contentLayout.visualCard.w) * SLIDE_WIDTH / 100;
      slideObj.addShape(radius === 0 ? pptx.ShapeType.rect : pptx.ShapeType.roundRect, {
        ...contentLayout.visualCard,
        ...(theme.shape.visualCornerRadius !== CONTENT_LAYOUT.visualCornerRadius && radius > 0
          && { rectRadius: radius * Math.min(cardWidth, contentLayout.visualCard.h) }),
        fill: { color: palette.cardBackground },
        line: { color: palette.cardBorder, width: theme.shape.visualBorderWidth },
      });

      if (imageData && isUsableImage(imageData)) {
        if (slide.imageMetadata) {
          addLibraryImage(slideObj, imageData, contentLayout.libraryImage);
        } else {
          const rawBase64 = toRawBase64(imageData);
          slideObj.addImage({
            data: `${sniffImageMime(rawBase64)};base64,` + rawBase64,
            ...contentLayout.image,
            sizing: { type: 'contain', ...contentLayout.imageSizing },
          });
        }
      } else {
        // Fallback placeholder text inside container
        const placeholderText =
          '[PHILIPPINES CLASSROOM VISUAL DESIGN]\n\n' + slide.visualDescription;
        slideObj.addText(placeholderText, {
          ...contentLayout.placeholder,
          color: palette.primary,
          italic: true,
          align: 'center',
          valign: 'middle',
          fontFace,
          fit: 'shrink',
        });
      }
    }

    // 6. Slide counter
    slideObj.addText(`Slide ${idx + 1} of ${totalSlides}`, {
      ...SLIDE_COUNTER,
      color: palette.subtle,
      align: 'right',
      fontFace,
    });
  });

  return pptx;
}

export async function buildPresentationPptx(
  presentationData: PresentationData,
  slideImages?: Record<number, string>,
  theme: SlideTheme = DEFAULT_THEME
): Promise<Buffer> {
  const pptx = createPresentationPptx(presentationData, slideImages, theme);
  const output = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}
