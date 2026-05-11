import { ENTITY_MAP, DEFAULT_ENDPOINT, SOAPACTION, buildEnvelope, extractResult } from './soap.js';
import type { TypografOptions, TypografResult } from './types.js';

export async function typograf(
  input: string,
  opts: TypografOptions = {},
): Promise<TypografResult> {
  if (input === '') return { output: '' };

  const entityType = ENTITY_MAP[opts.entityType ?? 'none'];
  const useBr = opts.useBr ?? false;
  const useP = opts.useP ?? false;
  const maxNobr = opts.maxNobr ?? 3;
  const endpoint = opts.endpoint ?? DEFAULT_ENDPOINT;
  const timeoutMs = opts.timeoutMs ?? 1500;

  const timeoutCtrl = new AbortController();
  const timer = setTimeout(() => timeoutCtrl.abort(), timeoutMs);
  const signal = opts.signal
    ? AbortSignal.any([opts.signal, timeoutCtrl.signal])
    : timeoutCtrl.signal;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: `"${SOAPACTION}"`,
      },
      body: buildEnvelope(input, entityType, useBr, useP, maxNobr),
      signal,
    });
  } catch (e: unknown) {
    if (opts.signal?.aborted) return { error: 'aborted' };
    if (timeoutCtrl.signal.aborted) return { error: 'timeout' };
    return {
      error: 'network_error',
      detail: e instanceof Error ? e.message : String(e),
    };
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    return { error: 'service_error', detail: `HTTP ${res.status}` };
  }
  const body = await res.text();
  const output = extractResult(body);
  if (output === null) {
    return { error: 'service_error', detail: 'malformed SOAP response' };
  }
  return { output };
}
