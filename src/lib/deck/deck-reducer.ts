import type { PedagogicalPart } from '@/lib/pedagogy';
import type { DeckAction, DeckSlide, DeckState, ImageToken, SlideImage } from './types';

export const initialDeckState: DeckState = { presentation: null, slides: [], nextSlideId: 0 };

const NEW_SLIDE_PART: PedagogicalPart = 'Discussion';

const NEW_SLIDE = {
  part: NEW_SLIDE_PART,
  title: 'New Slide Topic',
  contentPoints: ['Key takeaway for learners', 'Guided classroom discussion question'],
  visualDescription: 'Philippine classroom illustration showing interactive group discussion',
};

function updateSlide(state: DeckState, slideId: number, update: (slide: DeckSlide) => DeckSlide): DeckState {
  if (!state.slides.some((slide) => slide.id === slideId)) return state;
  return { ...state, slides: state.slides.map((slide) => (slide.id === slideId ? update(slide) : slide)) };
}

function updateContent(state: DeckState, slideId: number, update: (content: DeckSlide['content']) => Partial<DeckSlide['content']>) {
  return updateSlide(state, slideId, (slide) => ({ ...slide, content: { ...slide.content, ...update(slide.content) } }));
}

function updateImage(state: DeckState, slideId: number, update: (image: SlideImage) => SlideImage) {
  return updateSlide(state, slideId, (slide) => ({ ...slide, image: update(slide.image) }));
}

// A result only lands if no newer Image intent has bumped the Slide's version since the request.
function resolveImage(state: DeckState, token: ImageToken, update: (image: SlideImage) => SlideImage) {
  const slide = state.slides.find((s) => s.id === token.slideId);
  if (!slide || slide.image.version !== token.version) return state;
  return updateImage(state, token.slideId, update);
}

export function deckReducer(state: DeckState, action: DeckAction): DeckState {
  switch (action.type) {
    case 'presentationLoaded': {
      const { slides, ...presentation } = action.presentation;
      return {
        presentation,
        slides: slides.map(({ imageMetadata, ...content }, index) => ({
          id: state.nextSlideId + index,
          content,
          image: { status: 'none', version: 0, ...(imageMetadata ? { metadata: imageMetadata } : {}) },
        })),
        nextSlideId: state.nextSlideId + slides.length,
      };
    }
    case 'reset':
      return { ...initialDeckState, nextSlideId: state.nextSlideId };
    case 'partUpdated':
      return updateContent(state, action.slideId, () => ({ part: action.part }));
    case 'titleUpdated':
      return updateContent(state, action.slideId, () => ({ title: action.title }));
    case 'bulletUpdated':
      return updateContent(state, action.slideId, ({ contentPoints }) => ({
        contentPoints: contentPoints.map((point, i) => (i === action.bulletIndex ? action.text : point)),
      }));
    case 'bulletAdded':
      return updateContent(state, action.slideId, ({ contentPoints }) => ({
        contentPoints: [...contentPoints, 'New primary discussion point'],
      }));
    case 'bulletDeleted':
      return updateContent(state, action.slideId, ({ contentPoints }) => ({
        contentPoints: contentPoints.filter((_, i) => i !== action.bulletIndex),
      }));
    case 'slideAdded': {
      if (!state.presentation) return state;
      const slide: DeckSlide = {
        id: state.nextSlideId,
        content: { slideNumber: state.slides.length + 1, ...NEW_SLIDE },
        image: { status: 'none', version: 0 },
      };
      return { ...state, slides: [...state.slides, slide], nextSlideId: state.nextSlideId + 1 };
    }
    case 'slideDeleted': {
      if (!state.slides.some((slide) => slide.id === action.slideId)) return state;
      const slides = state.slides
        .filter((slide) => slide.id !== action.slideId)
        .map((slide, index) => ({ ...slide, content: { ...slide.content, slideNumber: index + 1 } }));
      return { ...state, slides };
    }
    case 'batchImagesResolved':
      return action.tokens.reduce((next, token, index) => {
        const data = action.images[index];
        if (data === undefined) return next;
        return resolveImage(next, token, (image) => (data === 'failed'
          ? { ...image, status: image.data ? 'ready' : 'failed' }
          : { ...image, status: 'ready', data }));
      }, state);
    case 'regenerationStarted':
      return updateImage(state, action.slideId, (image) => ({
        ...image, status: 'pending', version: image.version + 1, error: undefined,
      }));
    case 'regenerationResolved':
      return resolveImage(state, action.token, (image) => ({
        ...image, status: 'ready', data: action.base64, metadata: undefined, error: undefined,
      }));
    case 'regenerationFailed':
      return resolveImage(state, action.token, (image) => ({
        ...image, status: image.data ? 'ready' : 'failed', error: action.error,
      }));
    case 'libraryImageSelected':
      return updateImage(state, action.slideId, (image) => ({
        status: 'ready',
        data: `data:${action.metadata.mimeType};base64,${action.base64}`,
        metadata: action.metadata,
        version: image.version + 1,
      }));
  }
}
