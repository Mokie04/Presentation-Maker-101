import PptxGenJS from 'pptxgenjs';
import type { PresentationData } from '@/types/presentation';

export const SHADE_PRIMARY = '0284C7';
export const SHADE_SECONDARY = '06B6D4';
export const SHADE_BACKGROUND = 'F0F9FF';
export const SHADE_TEXT_DARK = '0F172A';
export const FALLBACK_BG = 'E0F2FE';
export const FALLBACK_BORDER = '7DD3FC';

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
      const partText = (slide.part || 'WELCOME').toUpperCase();
      slideObj.addText(partText, {
        x: 0.8,
        y: 1.2,
        w: '85%',
        h: 0.4,
        fontSize: 14,
        color: SHADE_SECONDARY,
        bold: true,
        fontFace: 'Calibri',
      });

      // Big Title
      slideObj.addText(slide.title || 'Lesson Presentation', {
        x: 0.8,
        y: 1.7,
        w: '85%',
        h: 1.6,
        fontSize: 36,
        color: SHADE_PRIMARY,
        bold: true,
        fontFace: 'Century Gothic',
      });

      // Subtitle / Writers Attribution (Clean un-bulleted card layout)
      const contentPoints = slide.contentPoints || [];
      if (contentPoints.length > 0) {
        const textItems = contentPoints.map((pt, pIdx) => ({
          text: pt + (pIdx < contentPoints.length - 1 ? '\n' : ''),
          options: {
            fontSize: pIdx === 0 ? 20 : 16,
            color: pIdx === 0 ? '334155' : '64748B',
            bold: pIdx === 0,
          },
        }));

        slideObj.addText(textItems, {
          x: 0.8,
          y: 3.5,
          w: '85%',
          h: 2.2,
          fontFace: 'Calibri',
          lineSpacing: 26,
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
        fontFace: 'Calibri',
      });
      return;
    }

    // Slides 2+: Content Slides
    // 2. Part header
    const partText = (slide.part || '').toUpperCase();
    slideObj.addText(partText, {
      x: 0.8,
      y: 0.5,
      w: '85%',
      h: 0.35,
      fontSize: 13,
      color: SHADE_SECONDARY,
      bold: true,
      fontFace: 'Calibri',
    });

    // 3. Title
    slideObj.addText(slide.title || '', {
      x: 0.8,
      y: 0.9,
      w: '85%',
      h: 0.95,
      fontSize: 30,
      color: SHADE_PRIMARY,
      bold: true,
      fontFace: 'Century Gothic',
    });

    // 4. Bullet content
    const hasVisual = Boolean(slide.visualDescription && slide.visualDescription.trim().length > 0);
    const contentWidth = hasVisual ? '55%' : '88%';
    const contentPoints = slide.contentPoints || [];
    const textItems = contentPoints.map((pt) => ({
      text: pt,
      options: { bullet: true },
    }));

    if (textItems.length > 0) {
      slideObj.addText(textItems, {
        x: 0.8,
        y: 2.1,
        w: contentWidth,
        h: 4.5,
        lineSpacing: 28,
        fontFace: 'Calibri',
        fontSize: 18,
        color: SHADE_TEXT_DARK,
      });
    }

    // 5. Visual element (if slide.visualDescription is present)
    if (hasVisual) {
      const imageData = slideImages ? slideImages[idx] : undefined;

      // Always draw a handsome rounded card background container
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
          fontSize: 12,
          color: SHADE_PRIMARY,
          italic: true,
          align: 'center',
          valign: 'middle',
          fontFace: 'Calibri',
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
      fontFace: 'Calibri',
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
