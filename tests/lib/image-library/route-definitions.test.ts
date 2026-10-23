import { describe, expect, it } from 'vitest';
import { nasaLibrary } from '@/lib/image-library/nasa';
import { commonsLibrary } from '@/lib/image-library/commons';
import type { ImageLibrary } from '@/lib/image-library/library';
import { searchDefinition, selectDefinition } from '@/lib/image-library/route-definitions';

const libraries: ImageLibrary[] = [nasaLibrary, commonsLibrary];
describe.each(libraries)('$label shared route definitions', (library) => {
  it.each(['search', 'select'] as const)('preserves the common %s route policy', (operation) => {
    const definition = operation === 'search' ? searchDefinition(library) : selectDefinition(library);
    expect(definition).toMatchObject({ name: `${library.source}-images/${operation}`, maxBodyBytes: 8192,
      noStore: true, failureStatus: 502, failureMessage: library.failureMessages[operation], handler: expect.any(Function) });
    if (operation === 'select') expect(definition.input).toBe(library.selectInputSchema);
  });

  it('trims search terms and preserves the 1..500 character constraint', () => {
    const schema = searchDefinition(library).input!;
    expect(schema.parse({ query: ' earth ' })).toEqual({ query: 'earth' });
    expect(schema.safeParse({ query: 'x'.repeat(500) }).success).toBe(true);
    for (const query of ['', '  ', 'x'.repeat(501), [], 123]) expect(schema.safeParse({ query }).success).toBe(false);
  });
});
