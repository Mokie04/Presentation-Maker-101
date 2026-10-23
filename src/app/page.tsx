'use client';

import type { SupportedSubject } from '@/lib/utils/subject-options';

import React, { useState } from 'react';
import {
  FileDown,
  FileText,
  Play,
  RotateCcw,
  Edit3,
  Eye,
  Plus,
  UserCheck,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { UploadSection } from '@/components/UploadSection';
import { SlideCard } from '@/components/SlideCard';
import { SlideshowModal } from '@/components/SlideshowModal';
import { SessionGate } from '@/components/SessionGate';
import { useSlideDeck } from '@/lib/deck/use-slide-deck';
import { downloadBlob, readErrorMessage } from '@/lib/export/client';
import { exportFilename } from '@/lib/export/filename';
import { isUsableImage, toDataUrl, toRawBase64 } from '@/lib/slide-image';
import type { PresentationData } from '@/types/presentation';

async function compressImageForExport(base64: string): Promise<string> {
  if (typeof window === 'undefined') return base64;
  if (!isUsableImage(base64)) return base64;
  return new Promise((resolve) => {
    const img = new Image();
    // Only set crossOrigin for remote http(s) URLs; setting on data: URIs taints canvas in WebKit
    if (base64.startsWith('http://') || base64.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        // 480px is optimal for ~4" slide visual container at standard presentation DPI
        const maxDim = 480;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64.length > 150000 ? '' : base64);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        const compressedBase64 = toRawBase64(dataUrl);
        resolve(compressedBase64);
      } catch {
        resolve(base64.length > 150000 ? '' : base64);
      }
    };
    img.onerror = () => resolve(base64.length > 150000 ? '' : base64);
    img.src = toDataUrl(base64);
  });
}

function PresentationWorkspace() {
  const [extractedText, setExtractedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<SupportedSubject | ''>('');
  const {
    presentationData, slideImages, generatingImages, imageErrors, slideIds, loadPresentation, reset: resetDeck,
    updatePart, updateTitle, updateBullet, addBullet, deleteBullet, addSlide, deleteSlide,
    regenerateImage, selectLibraryImage,
  } = useSlideDeck();

  const [isEditing, setIsEditing] = useState(false);
  const [isSlideShowActive, setIsSlideShowActive] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDownloadingPptx, setIsDownloadingPptx] = useState(false);
  const [isDownloadingMd, setIsDownloadingMd] = useState(false);

  // Handle successful document upload or paste
  const handleUploadSuccess = (text: string, name: string) => {
    setExtractedText(text);
    setFileName(name);
    setErrorMsg('');
  };

  // Generate Presentation Flow
  const handleGenerate = async (text: string, session: string, subject?: SupportedSubject) => {
    setIsLoading(true);
    setErrorMsg('');
    setLoadingStage('Analyzing curriculum & instructional structure...');

    try {
      const stageTimer1 = setTimeout(() => {
        setLoadingStage('Architecting 25+ comprehensive slides (Review, Motivation, Lesson, Discussion, Activities, Assessment)...');
      }, 1200);

      const stageTimer2 = setTimeout(() => {
        setLoadingStage('Synthesizing Philippine pedagogical diagrams and questions...');
      }, 3500);

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, session,
          ...(subject ? { subject, subjectSource: 'teacher-supplied' } : {}),
        }),
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      const resText = await res.text();
      let data: (PresentationData & { error?: string }) | null = null;
      try {
        data = JSON.parse(resText) as PresentationData & { error?: string };
      } catch {
        if (res.status === 504 || resText.includes('FUNCTION_INVOCATION_TIMEOUT') || resText.toLowerCase().includes('timeout')) {
          throw new Error(
            'The presentation generation timed out. Generating 25+ comprehensive slides can take longer than the server limit. Please try again with a focused section or retry shortly.'
          );
        }
        throw new Error(resText.slice(0, 150) || `Server error (${res.status})`);
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to generate presentation slides.');
      }

      setIsEditing(false);
      // Loads the deck and auto-triggers background batch image generation
      loadPresentation(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred during generation.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
      setLoadingStage('');
    }
  };

  // Download Handlers
  const handleDownloadPptx = async () => {
    if (!presentationData) return;
    setIsDownloadingPptx(true);
    const filename = exportFilename({ topic: presentationData.topic, session: selectedSession, suffix: 'SayunaAI.pptx' });

    try {
      // Compress slide images client-side before sending to keep payload well within Vercel's 4.5MB limit
      const optimizedImages: Record<number, string> = {};
      const entries = Object.entries(slideImages);
      await Promise.all(
        entries.map(async ([key, val]) => {
          const idx = Number(key);
          if (isUsableImage(val)) {
            optimizedImages[idx] = await compressImageForExport(val);
          } else {
            optimizedImages[idx] = val;
          }
        })
      );

      // Enforce a strict 3.5MB payload budget to stay safely within Vercel's 4.5MB request limit
      const payload: {
        presentationData: PresentationData;
        slideImages: Record<number, string>;
        session: string;
      } = {
        presentationData,
        slideImages: optimizedImages,
        session: selectedSession,
      };

      let bodyString = JSON.stringify(payload);
      if (bodyString.length > 3.5 * 1024 * 1024) {
        // If total JSON exceeds 3.5MB, progressively trim non-essential images starting from last slides
        const imageKeys = Object.keys(optimizedImages).map(Number).sort((a, b) => b - a);
        for (const key of imageKeys) {
          if (bodyString.length <= 3.5 * 1024 * 1024) break;
          delete optimizedImages[key];
          payload.slideImages = optimizedImages;
          bodyString = JSON.stringify(payload);
        }
      }

      const res = await fetch('/api/download-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyString,
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, 'Failed to download PowerPoint.'));
      }

      downloadBlob(await res.blob(), filename);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        alert(
          'Network connection interrupted during download. Please try downloading again or use the Markdown outline.'
        );
      } else {
        alert(msg || 'Error generating PPTX file.');
      }
    } finally {
      setIsDownloadingPptx(false);
    }
  };

  const handleDownloadMarkdown = async () => {
    if (!presentationData) return;
    setIsDownloadingMd(true);
    try {
      const res = await fetch('/api/download-markdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentationData,
          session: selectedSession,
        }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, 'Failed to download Markdown outline.'));
      }

      const text = await res.text();
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });

      const disposition = res.headers.get('Content-Disposition');
      let filename = exportFilename({ topic: presentationData.topic, session: selectedSession, suffix: 'Outline.md' });
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      downloadBlob(blob, filename);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error generating Markdown outline.');
    } finally {
      setIsDownloadingMd(false);
    }
  };

  const handleReset = () => {
    resetDeck();
    setExtractedText('');
    setFileName('');
    setSelectedSession('');
    setSelectedSubject('');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-sky-200 selection:text-sky-950">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Upload & Session Setup View */}
        {!presentationData ? (
          <UploadSection
            extractedText={extractedText}
            fileName={fileName}
            onUploadSuccess={handleUploadSuccess}
            selectedSession={selectedSession}
            onSessionChange={setSelectedSession}
            selectedSubject={selectedSubject}
            onSubjectChange={setSelectedSubject}
            onGenerate={handleGenerate}
            isLoading={isLoading}
            loadingStage={loadingStage}
            errorMsg={errorMsg}
          />
        ) : (
          /* Presentation Workspace View */
          <div className="space-y-6">
            {/* Header Control Strip */}
            <div className="bg-white rounded-2xl shadow-md border border-sky-100 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-sky-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs">
                    {selectedSession}
                  </span>
                  <span className="px-3 py-1 bg-sky-100 text-sky-800 font-bold text-xs uppercase tracking-wider rounded-lg">
                    {presentationData.subject}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    {presentationData.slides.length} Sequential Slides Generated
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {presentationData.topic}
                </h2>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
                  <UserCheck className="w-4 h-4 text-sky-600" />
                  <span>Writers: {presentationData.originalWriters || 'JOHN M. NAVARRO'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isDownloadingPptx}
                  onClick={handleDownloadPptx}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{isDownloadingPptx ? 'Compiling PPTX...' : 'Download PowerPoint'}</span>
                </button>

                <button
                  type="button"
                  disabled={isDownloadingMd}
                  onClick={handleDownloadMarkdown}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isDownloadingMd ? 'Exporting...' : 'Download Outline'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentSlideIndex(0);
                    setIsSlideShowActive(true);
                  }}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-colors"
                  title="Reset to New Upload"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slide Action Strip */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    isEditing
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {isEditing ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Slides View</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Slides</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={addSlide}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-600" />
                  <span>+ Add Slide</span>
                </button>
              </div>

              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {presentationData.slides.length} Slides Total
              </span>
            </div>

            {/* Responsive Slides Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {presentationData.slides.map((slide, idx) => {
                return <SlideCard
                  key={slideIds[idx]}
                  slide={slide}
                  slideId={slideIds[idx]}
                  totalSlides={presentationData.slides.length}
                  isEditing={isEditing}
                  slideImage={slideImages[idx]}
                  isGeneratingImage={Boolean(generatingImages[idx])}
                  imageError={imageErrors[idx]}
                  onUpdatePart={updatePart}
                  onUpdateTitle={updateTitle}
                  onUpdateBullet={updateBullet}
                  onAddBullet={addBullet}
                  onDeleteBullet={deleteBullet}
                  onDeleteSlide={deleteSlide}
                  onRegenerateImage={regenerateImage}
                  onSelectImage={selectLibraryImage}
                />;
              })}
            </div>
          </div>
        )}

        {/* Fullscreen Slideshow Modal */}
        {presentationData && (
          <SlideshowModal
            isOpen={isSlideShowActive}
            onClose={() => setIsSlideShowActive(false)}
            presentationData={presentationData}
            session={selectedSession}
            slideImages={slideImages}
            initialIndex={currentSlideIndex}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <SessionGate>
      <PresentationWorkspace />
    </SessionGate>
  );
}
