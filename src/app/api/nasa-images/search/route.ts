import { defineRoute } from '@/lib/api';
import { nasaLibrary } from '@/lib/image-library/nasa';
import { searchDefinition } from '@/lib/image-library/route-definitions';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export const POST = defineRoute(searchDefinition(nasaLibrary));
