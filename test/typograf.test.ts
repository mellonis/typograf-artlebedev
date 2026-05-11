import { afterEach, describe, expect, it, vi } from 'vitest';
import { typograf } from '../src/typograf.js';

const wrap = (inner: string) => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<ProcessTextResponse xmlns="http://typograf.artlebedev.ru/webservices/">
<ProcessTextResult>${inner}</ProcessTextResult>
</ProcessTextResponse>
</soap:Body>
</soap:Envelope>`;

function mockFetchOnce(body: string, status = 200): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockResolvedValueOnce(
    new Response(body, {
      status,
      headers: { 'content-type': 'text/xml; charset=utf-8' },
    }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('typograf — success', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the typographed output on a successful response', async () => {
    mockFetchOnce(wrap('«Привет» — мир'));
    const result = await typograf('"Привет" - мир');
    expect(result).toEqual({ output: '«Привет» — мир' });
  });

  it('POSTs to the default ArtLebedev endpoint with correct SOAPAction header', async () => {
    const fetchMock = mockFetchOnce(wrap('x'));
    await typograf('x');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://typograf.artlebedev.ru/webservices/typograf.asmx');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: '"http://typograf.artlebedev.ru/webservices/ProcessText"',
    });
  });
});
