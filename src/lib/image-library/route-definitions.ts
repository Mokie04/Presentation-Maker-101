import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { RouteDefinition } from '@/lib/api';
import type { ImageLibrary } from './library';

const searchInputSchema = z.object({ query: z.string().trim().min(1).max(500) });

export function searchDefinition(library: ImageLibrary): RouteDefinition<typeof searchInputSchema> {
  return {
    name: `${library.source}-images/search`,
    failureMessage: library.failureMessages.search,
    failureStatus: 502,
    input: searchInputSchema,
    maxBodyBytes: 8192,
    noStore: true,
    handler: async ({ input }) => {
      try {
        return NextResponse.json({ candidates: await library.search(input.query) });
      } catch (error) {
        library.mapError(error);
      }
    },
  };
}

export function selectDefinition<Schema extends z.ZodType>(library: ImageLibrary<Schema>): RouteDefinition<Schema> {
  return {
    name: `${library.source}-images/select`,
    failureMessage: library.failureMessages.select,
    failureStatus: 502,
    input: library.selectInputSchema,
    maxBodyBytes: 8192,
    noStore: true,
    handler: async ({ input }) => {
      try {
        return NextResponse.json(await library.select(input));
      } catch (error) {
        library.mapError(error);
      }
    },
  };
}
