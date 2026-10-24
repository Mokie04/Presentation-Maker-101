'use client';

import React, { type CSSProperties, type ReactNode } from 'react';
import localFont from 'next/font/local';
import type { SlideData } from '@/types/presentation';
import { describeImageCredit } from '@/lib/image-credit';
import { isUsableImage, toDataUrl } from '@/lib/slide-image';
import {
  CONTENT_LAYOUT, CREDIT_LAYOUT, FALLBACK_BG, FALLBACK_BORDER, SHADE_BACKGROUND,
  SHADE_PRIMARY, SHADE_SECONDARY, SHADE_TEXT_DARK, SLIDE_COUNTER, SLIDE_HEIGHT,
  SLIDE_WIDTH, SLIDE_WIDTH_PT, TEXT_HEADING, TEXT_MUTED, TEXT_SUBTLE, TITLE_LAYOUT,
  hasVisual, slideLayoutFor, type SlideBox, type SlideCoordinate,
} from '@/lib/slide-theme';
import { FormattedFormula } from './FormattedFormula';

const poppins = localFont({
  src: [
    { path: '../app/fonts/Poppins-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../app/fonts/Poppins-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../app/fonts/Poppins-Italic.ttf', weight: '400', style: 'italic' },
  ],
  variable: '--font-slide-poppins',
  display: 'swap',
  preload: false,
});

export interface SlideViewProps {
  slide: SlideData;
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
export function SlideView({ slide, index, total, image, originalWriters, variant = 'full', renderTitle, renderPoint }: SlideViewProps) {
  const titleLayout = slideLayoutFor(index) === 'title';
  const layout = titleLayout ? TITLE_LAYOUT : CONTENT_LAYOUT;
  const visual = !titleLayout && hasVisual(slide);
  const usableImage = isUsableImage(image);
  const showImage = usableImage && (titleLayout ? Boolean(slide.imageMetadata) : visual);
  const credit = slide.imageMetadata ? describeImageCredit(slide.imageMetadata) : undefined;
  const points = [...(slide.contentPoints || [])];
  if (titleLayout && originalWriters && !points.some((point) =>
    point.toLowerCase().includes('writer') || point.toLowerCase().includes('author') ||
    point.toLowerCase().includes(originalWriters.toLowerCase())
  )) {
    points.push(`Original Lesson Plan Writers: ${originalWriters}`);
  }
  const titleFontSize = !titleLayout && slide.title && slide.title.length > CONTENT_LAYOUT.longTitleThreshold
    ? CONTENT_LAYOUT.longTitleFontSize : layout.title.fontSize;
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
      className={poppins.variable}
      style={{
        position: 'relative', width: '100%', aspectRatio: '16 / 9', containerType: 'inline-size',
        overflow: 'hidden', backgroundColor: `#${SHADE_BACKGROUND}`, color: `#${SHADE_TEXT_DARK}`,
        fontFamily: 'var(--font-slide-poppins), system-ui, sans-serif',
        ...(variant === 'thumbnail' && { pointerEvents: 'none' }),
      }}
    >
      <p style={{ ...textStyle(layout.part), color: `#${SHADE_SECONDARY}`, fontWeight: 700 }}>
        {(slide.part || (titleLayout ? 'TITLE PAGE' : '')).toUpperCase()}
      </p>
      <h2 style={{ ...textStyle(layout.title), fontSize: typeSize(titleFontSize), color: `#${SHADE_PRIMARY}`, fontWeight: 700 }}>
        {renderTitle ? renderTitle(title) : title}
      </h2>

      {titleLayout ? (
        <div style={{
          ...textStyle(TITLE_LAYOUT.points),
          width: slide.imageMetadata ? TITLE_LAYOUT.pointsWithImageWidth : TITLE_LAYOUT.points.w,
          lineHeight: typeSize(TITLE_LAYOUT.points.lineSpacing),
        }}>
          {points.map((point, pointIndex) => (
            <p key={pointIndex} style={{
              margin: 0,
              fontSize: typeSize(pointIndex === 0 ? TITLE_LAYOUT.firstPointFontSize : TITLE_LAYOUT.pointFontSize),
              color: `#${pointIndex === 0 ? TEXT_HEADING : TEXT_MUTED}`,
              fontWeight: pointIndex === 0 || /writer|author/i.test(point) ? 700 : 400,
            }}>
              {pointContent(point, pointIndex)}
            </p>
          ))}
        </div>
      ) : (
        <ul style={{
          ...textStyle(CONTENT_LAYOUT.bullets),
          width: visual ? CONTENT_LAYOUT.bulletsWithVisualWidth : CONTENT_LAYOUT.bullets.w,
          lineHeight: typeSize(CONTENT_LAYOUT.bullets.lineSpacing),
          padding: 0, listStylePosition: 'inside', listStyleType: 'disc',
        }}>
          {points.map((point, pointIndex) => <li key={pointIndex}>{pointContent(point, pointIndex)}</li>)}
        </ul>
      )}

      {visual && <div aria-hidden="true" style={{
        ...boxStyle(CONTENT_LAYOUT.visualCard), backgroundColor: `#${FALLBACK_BG}`,
        border: `${typeSize(CONTENT_LAYOUT.visualBorderWidth)} solid #${FALLBACK_BORDER}`,
        borderRadius: CONTENT_LAYOUT.visualCornerRadius,
      }} />}
      {showImage ? (
        // Inline base64 images mirror the existing SlideCard image contract.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={toDataUrl(image!)} alt={slide.visualDescription || slide.title}
          className={slide.imageMetadata?.source === 'commons' ? 'object-contain' : 'object-cover'}
          style={boxStyle(imageBox)} />
      ) : visual && (
        <p style={{ ...textStyle(CONTENT_LAYOUT.placeholder), color: `#${SHADE_PRIMARY}`, fontStyle: 'italic', textAlign: 'center' }}>
          {'[PHILIPPINES CLASSROOM VISUAL DESIGN]\n\n' + slide.visualDescription}
        </p>
      )}
      {credit && <p style={{ ...textStyle(CREDIT_LAYOUT), color: `#${TEXT_MUTED}` }}>
        {credit.heading} — {credit.creditLine}
      </p>}
      <p style={{ ...textStyle(SLIDE_COUNTER), color: `#${TEXT_SUBTLE}`, textAlign: 'right' }}>
        Slide {index + 1} of {total}
      </p>
    </div>
  );
}
