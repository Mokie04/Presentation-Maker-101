'use client';

import React, { useState, useRef, useId, ChangeEvent, DragEvent } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Clipboard,
  Layers,
  Check,
} from 'lucide-react';
import { GeneratingPanel } from '@/components/home/GeneratingPanel';
import { SESSION_OPTIONS } from '@/lib/utils/session-options';
import { SUPPORTED_SUBJECTS, type SupportedSubject } from '@/lib/utils/subject-options';
import { DEFAULT_MAX_UPLOAD_MB, uploadTooLargeMessage } from '@/lib/upload-limits';

interface UploadSectionProps {
  extractedText: string;
  fileName: string;
  onUploadSuccess: (text: string, fileName: string) => void;
  selectedSession: string;
  onSessionChange: (session: string) => void;
  selectedSubject?: SupportedSubject | '';
  onSubjectChange?: (subject: SupportedSubject | '') => void;
  onGenerate: (text: string, session: string, subject?: SupportedSubject) => void;
  isLoading: boolean;
  loadingStage: string;
  errorMsg?: string;
}

export function UploadSection({
  extractedText,
  fileName,
  onUploadSuccess,
  selectedSession,
  onSessionChange,
  selectedSubject = '',
  onSubjectChange,
  onGenerate,
  isLoading,
  loadingStage,
  errorMsg,
}: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const manualId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    setUploadError(null);
    // The hosting platform rejects larger bodies before the route can explain why.
    if (file.size > DEFAULT_MAX_UPLOAD_MB * 1024 * 1024) {
      setUploadError(uploadTooLargeMessage(file.size));
      return;
    }
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.status === 413) throw new Error(uploadTooLargeMessage());
      const resText = await res.text();
      let data: { text?: string; fileName?: string; error?: string } = {};
      try {
        data = JSON.parse(resText) as { text?: string; fileName?: string; error?: string };
      } catch {
        throw new Error(resText.slice(0, 150) || `Upload failed (${res.status})`);
      }
      if (!res.ok || !data.text) {
        throw new Error(data.error || 'Failed to upload and parse document.');
      }

      onUploadSuccess(data.text, data.fileName || file.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error uploading file.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await processFile(file);
    }
  };

  const handleManualChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setManualInput(val);
    onUploadSuccess(val, 'Pasted Lesson Plan');
  };

  const canGenerate =
    Boolean(extractedText && extractedText.trim().length > 0) &&
    Boolean(selectedSession && selectedSession.trim().length > 0) &&
    !isLoading &&
    !isUploading;

  const hasText = Boolean(extractedText.trim());
  const hint = !hasText && !selectedSession ? 'Add your lesson and choose a session to continue.'
    : !hasText ? 'Add your lesson to continue.' : !selectedSession ? 'Choose a session to continue.'
    : `Ready: ${selectedSession}, subject ${selectedSubject || 'Automatic'}`;

  return (
    <section aria-label="Lesson setup" className="mt-6 rounded-2xl border border-sky-100 bg-white p-1.5 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.25)]">
      {isLoading && <GeneratingPanel loadingStage={loadingStage} />}
      <div className="home-step">
        <StepHeading number={1} done={hasText} title="Upload your lesson plan" hint={`Daily Lesson Logs in .docx, .pdf, .txt or .md, up to ${DEFAULT_MAX_UPLOAD_MB} MB.`} />
        <div className="mt-3 space-y-3 sm:ml-12">
          <button type="button" aria-expanded={showManual} aria-controls={manualId} onClick={() => setShowManual(!showManual)}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-800 transition-colors hover:bg-sky-50">
            <Clipboard className="h-4 w-4" />
            <span>{showManual ? 'Hide Manual Paste' : 'Paste Lesson Plan Text'}</span>
          </button>
          {!showManual ? (
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              className={`relative flex cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed p-5 pb-20 text-center transition-colors sm:flex-row sm:p-6 sm:pr-60 sm:text-left ${isDragging ? 'border-sky-700 bg-sky-100' : 'border-sky-300 bg-gradient-to-b from-white to-sky-50/70 hover:border-sky-700 hover:bg-sky-50'}`}>
              <input hidden ref={fileInputRef} type="file" accept=".docx,.pdf,.txt,.md" onChange={handleFileChange} onClick={event => event.stopPropagation()} className="hidden" />
              {isUploading ? (
                <><Loader2 className="h-9 w-9 shrink-0 animate-spin text-sky-700 motion-reduce:animate-none" /><p className="text-sm font-semibold text-sky-800">Extracting Lesson Plan Content...</p></>
              ) : (
                <><UploadCloud className="h-10 w-10 shrink-0 text-sky-700" /><div>
                  <p className="home-heading text-sm font-bold text-slate-900 sm:text-base">Drag &amp; Drop Lesson Plan Document</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">or click to browse (.docx, .pdf, .txt, .md — up to {DEFAULT_MAX_UPLOAD_MB}MB)</p>
                </div></>
              )}
              <button type="button" aria-label="Choose lesson plan document"
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInputRef.current?.click(); } }}
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-end justify-center rounded-xl p-5 sm:items-center sm:justify-end sm:p-6">
                <span className="flex min-h-11 items-center rounded-lg border border-sky-200 bg-white px-3 text-xs font-semibold text-sky-800">Choose lesson plan document</span>
              </button>
            </div>
          ) : (
            <div id={manualId} className="space-y-2">
              <label htmlFor="manual-lesson-text" className="block text-xs font-bold uppercase tracking-wider text-slate-600">Paste Lesson Plan Content</label>
              <textarea id="manual-lesson-text" value={manualInput} onChange={handleManualChange}
                placeholder="Paste raw lesson plan content here (objectives, parts, activities, questions)..." rows={7}
                className="w-full resize-y rounded-xl border border-slate-400 bg-slate-50/30 p-3.5 font-mono text-xs text-slate-800 placeholder-slate-600 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700 sm:text-sm" />
            </div>
          )}
          {extractedText && fileName && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                <div className="min-w-0"><p className="truncate text-xs font-bold text-slate-900 sm:text-sm">{fileName}</p>
                  <p className="text-xs text-emerald-800">{extractedText.length.toLocaleString()} characters extracted and ready</p></div>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase text-emerald-800">Ready</span>
            </div>
          )}
          {(uploadError || errorMsg) && (
            <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs sm:text-sm font-medium">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>{uploadError || errorMsg}</span>
            </div>
          )}
        </div>
      </div>
      <div className="home-step">
        <StepHeading number={2} done={Boolean(selectedSession)} title="Which session is this deck for?" hint="The deck covers only that session of your lesson plan. You can make the others afterwards." />
        <div role="radiogroup" aria-label="Select Session" className="mt-3 grid grid-cols-5 gap-1.5 sm:ml-12 sm:gap-2">
          {SESSION_OPTIONS.map((session, index) => (
            <label key={session} className="relative min-w-0 cursor-pointer">
              <input type="radio" name={`lesson-session-${manualId}`} value={session} aria-label={session} checked={selectedSession === session}
                onChange={() => onSessionChange(session)} className="peer sr-only" />
              <span aria-hidden="true" className="flex min-h-[60px] min-w-11 flex-col items-center justify-center rounded-xl border border-sky-100 bg-white px-1 py-2 text-sm font-bold text-slate-600 hover:border-sky-500 peer-checked:border-sky-700 peer-checked:bg-sky-700 peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-700">
                <span>{index + 1}</span><span className="text-[11px] font-normal">Session</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="home-step">
        <StepHeading number={3} done={hasText && Boolean(selectedSession)} title="Subject and generate" hint="Leave on Automatic and we detect it from your lesson." />
        <div className="mt-3 sm:ml-12">
          <label htmlFor="subject-select" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Subject</label>
          <div className="relative max-w-sm">
            <select id="subject-select" aria-label="Subject" value={selectedSubject} onChange={event => onSubjectChange?.(event.target.value as SupportedSubject | '')}
              className="min-h-11 w-full cursor-pointer appearance-none rounded-xl border border-slate-400 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700">
              <option value="">Automatic</option>
              {SUPPORTED_SUBJECTS.map(subject => <option key={subject} value={subject}>{subject}</option>)}
            </select>
            <Layers className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button type="button" disabled={!canGenerate}
              onClick={() => selectedSubject ? onGenerate(extractedText, selectedSession, selectedSubject) : onGenerate(extractedText, selectedSession)}
              className={`home-heading flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-wider sm:w-auto ${canGenerate ? 'bg-gradient-to-r from-sky-700 to-cyan-700 text-white shadow-md hover:from-sky-800 hover:to-cyan-800' : 'cursor-not-allowed bg-slate-200 text-slate-600'}`}>
              {isLoading ? <><Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" /><span>Processing...</span></> : <><Sparkles className="h-4 w-4" /><span>Generate Slides</span></>}
            </button>
            <p className="text-xs leading-relaxed text-slate-600">{hint}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepHeading({ number, done, title, hint }: { number: number; done: boolean; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <span role="img" aria-label={`Step ${number}${done ? ' complete' : ''}`} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-sky-700 text-white' : 'bg-sky-50 text-sky-800'}`}>
        {done ? <Check aria-hidden="true" className="h-4 w-4" /> : number}
      </span>
      <div className="min-w-0"><h2 className="text-base font-bold leading-relaxed text-slate-900">{title}</h2><p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{hint}</p></div>
    </div>
  );
}
