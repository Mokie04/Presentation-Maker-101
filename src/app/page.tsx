'use client';

import type { SupportedSubject } from '@/lib/utils/subject-options';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { UploadSection } from '@/components/UploadSection';
import { PresentationWorkspaceView } from '@/components/workspace/PresentationWorkspaceView';
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
  const deck = useSlideDeck();
  const { presentationData, slideImages, loadPresentation, reset: resetDeck } = deck;
  const downloads = useDeckExport({
    presentationData, slideImages, session: selectedSession, onError: (message) => alert(message),
  });

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
    <div className="touch-workspace min-h-screen flex flex-col bg-slate-50 selection:bg-sky-200 selection:text-sky-950">
      <Header />

      <main className={`flex-1 w-full mx-auto px-3 sm:px-4 lg:px-6 py-4 ${presentationData ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
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
          <PresentationWorkspaceView deck={deck} downloads={downloads} session={selectedSession}
            onReset={handleReset} onPreview={() => { setCurrentSlideIndex(0); setIsSlideShowActive(true); }} />
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
