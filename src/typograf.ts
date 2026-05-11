import { ENTITY_MAP, DEFAULT_ENDPOINT, SOAPACTION, buildEnvelope, extractResult } from './soap.js';
import type { TypografOptions, TypografResult } from './types.js';

export async function typograf(
  input: string,
  opts: TypografOptions = {},
): Promise<TypografResult> {
  const entityType = ENTITY_MAP[opts.entityType ?? 'none'];
  const useBr = opts.useBr ?? false;
  const useP = opts.useP ?? false;
  const maxNobr = opts.maxNobr ?? 3;
  const endpoint = opts.endpoint ?? DEFAULT_ENDPOINT;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: `"${SOAPACTION}"`,
    },
    body: buildEnvelope(input, entityType, useBr, useP, maxNobr),
  });

  const body = await res.text();
  const output = extractResult(body);
  if (output === null) {
    return { error: 'service_error', detail: 'malformed SOAP response' };
  }
  return { output };
}
