'use client';

import type { SupportedSubject } from '@/lib/utils/subject-options';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { poppins } from '@/lib/fonts';
import { HomeHero } from '@/components/home/HomeHero';
import { HomeTrustStrip } from '@/components/home/HomeTrustStrip';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { UploadSection } from '@/components/UploadSection';
import { PresentationWorkspaceView } from '@/components/workspace/PresentationWorkspaceView';
import { SlideshowModal } from '@/components/SlideshowModal';
import { SessionGate } from '@/components/SessionGate';
import { useSlideDeck } from '@/lib/deck/use-slide-deck';
import { useDeckExport } from '@/lib/export/use-deck-export';
import { generatePresentation } from '@/lib/generate-client';
import { SessionTabs } from '@/components/workspace/SessionTabs';
import { AnotherSessionDialog, ResetSessionsDialog } from '@/components/workspace/SessionDialogs';
import { WHOLE_LESSON, hasSessionMarkers, isWholeLesson, type SessionOption } from '@/lib/utils/session-options';
import { DEFAULT_LESSON_FORMAT, detectLessonFormat, type LessonFormat } from '@/lib/pedagogy';

function PresentationWorkspace() {
  const [extractedText, setExtractedText] = useState('');
  const [fileName, setFileName] = useState('');
  // A plan with no sessions or days in it is taught in one session, so it always builds the whole lesson.
  const planHasSessions = useMemo(() => hasSessionMarkers(extractedText), [extractedText]);
  const [pickedSession, setPickedSession] = useState('');
  const selectedSession = !extractedText.trim() ? '' : planHasSessions ? pickedSession : WHOLE_LESSON;
  const [selectedSubject, setSelectedSubject] = useState<SupportedSubject | ''>('');
  const detectedFormat = useMemo(() => detectLessonFormat(extractedText), [extractedText]);
  const [generatingFormat, setGeneratingFormat] = useState<LessonFormat>(DEFAULT_LESSON_FORMAT);
  const [lesson, setLesson] = useState<{ text: string; name: string; subject: SupportedSubject | '' } | null>(null);
  const [anotherSessionOpen, setAnotherSessionOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const generation = useRef<AbortController | null>(null);
  const focusHomeAfterReset = useRef(false);
  useEffect(() => () => { generation.current?.abort(); }, []);
  const deck = useSlideDeck();
  const { presentationData, slideImages, loadPresentation, reset: resetDeck } = deck;
  useEffect(() => {
    if (!presentationData && focusHomeAfterReset.current) {
      focusHomeAfterReset.current = false;
      document.getElementById('home-title')?.focus({ preventScroll: true });
    }
  }, [presentationData]);
  const downloads = useDeckExport({
    presentationData, slideImages, themeId: deck.themeId, session: deck.activeSession || '', onError: (message) => alert(message),
  });

  const [isSlideShowActive, setIsSlideShowActive] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const slideCount = presentationData?.slides.length ?? 0;
  useEffect(() => {
    if (slideCount === 0) setIsSlideShowActive(false);
  }, [slideCount]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // The lesson text changed through an upload or the paste box
  const handleLessonChange = (text: string, name: string, newLesson: boolean) => {
    setExtractedText(text);
    setFileName(name);
    setErrorMsg('');
    // A new lesson's sessions are not the previous plan's; an edit or a restored plan keeps the pick.
    if (newLesson) setPickedSession('');
  };

  // Generate Presentation Flow
  const handleGenerate = async (text: string, session: string, subject?: SupportedSubject) => {
    setIsLoading(true);
    setErrorMsg('');
    setGeneratingFormat(detectLessonFormat(text));
    const controller = new AbortController();
    generation.current?.abort();
    generation.current = controller;
    try {
      const data = await generatePresentation({ text, session, subject }, controller.signal, setLoadingStage);
      if (generation.current !== controller || controller.signal.aborted) return;
      // Capture submitted inputs, not controls that may have changed while awaiting the response.
      setExtractedText(text);
      setLesson({ text, name: fileName, subject: subject || '' });
      loadPresentation(data, session as SessionOption);
    } catch (err) {
      if (generation.current === controller && !controller.signal.aborted) {
        setErrorMsg(err instanceof Error ? err.message : 'An error occurred during generation.');
      }
    } finally {
      if (generation.current === controller) {
        generation.current = null;
        setIsLoading(false); setLoadingStage('');
      }
    }
  };

  const handleReset = () => {
    focusHomeAfterReset.current = true;
    generation.current?.abort();
    generation.current = null;
    setIsLoading(false);
    setLoadingStage('');
    setAnotherSessionOpen(false);
    setResetConfirmOpen(false);
    setIsSlideShowActive(false);
    setLesson(null);
    resetDeck();
    setExtractedText('');
    setFileName('');
    setPickedSession('');
    setSelectedSubject('');
    setErrorMsg('');
  };

  return (
    <div className={`touch-workspace min-h-screen flex flex-col bg-slate-50 selection:bg-sky-200 selection:text-sky-950 ${!presentationData ? `home-screen ${poppins.variable}` : ''}`}>
      <Header />

      <main className={`flex-1 w-full mx-auto px-3 sm:px-4 lg:px-6 ${presentationData ? 'max-w-[1600px] py-4' : 'max-w-[1180px] pb-6'}`}>
        {/* Upload & Session Setup View */}
        {!presentationData ? (
          <>
          <HomeHero />
          <UploadSection
            extractedText={extractedText}
            fileName={fileName}
            onLessonChange={handleLessonChange}
            selectedSession={selectedSession}
            onSessionChange={setPickedSession}
            planHasSessions={planHasSessions}
            selectedSubject={selectedSubject}
            onSubjectChange={setSelectedSubject}
            detectedFormat={detectedFormat}
            generatingFormat={generatingFormat}
            onGenerate={handleGenerate}
            isLoading={isLoading}
            loadingStage={loadingStage}
            errorMsg={errorMsg}
          />
          <HomeTrustStrip />
          </>
        ) : (
          /* Presentation Workspace View */
          <PresentationWorkspaceView deck={deck} downloads={downloads} session={deck.activeSession!}
            // A whole-lesson deck is the lesson's only deck: no other sessions to switch to or build.
            sessionControls={isWholeLesson(deck.activeSession!) ? undefined : <SessionTabs sessions={deck.sessions} activeSession={deck.activeSession!}
              onSwitch={deck.switchSession} onAnother={() => setAnotherSessionOpen(true)} />}
            onReset={() => { if (deck.sessions.length > 1) setResetConfirmOpen(true); else handleReset(); }} onPreview={(slideIndex) => { setCurrentSlideIndex(slideIndex); setIsSlideShowActive(true); }} />
        )}

        {anotherSessionOpen && deck.activeSession && lesson && (
          <AnotherSessionDialog text={lesson.text} lessonName={lesson.name || 'Lesson'} subject={lesson.subject}
            sessions={deck.sessions} activeSession={deck.activeSession} onClose={() => setAnotherSessionOpen(false)}
            onSuccess={(data, session) => { loadPresentation(data, session); setAnotherSessionOpen(false); }} />
        )}
        {resetConfirmOpen && <ResetSessionsDialog count={deck.sessions.length}
          onClose={() => setResetConfirmOpen(false)} onConfirm={handleReset} />}

        {/* Fullscreen Slideshow Modal */}
        {presentationData && (
          <SlideshowModal
            theme={deck.theme}
            isOpen={isSlideShowActive}
            onClose={() => setIsSlideShowActive(false)}
            presentationData={presentationData}
            session={deck.activeSession!}
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
