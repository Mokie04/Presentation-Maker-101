'use client';

import { useState } from 'react';
import type { PresentationData } from '@/types/presentation';
import { buildPptxExportRequest } from './build-export-request';
import { downloadBlob, readErrorMessage } from './client';
import { compressImageForExport } from './compress-image';
import { exportFilename } from './filename';

const NETWORK_INTERRUPTED =
  'Network connection interrupted during download. Please try downloading again or use the Markdown outline.';

export function useDeckExport({ presentationData, slideImages, session, themeId, onError }: {
  presentationData: PresentationData | null;
  slideImages: Record<number, string>;
  session: string;
  themeId?: string;
  onError: (message: string) => void;
}) {
  const [isDownloadingPptx, setIsDownloadingPptx] = useState(false);
  const [isDownloadingMarkdown, setIsDownloadingMarkdown] = useState(false);
  const [notice, setNotice] = useState<{ data: PresentationData; session: string; message: string } | null>(null);
  const pptxNotice = notice?.data === presentationData && notice?.session === session ? notice.message : null;

  const downloadPptx = async () => {
    if (!presentationData) return;
    setNotice(null);
    setIsDownloadingPptx(true);
    const filename = exportFilename({ topic: presentationData.topic, session, suffix: 'SayunaAI.pptx' });

    try {
      const { body, droppedImageIndexes } = await buildPptxExportRequest(
        { presentationData, slideImages, session, themeId },
        { compress: compressImageForExport }
      );

      const res = await fetch('/api/download-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, 'Failed to download PowerPoint.'));
      }

      downloadBlob(await res.blob(), filename);
      if (droppedImageIndexes.length) {
        const slides = droppedImageIndexes.map((index) => index + 1).sort((a, b) => a - b);
        const slideList = slides.length === 1 ? String(slides[0]) : `${slides.slice(0, -1).join(', ')} and ${slides.at(-1)}`;
        const count = slides.length;
        setNotice({ data: presentationData, session, message: `${count} ${count === 1 ? 'picture was' : 'pictures were'} left out of the PowerPoint (${count === 1 ? 'slide' : 'slides'} ${slideList}).` });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        onError(NETWORK_INTERRUPTED);
      } else {
        onError(msg || 'Error generating PPTX file.');
      }
    } finally {
      setIsDownloadingPptx(false);
    }
  };

  const downloadMarkdown = async () => {
    if (!presentationData) return;
    setIsDownloadingMarkdown(true);
    try {
      const res = await fetch('/api/download-markdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentationData,
          session,
        }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, 'Failed to download Markdown outline.'));
      }

      const text = await res.text();
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });

      const disposition = res.headers.get('Content-Disposition');
      let filename = exportFilename({ topic: presentationData.topic, session, suffix: 'Outline.md' });
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      downloadBlob(blob, filename);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error generating Markdown outline.');
    } finally {
      setIsDownloadingMarkdown(false);
    }
  };

  return { downloadPptx, downloadMarkdown, isDownloadingPptx, isDownloadingMarkdown, pptxNotice, dismissPptxNotice: () => setNotice(null) };
}
