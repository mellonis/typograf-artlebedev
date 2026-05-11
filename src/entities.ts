const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

/**
 * Decode SOAP-layer XML escapes only. Numeric character references
 * (`&#171;`, `&#x00A0;`) and unknown named entities MUST pass through
 * unchanged — if the caller requested `entityType: 'numeric'` or
 * `entityType: 'named'`, those references are the intended output and
 * must not be reversed.
 */
export function decodeXmlEntities(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|apos);/g, (_match, name: string) => NAMED[name]!);
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
