export interface ImageRequest {
  description: string;
  title?: string;
  variation?: number;
}

export interface ImageProvider {
  id: 'openai' | 'invoke-api' | 'pexels';
  generate(request: ImageRequest): Promise<string>;
}
