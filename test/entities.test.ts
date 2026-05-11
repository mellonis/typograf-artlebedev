import { describe, expect, it } from 'vitest';
import { escapeXml, decodeXmlEntities } from '../src/entities.js';

describe('escapeXml', () => {
  it('escapes the five XML special characters', () => {
    expect(escapeXml('&')).toBe('&amp;');
    expect(escapeXml('<')).toBe('&lt;');
    expect(escapeXml('>')).toBe('&gt;');
    expect(escapeXml('"')).toBe('&quot;');
    expect(escapeXml("'")).toBe('&apos;');
  });

  it('escapes ampersand first to avoid double-escaping', () => {
    expect(escapeXml('a & b < c')).toBe('a &amp; b &lt; c');
  });

  it('leaves non-special characters alone, including Cyrillic and emoji', () => {
    expect(escapeXml('Привет, мир! 🌍')).toBe('Привет, мир! 🌍');
  });

  it('returns the empty string unchanged', () => {
    expect(escapeXml('')).toBe('');
  });
});

describe('decodeXmlEntities', () => {
  it('decodes the five SOAP-layer XML escapes', () => {
    expect(decodeXmlEntities('&amp;')).toBe('&');
    expect(decodeXmlEntities('&lt;')).toBe('<');
    expect(decodeXmlEntities('&gt;')).toBe('>');
    expect(decodeXmlEntities('&quot;')).toBe('"');
    expect(decodeXmlEntities('&apos;')).toBe("'");
  });

  it('decodes multiple entities in a single string', () => {
    expect(decodeXmlEntities('a &amp; b &lt; c')).toBe('a & b < c');
  });

  it('leaves numeric character references unchanged (entityType=numeric output is preserved)', () => {
    expect(decodeXmlEntities('&#171;Привет&#187;')).toBe('&#171;Привет&#187;');
    expect(decodeXmlEntities('&#x00A0;')).toBe('&#x00A0;');
  });

  it('leaves unknown named entities unchanged', () => {
    expect(decodeXmlEntities('&laquo;text&raquo;')).toBe('&laquo;text&raquo;');
  });

  it('round-trips with escapeXml', () => {
    const samples = ['hello', 'a & b', '<x>', '"q"', "'a'", 'Привет «мир» — мир'];
    for (const s of samples) {
      expect(decodeXmlEntities(escapeXml(s))).toBe(s);
    }
  });

  it('returns the empty string unchanged', () => {
    expect(decodeXmlEntities('')).toBe('');
  });
});
