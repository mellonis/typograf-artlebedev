import { describe, expect, it } from 'vitest';
import {
  ENTITY_MAP,
  DEFAULT_ENDPOINT,
  buildEnvelope,
  extractResult,
} from '../src/soap.js';

describe('ENTITY_MAP', () => {
  it('maps the three public entity strings to ArtLebedev integers', () => {
    expect(ENTITY_MAP.named).toBe(1);
    expect(ENTITY_MAP.numeric).toBe(2);
    expect(ENTITY_MAP.none).toBe(3);
  });
});

describe('DEFAULT_ENDPOINT', () => {
  it('points to the public ArtLebedev SOAP service over HTTPS', () => {
    expect(DEFAULT_ENDPOINT).toBe(
      'https://typograf.artlebedev.ru/webservices/typograf.asmx',
    );
  });
});

describe('buildEnvelope', () => {
  it('produces a SOAP envelope with the five ProcessText parameters', () => {
    const env = buildEnvelope('hello', 3, false, false, 3);
    expect(env).toMatch(/<\?xml version="1\.0" encoding="utf-8"\?>/);
    expect(env).toContain('<soap:Envelope');
    expect(env).toContain(
      '<ProcessText xmlns="http://typograf.artlebedev.ru/webservices/">',
    );
    expect(env).toContain('<text>hello</text>');
    expect(env).toContain('<entityType>3</entityType>');
    expect(env).toContain('<useBr>false</useBr>');
    expect(env).toContain('<useP>false</useP>');
    expect(env).toContain('<maxNobr>3</maxNobr>');
  });

  it('serializes booleans as the strings "true"/"false"', () => {
    const env = buildEnvelope('x', 1, true, true, 5);
    expect(env).toContain('<useBr>true</useBr>');
    expect(env).toContain('<useP>true</useP>');
    expect(env).toContain('<entityType>1</entityType>');
    expect(env).toContain('<maxNobr>5</maxNobr>');
  });

  it('XML-escapes the input text', () => {
    const env = buildEnvelope('a & b < c > "q" \'a\'', 3, false, false, 3);
    expect(env).toContain('<text>a &amp; b &lt; c &gt; &quot;q&quot; &apos;a&apos;</text>');
  });
});

describe('extractResult', () => {
  const wrap = (inner: string) => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<ProcessTextResponse xmlns="http://typograf.artlebedev.ru/webservices/">
<ProcessTextResult>${inner}</ProcessTextResult>
</ProcessTextResponse>
</soap:Body>
</soap:Envelope>`;

  it('extracts the inner text of <ProcessTextResult>', () => {
    expect(extractResult(wrap('hello world'))).toBe('hello world');
  });

  it('decodes SOAP-layer XML escapes', () => {
    expect(extractResult(wrap('a &amp; b &lt; c'))).toBe('a & b < c');
  });

  it('handles multi-line response bodies', () => {
    const body = wrap('line 1\nline 2\nline 3');
    expect(extractResult(body)).toBe('line 1\nline 2\nline 3');
  });

  it('preserves numeric character references (entityType=numeric round-trip)', () => {
    expect(extractResult(wrap('&amp;#171;Привет&amp;#187;'))).toBe('&#171;Привет&#187;');
  });

  it('returns null when <ProcessTextResult> is missing', () => {
    const broken = `<?xml version="1.0"?>
<soap:Envelope><soap:Body></soap:Body></soap:Envelope>`;
    expect(extractResult(broken)).toBeNull();
  });

  it('returns null on the empty string', () => {
    expect(extractResult('')).toBeNull();
  });
});
