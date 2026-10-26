'use client';

import React, { type CSSProperties, type ReactNode } from 'react';
import { poppins, arimo, gelasio } from '@/lib/fonts';
import type { SlideData } from '@/types/presentation';
import { describeImageCredit } from '@/lib/image-credit';
import { isUsableImage, toDataUrl } from '@/lib/slide-image';
import {
  SLIDE_HEIGHT, SLIDE_WIDTH, SLIDE_WIDTH_PT,
  hasVisual, slideLayoutFor, type SlideBox, type SlideCoordinate,
} from '@/lib/slide-theme';
import { DEFAULT_THEME, DEFAULT_THEME_ID, type SlideTheme } from '@/lib/themes';
import { fitSlide, titleSlidePoints, titlePointSize } from '@/lib/slide-fit';
import { DecorationLayer } from './DecorationLayer';
import { assertValidDecorations, decorationsForSlide } from '@/lib/themes/decoration';
import { FormattedFormula } from './FormattedFormula';

export interface SlideViewProps {
  slide: SlideData;
  theme?: SlideTheme;
  index: number;
  total: number;
  image?: string;
  originalWriters?: string;
  variant?: 'full' | 'thumbnail';
  renderTitle?: (title: ReactNode) => ReactNode;
  renderPoint?: (point: ReactNode, pointIndex: number, editable: boolean) => ReactNode;
}

function percent(value: SlideCoordinate, dimension: number): string {
  return typeof value === 'string' ? value : `${value / dimension * 100}%`;
}

function typeSize(points: number): string {
  return `${points / SLIDE_WIDTH_PT * 100}cqw`;
}

function boxStyle(box: SlideBox): CSSProperties {
  return {
    position: 'absolute',
    left: percent(box.x, SLIDE_WIDTH), top: percent(box.y, SLIDE_HEIGHT),
    width: percent(box.w, SLIDE_WIDTH), height: percent(box.h, SLIDE_HEIGHT),
  };
}

// PptxGenJS text boxes are vertically centred by default. Browser wrapping may differ.
function textStyle(box: SlideBox & { fontSize?: number }): CSSProperties {
  return {
    ...boxStyle(box), display: 'flex', flexDirection: 'column', justifyContent: 'center',
    margin: 0, overflow: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
    ...(box.fontSize !== undefined && { fontSize: typeSize(box.fontSize) }),
  };
}

/** A passive slide preview. Phase 1 deliberately leaves it unwired from the workspace. */
export function SlideView({ slide, index, total, image, originalWriters, variant = 'full', renderTitle, renderPoint, theme = DEFAULT_THEME }: SlideViewProps) {
  const { title: TITLE_LAYOUT, content: CONTENT_LAYOUT, credit: CREDIT_LAYOUT, counter: SLIDE_COUNTER } = theme.layout;
  if (theme.decorations?.length) assertValidDecorations(theme);
  const behind = decorationsForSlide(theme, slide, index, 'behind');
  const front = decorationsForSlide(theme, slide, index, 'front');
  const palette = theme.palette;
  const titleLayout = slideLayoutFor(index) === 'title';
  const layout = titleLayout ? TITLE_LAYOUT : CONTENT_LAYOUT;
  const visual = !titleLayout && hasVisual(slide);
  const rotation = visual ? theme.shape.pictureRotation ?? 0 : 0;
  const pictureTransform: CSSProperties = rotation ? { transform: `rotate(${rotation}deg)`, transformOrigin: '50% 50%' } : {};
  const usableImage = isUsableImage(image);
  const showImage = usableImage && (titleLayout ? Boolean(slide.imageMetadata) : visual);
  const credit = slide.imageMetadata ? describeImageCredit(slide.imageMetadata) : undefined;
  const points = titleLayout ? titleSlidePoints(slide, originalWriters) : slide.contentPoints || [];
  const fit = fitSlide(slide, index, originalWriters, theme);
  const overflowStyle = (fits: boolean): CSSProperties => fits ? {} : {
    justifyContent: 'flex-start', overflowY: variant === 'full' ? 'auto' : 'hidden',
  };
  const imageBox = titleLayout ? TITLE_LAYOUT.image
    : slide.imageMetadata ? CONTENT_LAYOUT.libraryImage : CONTENT_LAYOUT.image;
  const title = <FormattedFormula text={slide.title || (titleLayout ? 'Lesson Presentation' : '')} />;
  const pointContent = (point: string, pointIndex: number) => {
    const content = <FormattedFormula text={point} />;
    return renderPoint ? renderPoint(content, pointIndex, pointIndex < slide.contentPoints.length) : content;
  };

  return (
    <div
      role="group"
      aria-label={`Slide ${index + 1} of ${total}`}
      aria-hidden={variant === 'thumbnail' ? true : undefined}
      className={`${poppins.variable} ${arimo.variable} ${gelasio.variable}`}
      style={{
        position: 'relative', width: '100%', aspectRatio: '16 / 9', containerType: 'inline-size',
        overflow: 'hidden', backgroundColor: `#${palette.background}`, color: `#${palette.textDark}`,
        fontFamily: theme.typography.previewFont,
        ...(variant === 'thumbnail' && { pointerEvents: 'none' }),
      }}
    >
      {behind.length > 0 && <DecorationLayer decorations={behind} layer="behind" />}
      <p style={{ ...textStyle(layout.part), color: `#${palette.secondary}`, fontWeight: 700 }}>
        {(slide.part || (titleLayout ? 'TITLE PAGE' : '')).toUpperCase()}
      </p>
      <h2 data-overflow={!fit.title.fits ? "true" : undefined} style={{ ...textStyle(layout.title), ...overflowStyle(fit.title.fits), fontSize: typeSize(fit.title.fontSize), ...(theme.id !== DEFAULT_THEME_ID && { lineHeight: typeSize(fit.title.lineHeightPt) }), color: `#${palette.primary}`, fontWeight: 700 }}>
        {renderTitle ? renderTitle(title) : title}
      </h2>

      {titleLayout ? (
        <div data-overflow={!fit.body.fits ? "true" : undefined} style={{
          ...textStyle(TITLE_LAYOUT.points), ...overflowStyle(fit.body.fits),
          width: slide.imageMetadata ? TITLE_LAYOUT.pointsWithImageWidth : TITLE_LAYOUT.points.w,
          lineHeight: typeSize(fit.body.lineHeightPt),
        }}>
          {points.map((point, pointIndex) => (
            <p key={pointIndex} style={{
              margin: 0, ...(!fit.body.fits && { flexShrink: 0 }),
              fontSize: typeSize(titlePointSize(pointIndex, fit.body.fontSize, theme)),
              color: `#${pointIndex === 0 ? palette.heading : palette.muted}`,
              fontWeight: pointIndex === 0 || /writer|author/i.test(point) ? 700 : 400,
            }}>
              {pointContent(point, pointIndex)}
            </p>
          ))}
        </div>
      ) : (
        <ul data-overflow={!fit.body.fits ? "true" : undefined} style={{
          ...textStyle(CONTENT_LAYOUT.bullets), ...overflowStyle(fit.body.fits),
          fontSize: typeSize(fit.body.fontSize),
          width: visual ? CONTENT_LAYOUT.bulletsWithVisualWidth : CONTENT_LAYOUT.bullets.w,
          lineHeight: typeSize(fit.body.lineHeightPt),
          padding: 0, listStylePosition: 'inside', listStyleType: 'disc',
        }}>
          {points.map((point, pointIndex) => <li key={pointIndex} style={!fit.body.fits ? { flexShrink: 0 } : undefined}>{pointContent(point, pointIndex)}</li>)}
        </ul>
      )}

      {visual && <div aria-hidden="true" style={{
        ...boxStyle(CONTENT_LAYOUT.visualCard), backgroundColor: `#${palette.cardBackground}`,
        border: `${typeSize(theme.shape.visualBorderWidth)} solid #${palette.cardBorder}`,
        borderRadius: theme.shape.visualCornerRadius, ...pictureTransform,
      }} />}
      {showImage ? (
        // Inline base64 images mirror the SlideImageControls image contract.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={toDataUrl(image!)} alt={slide.visualDescription || slide.title}
          className={slide.imageMetadata?.source === 'commons' ? 'object-contain' : 'object-cover'}
          style={{ ...boxStyle(imageBox), ...pictureTransform }} />
      ) : visual && (
        <p style={{ ...textStyle(CONTENT_LAYOUT.placeholder), ...pictureTransform, color: `#${palette.primary}`, fontStyle: 'italic', textAlign: 'center' }}>
          {'[PHILIPPINES CLASSROOM VISUAL DESIGN]\n\n' + slide.visualDescription}
        </p>
      )}
      {credit && <p style={{ ...textStyle(CREDIT_LAYOUT), color: `#${palette.muted}` }}>
        {credit.heading} — {credit.creditLine}
      </p>}
      <p style={{ ...textStyle(SLIDE_COUNTER), color: `#${palette.subtle}`, textAlign: 'right' }}>
        Slide {index + 1} of {total}
      </p>
      {front.length > 0 && <DecorationLayer decorations={front} layer="front" />}
    </div>
  );
}
