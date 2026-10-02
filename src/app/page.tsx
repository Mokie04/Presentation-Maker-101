'use client';

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
import type { PresentationData, SlideData } from '@/types/presentation';

async function compressImageForExport(base64: string): Promise<string> {
  if (typeof window === 'undefined') return base64;
  if (!base64 || base64 === 'failed') return base64;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const maxDim = 800;
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
          resolve(base64);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        const compressedBase64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
        resolve(compressedBase64);
      } catch {
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
  });
}

function PresentationWorkspace() {
  const [extractedText, setExtractedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [presentationData, setPresentationData] = useState<PresentationData | null>(null);
  const [slideImages, setSlideImages] = useState<Record<number, string>>({});
  const [generatingImages, setGeneratingImages] = useState<Record<number, boolean>>({});

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
  const handleGenerate = async (text: string, session: string) => {
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
        body: JSON.stringify({ text, session }),
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

      setPresentationData(data);
      setSlideImages({});
      setIsEditing(false);

      // Auto-trigger background batch image generation
      triggerBatchImageGeneration(data.slides);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred during generation.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
      setLoadingStage('');
    }
  };

  // Background batch image generation for eligible slides
  const triggerBatchImageGeneration = (slides: SlideData[]) => {
    const slidesForBatch = slides.map((s, index) => ({
      slideIndex: index,
      part: s.part,
      visualDescription: s.visualDescription,
    }));

    fetch('/api/generate-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides: slidesForBatch }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(errText || 'Batch image generation failed');
        }
        return res.json();
      })
      .then((data) => {
        if (data?.images) {
          setSlideImages((prev) => ({ ...prev, ...data.images }));
        }
      })
      .catch((err) => {
        console.error('Batch image generation error:', err);
      });
  };

  // Single slide image generation / regeneration
  const handleRegenerateImage = async (slideIndex: number, visualDescription: string) => {
    setGeneratingImages((prev) => ({ ...prev, [slideIndex]: true }));
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: visualDescription, slideIndex }),
      });
      const resText = await res.text();
      let data: { base64?: string; error?: string } = {};
      try {
        data = JSON.parse(resText) as { base64?: string; error?: string };
      } catch {
        throw new Error(resText.slice(0, 120) || 'Failed to parse image response');
      }
      if (!res.ok || !data.base64) {
        throw new Error(data.error || 'Failed to render image.');
      }
      setSlideImages((prev) => ({ ...prev, [slideIndex]: data.base64! }));
    } catch (err) {
      console.error('Image regeneration failed:', err);
      setSlideImages((prev) => ({ ...prev, [slideIndex]: 'failed' }));
    } finally {
      setGeneratingImages((prev) => ({ ...prev, [slideIndex]: false }));
    }
  };

  // Slide Edit Handlers
  const handleUpdatePart = (slideIndex: number, newPart: string) => {
    if (!presentationData) return;
    const updated = [...presentationData.slides];
    updated[slideIndex] = { ...updated[slideIndex], part: newPart };
    setPresentationData({ ...presentationData, slides: updated });
  };

  const handleUpdateTitle = (slideIndex: number, newTitle: string) => {
    if (!presentationData) return;
    const updated = [...presentationData.slides];
    updated[slideIndex] = { ...updated[slideIndex], title: newTitle };
    setPresentationData({ ...presentationData, slides: updated });
  };

  const handleUpdateBullet = (slideIndex: number, bulletIndex: number, text: string) => {
    if (!presentationData) return;
    const updated = [...presentationData.slides];
    const points = [...updated[slideIndex].contentPoints];
    points[bulletIndex] = text;
    updated[slideIndex] = { ...updated[slideIndex], contentPoints: points };
    setPresentationData({ ...presentationData, slides: updated });
  };

  const handleAddBullet = (slideIndex: number) => {
    if (!presentationData) return;
    const updated = [...presentationData.slides];
    const points = [...updated[slideIndex].contentPoints, 'New primary discussion point'];
    updated[slideIndex] = { ...updated[slideIndex], contentPoints: points };
    setPresentationData({ ...presentationData, slides: updated });
  };

  const handleDeleteBullet = (slideIndex: number, bulletIndex: number) => {
    if (!presentationData) return;
    const updated = [...presentationData.slides];
    const points = updated[slideIndex].contentPoints.filter((_, idx) => idx !== bulletIndex);
    updated[slideIndex] = { ...updated[slideIndex], contentPoints: points };
    setPresentationData({ ...presentationData, slides: updated });
  };

  const handleDeleteSlide = (slideIndex: number) => {
    if (!presentationData) return;
    const updated = presentationData.slides
      .filter((_, idx) => idx !== slideIndex)
      .map((s, idx) => ({ ...s, slideNumber: idx + 1 }));
    setPresentationData({ ...presentationData, slides: updated });
  };

  const handleAddSlide = () => {
    if (!presentationData) return;
    const newSlide: SlideData = {
      slideNumber: presentationData.slides.length + 1,
      part: 'Discussion',
      title: 'New Slide Topic',
      contentPoints: ['Key takeaway for learners', 'Guided classroom discussion question'],
      visualDescription: 'Philippine classroom illustration showing interactive group discussion',
    };
    setPresentationData({
      ...presentationData,
      slides: [...presentationData.slides, newSlide],
    });
  };

  // Download Handlers
  const handleDownloadPptx = async () => {
    if (!presentationData) return;
    setIsDownloadingPptx(true);
    const filename = `${presentationData.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${selectedSession.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_SayunaAI.pptx`;

    try {
      // Compress slide images client-side before sending to keep payload well within Vercel's 4.5MB limit
      const optimizedImages: Record<number, string> = {};
      const entries = Object.entries(slideImages);
      await Promise.all(
        entries.map(async ([key, val]) => {
          const idx = Number(key);
          if (val && val !== 'failed') {
            optimizedImages[idx] = await compressImageForExport(val);
          } else {
            optimizedImages[idx] = val;
          }
        })
      );

      const res = await fetch('/api/download-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentationData,
          slideImages: optimizedImages,
          session: selectedSession,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        let errMsg = 'Failed to download PowerPoint.';
        try {
          errMsg = JSON.parse(errText).error || errMsg;
        } catch {
          if (errText) errMsg = errText.slice(0, 150);
        }
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error generating PPTX file.');
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
        const errText = await res.text().catch(() => '');
        let errMsg = 'Failed to download Markdown outline.';
        try {
          errMsg = JSON.parse(errText).error || errMsg;
        } catch {
          if (errText) errMsg = errText.slice(0, 150);
        }
        throw new Error(errMsg);
      }

      const text = await res.text();
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const disposition = res.headers.get('Content-Disposition');
      let filename = `${presentationData.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${selectedSession.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_Outline.md`;
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error generating Markdown outline.');
    } finally {
      setIsDownloadingMd(false);
    }
  };

  const handleReset = () => {
    setPresentationData(null);
    setSlideImages({});
    setExtractedText('');
    setFileName('');
    setSelectedSession('');
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
                  onClick={handleAddSlide}
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
              {presentationData.slides.map((slide, idx) => (
                <SlideCard
                  key={idx}
                  slide={slide}
                  index={idx}
                  totalSlides={presentationData.slides.length}
                  isEditing={isEditing}
                  slideImage={slideImages[idx]}
                  isGeneratingImage={Boolean(generatingImages[idx])}
                  onUpdatePart={handleUpdatePart}
                  onUpdateTitle={handleUpdateTitle}
                  onUpdateBullet={handleUpdateBullet}
                  onAddBullet={handleAddBullet}
                  onDeleteBullet={handleDeleteBullet}
                  onDeleteSlide={handleDeleteSlide}
                  onRegenerateImage={handleRegenerateImage}
                />
              ))}
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
