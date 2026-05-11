import { describe, expect, it } from 'vitest';
import { typograf } from '../src/typograf.js';

const LIVE = process.env.TYPOGRAF_LIVE === '1';

describe.skipIf(!LIVE)('typograf — live ArtLebedev service', () => {
  it('round-trips "Привет" - мир with entityType=none', async () => {
    const result = await typograf('"Привет" - мир', { entityType: 'none', timeoutMs: 5000 });
    // ArtLebedev's pipeline inserts a NBSP (U+00A0) between the closing
    // guillemet and the em-dash, and appends a trailing newline. NBSP is
    // built from its codepoint below so an editor round-trip cannot
    // silently swap it for a regular space and a reader cannot misread it.
    const NBSP = String.fromCharCode(0x00a0);
    const EMDASH = String.fromCharCode(0x2014);
    const expected = `«Привет»${NBSP}${EMDASH} мир\n`;
    expect(result).toEqual({ output: expected });
  }, 10_000);
});
