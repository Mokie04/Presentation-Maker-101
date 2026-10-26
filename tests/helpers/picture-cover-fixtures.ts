import { readFileSync } from 'node:fs';
export const pictureAspects = [
  { name: 'wide', width: 96, height: 64 },
  { name: 'tall', width: 64, height: 96 },
  { name: 'square', width: 64, height: 64 },
  { name: 'box', width: 64, height: 66 },
] as const;
export function pictureFixture(name: string, format: 'png' | 'jpg'): string {
  return readFileSync(new URL(`../fixtures/picture-cover/${name}.${format}`, import.meta.url)).toString('base64');
}
