'use client';
import React, { useEffect, useRef, useState } from 'react';
import type { CommonsImageCandidate } from '@/lib/providers/commons-provider';
import type { NasaImageCandidate } from '@/lib/providers/nasa-provider';
import { imageCreditText, imageSourceLabel } from '@/lib/image-credit';
import { imageMetadataSchema, type ImageMetadata } from '@/lib/image-metadata';

export function NasaImagePicker({ title, onSelect, onCancel }: {
  title: string;
  onSelect: (base64: string, metadata: ImageMetadata) => void;
  onCancel: () => void;
}) {
  const [source, setSource] = useState<'nasa' | 'commons'>('nasa');
  const [commonsRetrySeconds, setCommonsRetrySeconds] = useState(0);
  const label = imageSourceLabel(source);
  const limited = source === 'commons' && commonsRetrySeconds > 0;
  const [query, setQuery] = useState(title);
  const [candidates, setCandidates] = useState<(NasaImageCandidate | CommonsImageCandidate)[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); }, []);

  useEffect(() => {
    if (!commonsRetrySeconds) return;
    const timer = setTimeout(() => setCommonsRetrySeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [commonsRetrySeconds]);

  const cancel = () => { request.current?.abort(); onCancel(); };
  const run = async (endpoint: string, body: object, consume: (data: Record<string, unknown>) => void) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError('');
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) {
        if (!controller.signal.aborted && source === 'commons' && response.status === 429) {
          setCommonsRetrySeconds(Math.min(300, Math.max(1, Number(data.retryAfterSeconds) || 60)));
        }
        throw new Error(data.error || `${label} request failed.`);
      }
      if (!controller.signal.aborted) consume(data);
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : `${label} request failed.`);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return (
    <section aria-label={`${label} image search`} className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-3">
      <label className="block text-xs font-bold text-slate-700">
        Image source
        <select value={source} onChange={(e) => {
          request.current?.abort(); setSource(e.target.value as 'nasa' | 'commons');
          setCandidates(null); setError(''); setBusy(false);
        }} className="ml-2 p-2 border border-slate-300 rounded-lg bg-white">
          <option value="nasa">NASA</option><option value="commons">Wikimedia Commons</option>
        </select>
      </label>
      <form onSubmit={(event) => {
        event.preventDefault(); setCandidates(null);
        void run(`/api/${source === 'commons' ? 'commons' : 'nasa'}-images/search`, { query }, (data) => {
          if (!Array.isArray(data.candidates)) throw new Error(`Invalid ${label} search response.`);
          setCandidates(data.candidates.slice(0, 5));
        });
      }} className="space-y-2">
        <label className="block text-xs font-bold text-slate-700">
          {label} search terms
          <input value={query} onChange={(e) => setQuery(e.target.value)} maxLength={500}
            className="mt-1 w-full p-2 border border-slate-300 rounded-lg text-sm" />
        </label>
        <button type="submit" disabled={busy || limited || !query.trim()} className="px-3 py-2 bg-sky-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">
          {busy ? `Loading ${label} images…` : `Search ${label}`}
        </button>
        <button type="button" onClick={cancel} aria-label="Cancel NASA picker" className="ml-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-600">Cancel</button>
      </form>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {limited && <p className="text-sm text-slate-600">Try again in {commonsRetrySeconds} seconds.</p>}
      {candidates?.length === 0 && <p className="text-sm text-slate-600">No {label} images found.</p>}
      {candidates?.map((candidate) => (
        <article key={'fileId' in candidate ? candidate.fileId : candidate.nasaId} className="p-3 rounded-lg bg-white border border-sky-100 space-y-2">
          {candidate.previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={candidate.previewUrl} alt={candidate.title ?? ('nasaId' in candidate ? candidate.nasaId : String(candidate.fileId))} className="max-h-36 w-full object-contain" />
          )}
          <p className="text-sm font-bold text-slate-800">{candidate.title ?? 'Title not provided'}</p>
          <p className="text-xs text-slate-600">{imageCreditText(candidate)}</p>
          {'center' in candidate && candidate.center && <p className="text-xs text-slate-600">Publishing center: {candidate.center}</p>}
          {'licenseUrl' in candidate && candidate.licenseUrl && <a href={candidate.licenseUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-sky-700 underline">License details</a>}
          {'unavailableReason' in candidate && candidate.unavailableReason && <p className="text-xs text-slate-600">{candidate.unavailableReason}</p>}
          {candidate.description && <details className="text-xs text-slate-600"><summary>Source description</summary><p className="whitespace-pre-wrap">{candidate.description}</p></details>}
          {candidate.sourceUrl && <a href={candidate.sourceUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-sky-700 underline">{label} source</a>}
          <button type="button" disabled={busy || limited || ('selectable' in candidate && !candidate.selectable)} className="px-3 py-2 bg-sky-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
            onClick={() => void run(`/api/${source === 'commons' ? 'commons' : 'nasa'}-images/select`, 'fileId' in candidate ? { fileId: candidate.fileId } : { nasaId: candidate.nasaId }, (data) => {
              const metadata = imageMetadataSchema.parse(data.metadata);
              if (typeof data.base64 !== 'string' || !data.base64) throw new Error(`${label} returned no image.`);
              onSelect(data.base64, metadata);
            })}>Use this image</button>
        </article>
      ))}
      <p className="text-xs text-slate-500">Review the image and source description. Credits and usage permissions may be incomplete or conflicting.</p>
    </section>
  );
}
