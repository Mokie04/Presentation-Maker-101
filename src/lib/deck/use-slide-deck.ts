'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ImageMetadata } from '@/lib/image-metadata';
import type { PresentationData } from '@/types/presentation';
import { deckReducer, initialDeckState } from './deck-reducer';
import { toGeneratingFlags, toPresentationData, toSlideImages } from './selectors';
import type { DeckAction, ImageToken } from './types';

export function useSlideDeck() {
  const [state, setState] = useState(initialDeckState);
  // Latest state, updated synchronously so async work captures tokens at request time.
  const stateRef = useRef(state);

  const dispatch = useCallback((action: DeckAction) => {
    const next = deckReducer(stateRef.current, action);
    stateRef.current = next;
    setState(next);
  }, []);

  const presentationData = useMemo(() => toPresentationData(state), [state]);
  const slideImages = useMemo(() => toSlideImages(state), [state]);
  const generatingImages = useMemo(() => toGeneratingFlags(state), [state]);
  const slideIds = useMemo(() => state.slides.map((slide) => slide.id), [state]);
  const imageErrors = useMemo(() => {
    const errors: Record<number, string> = {};
    state.slides.forEach(({ image }, index) => {
      if (image.error) errors[index] = image.error;
    });
    return errors;
  }, [state]);

  // Background batch image generation for eligible slides
  const loadPresentation = (data: PresentationData) => {
    dispatch({ type: 'presentationLoaded', presentation: data });
    const tokens: ImageToken[] = stateRef.current.slides.map((s) => ({ slideId: s.id, version: s.image.version }));
    const slidesForBatch = data.slides.map((s, index) => ({
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
      .then((result) => {
        if (result?.images) dispatch({ type: 'batchImagesResolved', tokens, images: result.images });
      })
      .catch((err) => {
        console.error('Batch image generation error:', err);
      });
  };

  // Single slide image generation / regeneration
  const regenerateImage = async (slideId: number, visualDescription: string) => {
    const slideIndex = stateRef.current.slides.findIndex((s) => s.id === slideId);
    if (slideIndex === -1) return;
    dispatch({ type: 'regenerationStarted', slideId });
    const version = stateRef.current.slides.find((s) => s.id === slideId)!.image.version;
    const token: ImageToken = { slideId, version };
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The version rises with every Image intent, so each regenerate asks for a different photo.
        body: JSON.stringify({ prompt: visualDescription, slideIndex, variation: token.version }),
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
      dispatch({ type: 'regenerationResolved', token, base64: data.base64 });
    } catch (err) {
      console.error('Image regeneration failed:', err);
      dispatch({ type: 'regenerationFailed', token, error: err instanceof Error ? err.message : 'Failed to render image.' });
    }
  };

  return {
    presentationData,
    slideImages,
    generatingImages,
    imageErrors,
    slideIds,
    loadPresentation,
    reset: () => dispatch({ type: 'reset' }),
    updatePart: (slideId: number, part: string) => dispatch({ type: 'partUpdated', slideId, part }),
    updateTitle: (slideId: number, title: string) => dispatch({ type: 'titleUpdated', slideId, title }),
    updateBullet: (slideId: number, bulletIndex: number, text: string) =>
      dispatch({ type: 'bulletUpdated', slideId, bulletIndex, text }),
    addBullet: (slideId: number) => dispatch({ type: 'bulletAdded', slideId }),
    deleteBullet: (slideId: number, bulletIndex: number) => dispatch({ type: 'bulletDeleted', slideId, bulletIndex }),
    addSlide: () => dispatch({ type: 'slideAdded' }),
    deleteSlide: (slideId: number) => dispatch({ type: 'slideDeleted', slideId }),
    regenerateImage,
    selectLibraryImage: (slideId: number, base64: string, metadata: ImageMetadata) =>
      dispatch({ type: 'libraryImageSelected', slideId, base64, metadata }),
  };
}
