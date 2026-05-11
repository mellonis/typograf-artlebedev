import { escapeXml, decodeXmlEntities } from './entities.js';
import type { EntityType } from './types.js';

export const SOAPACTION = 'http://typograf.artlebedev.ru/webservices/ProcessText';
export const NS = 'http://typograf.artlebedev.ru/webservices/';
export const DEFAULT_ENDPOINT =
  'https://typograf.artlebedev.ru/webservices/typograf.asmx';

export const ENTITY_MAP: Record<EntityType, 1 | 2 | 3> = {
  named: 1,
  numeric: 2,
  none: 3,
};

export function buildEnvelope(
  text: string,
  entityType: 1 | 2 | 3,
  useBr: boolean,
  useP: boolean,
  maxNobr: number,
): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
 <soap:Body>
  <ProcessText xmlns="${NS}">
   <text>${escapeXml(text)}</text>
   <entityType>${entityType}</entityType>
   <useBr>${useBr}</useBr>
   <useP>${useP}</useP>
   <maxNobr>${maxNobr}</maxNobr>
  </ProcessText>
 </soap:Body>
</soap:Envelope>`;
}

const RESULT_RE = /<ProcessTextResult>([\s\S]*?)<\/ProcessTextResult>/;

export function extractResult(soapBody: string): string | null {
  const m = RESULT_RE.exec(soapBody);
  if (!m || m[1] === undefined) return null;
  return decodeXmlEntities(m[1]);
}
