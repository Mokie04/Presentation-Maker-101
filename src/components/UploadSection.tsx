'use client';

import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Clipboard,
  Layers,
} from 'lucide-react';

interface UploadSectionProps {
  extractedText: string;
  fileName: string;
  onUploadSuccess: (text: string, fileName: string) => void;
  selectedSession: string;
  onSessionChange: (session: string) => void;
  onGenerate: (text: string, session: string) => void;
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
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
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

  return (
    <section className="w-full max-w-4xl mx-auto my-8 px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-emerald-100/80 overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 px-6 py-4 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
              <UploadCloud className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Lesson Plan Document Processing
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Supports DepEd Daily Lesson Logs (DLL) in .docx, .pdf, .txt, or .md
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowManual(!showManual)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100/60 hover:bg-emerald-200/60 px-3 py-1.5 rounded-lg border border-emerald-300/60 transition-colors flex items-center gap-1.5"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>{showManual ? 'Hide Manual Paste' : 'Paste Lesson Plan Text'}</span>
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-6">
          {/* Drag & Drop Area */}
          {!showManual ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/80 scale-[0.99]'
                  : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />

              {isUploading ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                  <p className="text-sm font-semibold text-emerald-800">
                    Extracting Lesson Plan Content...
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-emerald-100/80 text-emerald-700 flex items-center justify-center shadow-inner">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-700">
                      Drag & Drop Lesson Plan Document
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      or click to browse (.docx, .pdf, .txt, .md — up to 10MB)
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Monospace Textarea for Manual Paste */
            <div className="space-y-2">
              <label
                htmlFor="manual-lesson-text"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Paste Lesson Plan Content
              </label>
              <textarea
                id="manual-lesson-text"
                value={manualInput}
                onChange={handleManualChange}
                placeholder="Paste raw lesson plan content here (objectives, parts, activities, questions)..."
                rows={7}
                className="w-full font-mono text-xs sm:text-sm p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/30 text-slate-800 placeholder-slate-400 transition-all outline-none resize-y"
              />
            </div>
          )}

          {/* Feedback & File Pill */}
          {extractedText && fileName && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="truncate">
                  <p className="text-xs sm:text-sm font-bold text-emerald-950 truncate">
                    {fileName}
                  </p>
                  <p className="text-xs text-emerald-700">
                    {extractedText.length.toLocaleString()} characters extracted and ready
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold uppercase px-2.5 py-1 bg-emerald-200/70 text-emerald-800 rounded-full flex-shrink-0">
                Ready
              </span>
            </div>
          )}

          {/* Errors */}
          {(uploadError || errorMsg) && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs sm:text-sm font-medium">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>{uploadError || errorMsg}</span>
            </div>
          )}

          {/* Controls: Session Dropdown & Generate Action */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-1/2">
              <label
                htmlFor="session-select"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                Select Session
              </label>
              <div className="relative">
                <select
                  id="session-select"
                  aria-label="Select Session"
                  value={selectedSession}
                  onChange={(e) => onSessionChange(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-300 font-medium text-slate-800 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer shadow-sm transition-all"
                >
                  <option value="">-- Choose Curriculum Session --</option>
                  <option value="Session 1">Session 1</option>
                  <option value="Session 2">Session 2</option>
                  <option value="Session 3">Session 3</option>
                  <option value="Session 4">Session 4</option>
                  <option value="Session 5">Session 5</option>
                </select>
                <Layers className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="w-full sm:w-1/2 flex items-end">
              <button
                type="button"
                disabled={!canGenerate}
                onClick={() => onGenerate(extractedText, selectedSession)}
                className={`w-full py-3 px-6 rounded-xl font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-md transition-all duration-200 ${
                  canGenerate
                    ? 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white cursor-pointer hover:shadow-lg active:scale-[0.99]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>Generate Slides</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Loading Stage Indicator */}
          {isLoading && loadingStage && (
            <div className="pt-2">
              <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center gap-3 animate-pulse">
                <Loader2 className="w-5 h-5 text-emerald-700 animate-spin flex-shrink-0" />
                <p className="text-xs sm:text-sm font-semibold text-emerald-900">
                  {loadingStage}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
