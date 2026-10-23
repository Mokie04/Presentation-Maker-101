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
import { useDeckExport } from '@/lib/export/use-deck-export';
import type { PresentationData } from '@/types/presentation';

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
  const { downloadPptx, downloadMarkdown, isDownloadingPptx, isDownloadingMarkdown } = useDeckExport({
    presentationData, slideImages, session: selectedSession, onError: (message) => alert(message),
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSlideShowActive, setIsSlideShowActive] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
                  onClick={downloadPptx}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{isDownloadingPptx ? 'Compiling PPTX...' : 'Download PowerPoint'}</span>
                </button>

                <button
                  type="button"
                  disabled={isDownloadingMarkdown}
                  onClick={downloadMarkdown}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isDownloadingMarkdown ? 'Exporting...' : 'Download Outline'}</span>
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
