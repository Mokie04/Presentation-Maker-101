import { defineRoute } from '@/lib/api';
import { commonsLibrary } from '@/lib/image-library/commons';
import { searchDefinition } from '@/lib/image-library/route-definitions';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export const POST = defineRoute(searchDefinition(commonsLibrary));
