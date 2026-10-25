'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { FileDown, FileText, Play, RotateCcw, UserCheck } from 'lucide-react';
import { partLabel } from '@/lib/pedagogy';
import type { useSlideDeck } from '@/lib/deck/use-slide-deck';
import type { useDeckExport } from '@/lib/export/use-deck-export';
import { useSlideSelection } from '@/lib/deck/use-slide-selection';
import { SlideRail } from './SlideRail';
import { SlideStage } from './SlideStage';
import { SlidePanel } from './SlidePanel';
import { SlideSorter } from './SlideSorter';
import { navigateSlides } from './slide-navigation';

export interface PresentationWorkspaceViewProps {
  deck: ReturnType<typeof useSlideDeck>;
  downloads: ReturnType<typeof useDeckExport>;
  session: string;
  onReset: () => void;
  /** Opens the slideshow at a 0-based slide index. */
  onPreview: (slideIndex: number) => void;
}

export function PresentationWorkspaceView({ deck, downloads, session: selectedSession, onReset, onPreview }: PresentationWorkspaceViewProps) {
  const [view, setView] = useState<'normal' | 'sorter'>('normal');
  const workspace = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const focusContent = useRef(false);
  const selection = useSlideSelection(deck.slideIds);
  const {
    presentationData, slideImages, slideIds, generatingImages, imageErrors,
    updatePart, updateTitle, updateBullet, addBullet, insertBullet, deleteBullet, addSlide, deleteSlide,
    regenerateImage, selectLibraryImage, moveSlide, duplicateSlide,
  } = deck;
  const { downloadPptx, downloadMarkdown, isDownloadingPptx, isDownloadingMarkdown } = downloads;
  const selectedIndex = selection.selectedId === null ? -1 : slideIds.indexOf(selection.selectedId);
  const selectedSlide = presentationData?.slides[selectedIndex];
  useLayoutEffect(() => {
    const lostFocus = lastFocus.current && (!lastFocus.current.isConnected || lastFocus.current.matches(':disabled'));
    if (!focusContent.current && !(lostFocus && (document.activeElement === document.body || document.activeElement === lastFocus.current))) return;
    focusContent.current = false;
    const target = view === 'normal' ? '[aria-label="Slide stage"]' : '[aria-current="true"]';
    (workspace.current?.querySelector<HTMLElement>(target) ?? workspace.current?.querySelector<HTMLElement>('button:not(:disabled)'))?.focus({ preventScroll: true });
  });
  const changeView = (mode: typeof view) => { focusContent.current = true; setView(mode); };
  if (!presentationData) return null;

  return (
          <div ref={workspace} className="min-w-0 space-y-3" onFocusCapture={event => { lastFocus.current = event.target as HTMLElement; }} onKeyDown={(event) => { if (view === 'normal') navigateSlides(event, selection); }}>
            {/* Header Control Strip */}
            <div className="bg-white rounded-xl border border-sky-100 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 basis-full space-y-1 lg:basis-0 lg:flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-sky-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs">
                    {selectedSession}
                  </span>
                  <span className="px-3 py-1 bg-sky-100 text-sky-800 font-bold text-xs uppercase tracking-wider rounded-lg">
                    {presentationData.subject}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    {presentationData.slides.length} Sequential Slides Generated
                  </span>
                </div>

                <h2 className="break-words text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {presentationData.topic}
                </h2>

                <div className="flex items-start gap-2 break-words text-xs text-slate-500">
                  <UserCheck className="w-4 h-4 text-sky-600" />
                  <span>Writers: {presentationData.originalWriters || 'JOHN M. NAVARRO'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex max-w-full flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isDownloadingPptx}
                  onClick={downloadPptx}
                  className="px-3 py-2 bg-sky-700 hover:bg-sky-800 active:bg-sky-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors motion-reduce:transition-none"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{isDownloadingPptx ? 'Compiling PPTX...' : 'Download PowerPoint'}</span>
                </button>

                <button
                  type="button"
                  disabled={isDownloadingMarkdown}
                  onClick={downloadMarkdown}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors motion-reduce:transition-none"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isDownloadingMarkdown ? 'Exporting...' : 'Download Outline'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onPreview(Math.max(selectedIndex, 0))}
                  className="px-3 py-2 bg-cyan-700 hover:bg-cyan-800 active:bg-cyan-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors motion-reduce:transition-none"
                >
                  <Play className="w-4 h-4" />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  onClick={onReset}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-colors"
                  title="Reset to New Upload"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>


            {view === 'normal' ? (
              selectedSlide ? (
                <div className="grid min-w-0 gap-2.5 motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:transition-none md:h-[min(760px,calc(100dvh-260px))] md:min-h-[520px] md:grid-cols-[188px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:min-h-[400px] lg:grid-cols-[188px_minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)]">
                  <div className="order-2 grid min-h-0 min-w-0 md:order-1 md:col-start-1 md:row-span-2 md:row-start-1 lg:row-span-1">
                    <SlideRail slides={presentationData.slides} slideIds={slideIds} selectedId={selection.selectedId}
                      onSelect={selection.selectSlide} total={presentationData.slides.length} slideImages={slideImages}
                      onMove={moveSlide}
                      originalWriters={presentationData.originalWriters} />
                  </div>
                  <div className="order-1 grid min-h-0 min-w-0 md:order-2 md:col-start-2 md:row-start-1">
                    <SlideStage key={slideIds[selectedIndex]} slide={selectedSlide} index={selectedIndex} total={presentationData.slides.length}
                      onNext={selection.next} onPrevious={selection.previous}
                      image={slideImages[selectedIndex]} originalWriters={presentationData.originalWriters}
                      onTitleChange={title => updateTitle(slideIds[selectedIndex], title)}
                      onPointChange={(index, text) => updateBullet(slideIds[selectedIndex], index, text)}
                      onPointInsert={index => insertBullet(slideIds[selectedIndex], index)}
                      onPointDelete={index => deleteBullet(slideIds[selectedIndex], index)}
                      onPointAdd={() => addBullet(slideIds[selectedIndex])} />
                  </div>
                  <div className="order-3 grid max-h-[520px] min-h-0 min-w-0 md:col-start-2 md:row-start-2 md:max-h-none lg:col-start-3 lg:row-start-1">
                    <SlidePanel key={selection.selectedId} slide={selectedSlide} slideId={slideIds[selectedIndex]}
                      slideImage={slideImages[selectedIndex]} isGeneratingImage={Boolean(generatingImages[selectedIndex])}
                      imageError={imageErrors[selectedIndex]} onUpdatePart={updatePart} onUpdateTitle={updateTitle}
                      onUpdateBullet={updateBullet} onAddBullet={addBullet} onDeleteBullet={deleteBullet}
                      onDeleteSlide={deleteSlide} onAddSlide={() => addSlide(slideIds[selectedIndex])}
                      onRegenerateImage={regenerateImage} onSelectImage={selectLibraryImage}
                      originalWriters={presentationData.originalWriters} slideIndex={selectedIndex} totalSlides={presentationData.slides.length}
                      onMoveSlide={moveSlide} onDuplicateSlide={duplicateSlide} />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
                  <p className="mb-3">No slides yet.</p>
                  <button type="button" onClick={() => addSlide()} className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-bold text-white">+ Add Slide</button>
                </div>
              )
            ) : (
              <SlideSorter slides={presentationData.slides} slideIds={slideIds} selectedId={selection.selectedId}
                onSelect={selection.selectSlide} onOpen={(id) => { selection.selectSlide(id); changeView('normal'); }}
                onMove={moveSlide} onDuplicate={duplicateSlide} onDelete={deleteSlide}
                slideImages={slideImages} originalWriters={presentationData.originalWriters} />
            )}
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              <span role="status" aria-live="polite" aria-atomic="true">
                {selectedSlide ? `Slide ${selectedIndex + 1} of ${presentationData.slides.length} · ${partLabel(selectedSlide.part)}` : 'No slides'}
              </span>
              <div role="group" aria-label="Slide navigation" className="flex flex-wrap items-center gap-2">
                <button type="button" aria-label="Previous slide" onClick={selection.previous} disabled={selectedIndex <= 0}
                  className="min-h-9 rounded-lg border border-slate-500 px-3 font-bold disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                <button type="button" aria-label="Next slide" onClick={selection.next} disabled={selectedIndex < 0 || selectedIndex >= slideIds.length - 1}
                  className="min-h-9 rounded-lg border border-slate-500 px-3 font-bold disabled:cursor-not-allowed disabled:opacity-40">Next</button>
              </div>
              <div role="group" aria-label="Workspace view" className="inline-flex overflow-hidden rounded-lg border border-slate-200">
                {(['normal', 'sorter'] as const).map((mode) => (
                  <button key={mode} type="button" aria-pressed={view === mode} onClick={() => changeView(mode)}
                    className={`min-h-9 px-3 font-bold transition-colors motion-reduce:transition-none ${view === mode ? 'bg-sky-700 text-white' : 'bg-white text-slate-600 hover:bg-sky-50'}`}>
                    {mode === 'normal' ? 'Normal' : 'Slide sorter'}
                  </button>
                ))}
              </div>
            </div>
          </div>
  );
}
