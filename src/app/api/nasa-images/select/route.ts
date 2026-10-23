import { defineRoute } from '@/lib/api';
import { nasaLibrary } from '@/lib/image-library/nasa';
import { selectDefinition } from '@/lib/image-library/route-definitions';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

export const POST = defineRoute(selectDefinition(nasaLibrary));
