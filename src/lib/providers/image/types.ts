export interface ImageRequest {
  description: string;
  title?: string;
  variation?: number;
}

export interface ImageProvider {
  id: 'openai' | 'pexels';
  generate(request: ImageRequest): Promise<string>;
}
