import type { PresentationData } from '@/types/presentation';
import { samples } from '../lib/services/credit-samples';

// Fixed local PNG, never fetched from an image provider.
export const lookFixtureImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
export const lookFixtureImages = { 1: lookFixtureImage, 5: lookFixtureImage };
export const lookFixtureDeck: PresentationData = {
  subject: 'Science', topic: 'Water and evidence', originalWriters: 'Teacher Maria', slides: [
    { slideNumber: 1, part: 'Title Page', title: 'Water and energy', contentPoints: ['Grade 7 Science', 'Observe the world', 'Discuss your findings'], visualDescription: '' },
    { slideNumber: 2, part: 'Discussion', title: 'Observe H_2O and x^2', contentPoints: ['Water is H_2O', 'Compare x^2 with x_1'], visualDescription: 'Water molecules and a graph' },
    { slideNumber: 3, part: 'Discussion', title: 'Investigating H_2O and x^2 in the classroom', contentPoints: ['Explain your observations', 'Compare water and ice'], visualDescription: '' },
    { slideNumber: 4, part: 'Discussion', title: 'Dense observations', contentPoints: Array.from({ length: 10 }, (_, i) => `Observe water change ${i + 1}.`), visualDescription: '' },
    { slideNumber: 5, part: 'Assessment', title: 'Reflect', contentPoints: ['How does energy change water?', 'Support your answer with evidence.'], visualDescription: 'A labelled water diagram' },
    { slideNumber: 6, part: 'Discussion', title: 'Credited visual', contentPoints: ['Use the source notes', 'Credit the original artist'], visualDescription: 'A labelled diagram', imageMetadata: samples.commonsFull },
  ],
};
