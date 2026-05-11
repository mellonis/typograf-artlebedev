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

describe('typograf — errors', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns service_error on HTTP non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 })),
    );
    const result = await typograf('x');
    expect(result).toEqual({ error: 'service_error', detail: 'HTTP 500' });
  });

  it('returns service_error when response body lacks <ProcessTextResult>', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(new Response('<garbage/>', { status: 200 })),
    );
    const result = await typograf('x');
    expect(result).toEqual({ error: 'service_error', detail: 'malformed SOAP response' });
  });

  it('returns network_error when fetch rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED')),
    );
    const result = await typograf('x');
    expect(result).toMatchObject({ error: 'network_error', detail: expect.stringContaining('ECONNREFUSED') });
  });
});

describe('typograf — timeout and abort', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function stubFetchThatHonorsAbort(): void {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init: { signal?: AbortSignal }) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              const err = new Error('aborted') as Error & { name: string };
              err.name = 'AbortError';
              reject(err);
            });
          }),
      ),
    );
  }

  it('returns timeout when the internal timer fires before fetch resolves', async () => {
    vi.useFakeTimers();
    stubFetchThatHonorsAbort();

    const resultPromise = typograf('x', { timeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(150);
    const result = await resultPromise;
    expect(result).toEqual({ error: 'timeout' });
  });

  it('returns aborted when the caller signal fires', async () => {
    stubFetchThatHonorsAbort();
    const ctrl = new AbortController();
    const resultPromise = typograf('x', { signal: ctrl.signal });
    queueMicrotask(() => ctrl.abort());
    const result = await resultPromise;
    expect(result).toEqual({ error: 'aborted' });
  });
});

describe('typograf — input handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('short-circuits on empty input without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await typograf('');
    expect(result).toEqual({ output: '' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('typograf — entity type mapping', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['named', 1],
    ['numeric', 2],
    ['none', 3],
  ] as const)('maps entityType=%s to SOAP integer %s', async (et, expected) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><ProcessTextResponse xmlns="http://typograf.artlebedev.ru/webservices/"><ProcessTextResult>x</ProcessTextResult></ProcessTextResponse></soap:Body></soap:Envelope>`,
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    await typograf('x', { entityType: et });
    const body = fetchMock.mock.calls[0]![1].body as string;
    expect(body).toContain(`<entityType>${expected}</entityType>`);
  });
});
