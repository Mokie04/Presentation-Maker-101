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
  pptx.layout = 'LAYOUT_16x9';

  const slides = presentationData.slides || [];
  const totalSlides = slides.length;

  slides.forEach((slide, idx) => {
    const slideObj = pptx.addSlide();

    // 1. Background
    slideObj.background = { fill: SHADE_BACKGROUND };

    // 2. Part header
    const partText = (slide.part || '').toUpperCase();
    slideObj.addText(partText, {
      x: 0.6,
      y: 0.4,
      w: '90%',
      h: 0.3,
      fontSize: 11,
      color: SHADE_SECONDARY,
      bold: true,
      fontFace: 'Arial',
    });

    // 3. Title
    slideObj.addText(slide.title || '', {
      x: 0.6,
      y: 0.8,
      w: '90%',
      h: 0.9,
      fontSize: 26,
      color: SHADE_PRIMARY,
      bold: true,
      fontFace: 'Arial',
    });

    // 4. Bullet content
    const hasVisual = Boolean(slide.visualDescription && slide.visualDescription.trim().length > 0);
    const contentWidth = hasVisual ? '54%' : '88%';
    const contentPoints = slide.contentPoints || [];
    const textItems = contentPoints.map((pt) => ({
      text: pt,
      options: { bullet: true },
    }));

    if (textItems.length > 0) {
      slideObj.addText(textItems, {
        x: 0.6,
        y: 1.9,
        w: contentWidth,
        h: 4.5,
        lineSpacing: 24,
        fontFace: 'Arial',
        fontSize: 15,
        color: SHADE_TEXT_DARK,
      });
    }

    // 5. Visual element (if slide.visualDescription is present)
    if (hasVisual) {
      const imageData = slideImages ? slideImages[idx] : undefined;

      if (imageData && imageData !== 'failed') {
        const rawBase64 = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        const isJpeg = rawBase64.startsWith('/9j/');
        const mime = isJpeg ? 'image/jpeg' : 'image/png';
        slideObj.addImage({
          data: `${mime};base64,` + rawBase64,
          x: '63%',
          y: 1.9,
          w: '32%',
          h: 4.2,
        });
      } else {
        // Fallback shape
        slideObj.addShape(pptx.ShapeType.roundRect, {
          x: '63%',
          y: 1.9,
          w: '32%',
          h: 4.2,
          fill: { color: FALLBACK_BG },
          line: { color: FALLBACK_BORDER, width: 1.5 },
        });

        // Fallback placeholder text
        const placeholderText =
          '[PHILIPPINES CLASSROOM VISUAL DESIGN]\n\n' + slide.visualDescription;
        slideObj.addText(placeholderText, {
          x: '64%',
          y: 2.1,
          w: '30%',
          h: 3.8,
          fontSize: 10,
          color: SHADE_PRIMARY,
          italic: true,
          align: 'center',
          valign: 'middle',
          fontFace: 'Arial',
        });
      }
    }

    // 6. Slide counter
    slideObj.addText(`Slide ${idx + 1} of ${totalSlides}`, {
      x: '80%',
      y: 6.8,
      w: '15%',
      h: 0.3,
      fontSize: 9,
      color: '94A3B8',
      align: 'right',
      fontFace: 'Arial',
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
