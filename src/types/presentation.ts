export interface SlideData {
  slideNumber: number;
  part: string;
  title: string;
  contentPoints: string[];
  visualDescription: string;
}

export interface PresentationData {
  subject: string;
  originalWriters: string;
  topic: string;
  slides: SlideData[];
}
