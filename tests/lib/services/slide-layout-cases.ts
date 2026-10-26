import type { SlideData } from '@/types/presentation';
import { samples } from './credit-samples';

const image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const title: SlideData = {
  slideNumber: 1, part: 'Title Page', title: 'Water and energy',
  contentPoints: ['Grade 7 Science', 'Observe the world', 'Discuss your findings'], visualDescription: '',
};
export const slideLayoutCases: { name: string; slides: SlideData[]; images?: Record<number, string> }[] = [
  { name: 'title with writers and library image', slides: [{ ...title, imageMetadata: samples.commonsFull }], images: { 0: image } },
  { name: 'long content title with formulas and AI image', slides: [title, {
    slideNumber: 2, part: 'Discussion', title: 'Investigating H_2O and x^2 in the classroom',
    contentPoints: ['Water is H_2O', 'Compare x^2 with x_1'], visualDescription: 'Water molecules and a graph',
  }], images: { 1: `data:image/png;base64,${image}` } },
  { name: 'wide bullets and credit without image', slides: [title, {
    slideNumber: 2, part: 'Assessment', title: 'Reflect',
    contentPoints: ['Explain your observations', 'Share evidence'], visualDescription: '   ',
  }, {
    slideNumber: 3, part: 'Discussion', title: 'Image unavailable', contentPoints: ['Use the source notes'],
    visualDescription: 'A labelled diagram', imageMetadata: samples.commonsMinimal,
  }] },
];
