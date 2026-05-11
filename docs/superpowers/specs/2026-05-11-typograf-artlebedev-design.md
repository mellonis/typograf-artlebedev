# `@mellonis/typograf-artlebedev` — npm wrapper for ArtLebedev Typograf

Date: 2026-05-11
Tracking issue: [mellonis/poetry#12](https://github.com/mellonis/poetry/issues/12)
Consumer: [mellonis/poetry-nextjs#114](https://github.com/mellonis/poetry-nextjs/issues/114)
New repo: `mellonis/typograf-artlebedev` (does not exist yet)

## Problem

The existing npm wrapper for ArtLebedev's Typograf SOAP service
(`node-artlebedev-typograf`) is unmaintained: deprecated `request` dep, no
TypeScript, last release in 2017. The only modern alternatives in the
ecosystem are `typograf` (a local rule-based engine, not ArtLebedev's rules)
or hand-rolled SOAP code embedded in each consumer.

`poetry-nextjs` needs a CMS server action that runs editor text through
ArtLebedev's pipeline for Russian typography polish (smart quotes `«…»`,
em/en dashes, NBSP placement around dashes and short conjunctions). Embedding
SOAP plumbing inside a Next.js app couples the CMS to transport details that
have nothing to do with the CMS. Publishing a modern, TypeScript wrapper
serves the local need *and* gives the broader ecosystem a viable replacement
for the stale package.

## Goals

- Single function `typograf(input, options?)` returning a discriminated-union
  result.
- Zero runtime dependencies. ESM + CJS dual output with TypeScript
  declarations.
- Node 22.5+ only for v1. Browser support deferred.
- Verifiable against the live service through an opt-in integration test.
- npm package published with provenance.

## Non-goals

- Browser support in v1. Deferred to v1.1 after CORS verification.
- Streaming or chunked input — the underlying service doesn't support it.
- Rule customization beyond what ArtLebedev's SOAP method exposes.
- A "de-typograf" inverse operation. No use case.
- Rate-limiting at the library layer. Callers own their own quotas.
- Input-size limits. Callers own their own ceilings (e.g. poetry-nextjs
  enforces 50KB in its server action, which is consumer policy, not library
  policy).
- Russian translation of the README. English-only for npm-ecosystem
  visibility.

## Decisions reached during brainstorm

| # | Decision | Rationale |
|---|----------|-----------|
| Q1 | npm name: `@mellonis/typograf-artlebedev` (personal scope) | Solo author, no co-maintainers; intentionally diverges from the `@turing-machine-js/...` per-repo-scope pattern since this is a standalone library, not a family of related packages. |
| Q2 | Repo structure: single-package | Library has a tightly bounded purpose (one SOAP method, one transform). Lerna scaffold is overhead with no payoff for one package; can be added later if a CLI or framework integration ever materializes. |
| Q3 | License: MIT | Thin utility, drop-in for any project including commercial CMSes. GPL-3.0-or-later (the license on `turing-machine-js`/`post-machine-js`) would discourage adoption disproportionately. |
| Q4 | Runtime: Node 22.5+ only for v1 | Only known consumer is server-side (`poetry-nextjs` server actions). Browser support has a worse privacy story (drafts leaving the user's browser with their IP). `AbortSignal.any` requires 22.5+. |
| Q5 | XML response parsing: hand-rolled regex, zero deps | Response shape is fixed and documented for ~20 years; we own the envelope we send. Live integration test catches any drift. |
| EmpRes | `entityType` exposed as `'named' \| 'numeric' \| 'none'` (default `'none'`) | Verified empirically against live service: `1=named entities`, `2=numeric entities`, `3=raw chars`. The issue body's "Recommended: 4 — UTF-8, no entities" was incorrect — `entityType=4` actually emits a *mix* of named and numeric entities. The "raw UTF-8" mode is `entityType=3`. ArtLebedev's public UI surfaces these three; `mixed` is omitted from v1. |
| ApiShape | Result type: `{ output: string } \| { error: ErrorCode; detail?: string }` | Structural discrimination via `'error' in result`; cleaner at the call site than a `{ ok: true/false }` tag. |
| Timeout | Default `timeoutMs = 1500` | Service typically responds in <300ms. 1.5s ceiling keeps server actions responsive without flagging healthy requests. Overridable per call. |
| Idempo | Idempotency is **not** documented as a property | We don't control the service; observed idempotency in one probe is not a guarantee. Library is a thin pipe. |
| Empty | Empty-string input short-circuits without calling the service | Saves a network round-trip; result is trivially `{ output: '' }`. |
| ErrCodes | Four error codes: `service_error`, `network_error`, `timeout`, `aborted` | TypeScript catches non-string input at compile time; a runtime `bad_input` code is redundant. |

## Public API

```ts
export type EntityType = 'named' | 'numeric' | 'none';

export type TypografOptions = {
  /** Entity encoding strategy. Default: 'none' (raw UTF-8). */
  entityType?: EntityType;
  /** Insert <br/> at single newlines. Default: false. */
  useBr?: boolean;
  /** Wrap blocks in <p>. Default: false. */
  useP?: boolean;
  /** Glue word length for NBSPs. Default: 3. */
  maxNobr?: number;
  /** Override service URL (for self-hosted instances / testing). */
  endpoint?: string;
  /** AbortSignal for caller-initiated cancellation. */
  signal?: AbortSignal;
  /** Request timeout in ms. Default: 1500. */
  timeoutMs?: number;
};

export type TypografResult =
  | { output: string }
  | {
      error: 'service_error' | 'network_error' | 'timeout' | 'aborted';
      detail?: string;
    };

export function typograf(
  input: string,
  options?: TypografOptions
): Promise<TypografResult>;
```

Narrowing at the call site:

```ts
const r = await typograf(text);
if ('error' in r) {
  // r.error: 'service_error' | 'network_error' | 'timeout' | 'aborted'
  // r.detail?: string
} else {
  // r.output: string
}
```

## Architecture

### Repo layout

```
typograf-artlebedev/
├── .github/
│   └── workflows/
│       ├── ci.yml              # lint + test + build on push/PR
│       └── release.yml         # publish on git tag v*
├── src/
│   ├── index.ts                # public exports
│   ├── typograf.ts             # main function
│   ├── soap.ts                 # envelope build + response extract
│   ├── entities.ts             # XML entity decode / escape
│   └── types.ts                # public types
├── test/
│   ├── typograf.test.ts        # main function, mocked fetch
│   ├── soap.test.ts            # pure unit tests
│   └── live.integration.test.ts # opt-in via TYPOGRAF_LIVE=1
├── .gitignore
├── eslint.config.mjs
├── package.json
├── README.md
├── LICENSE                     # MIT
├── tsconfig.json
├── tsconfig.build.json
└── vitest.config.ts
```

### SOAP envelope construction (`src/soap.ts`)

```ts
const SOAPACTION = 'http://typograf.artlebedev.ru/webservices/ProcessText';
const NS = 'http://typograf.artlebedev.ru/webservices/';
export const DEFAULT_ENDPOINT =
  'https://typograf.artlebedev.ru/webservices/typograf.asmx';

const ENTITY_MAP: Record<EntityType, 1 | 2 | 3> = {
  named: 1,
  numeric: 2,
  none: 3,
};

export function buildEnvelope(
  text: string,
  entityType: 1 | 2 | 3,
  useBr: boolean,
  useP: boolean,
  maxNobr: number
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
```

### Response extraction (`src/soap.ts`)

```ts
const RESULT_RE = /<ProcessTextResult>([\s\S]*?)<\/ProcessTextResult>/;

export function extractResult(soapBody: string): string | null {
  const m = RESULT_RE.exec(soapBody);
  return m ? decodeXmlEntities(m[1]) : null;
}
```

### Entity coder (`src/entities.ts`)

```ts
const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
};

/**
 * Decode SOAP-layer XML escapes only. Numeric character references
 * (`&#171;`, `&#x00A0;`) MUST pass through unchanged — if the caller
 * requested `entityType: 'numeric'`, those references are the intended
 * output, not something to be reversed.
 */
export function decodeXmlEntities(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => NAMED[name]);
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
```

The decoder is intentionally limited to the five named XML escapes used by
the SOAP transport. Numeric character references are output-mode artifacts
and must not be touched by the wrapper.

### Main flow (`src/typograf.ts`)

```ts
export async function typograf(
  input: string,
  opts: TypografOptions = {}
): Promise<TypografResult> {
  if (input === '') return { output: '' };

  const entityType = ENTITY_MAP[opts.entityType ?? 'none'];
  const useBr     = opts.useBr ?? false;
  const useP      = opts.useP ?? false;
  const maxNobr   = opts.maxNobr ?? 3;
  const endpoint  = opts.endpoint ?? DEFAULT_ENDPOINT;
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
```

## Error code semantics

| Code | Trigger |
|------|---------|
| `network_error` | `fetch` rejected for a non-abort reason (DNS failure, connection refused, TLS error). `detail` carries the underlying error message. |
| `timeout` | `timeoutMs` elapsed before the response headers arrived. |
| `aborted` | Caller's `AbortSignal` fired. |
| `service_error` | HTTP non-2xx, response body missing `<ProcessTextResult>`, or response parse failure. `detail` carries a short reason (`HTTP 502`, `malformed SOAP response`). |

## Build

- `tsup src/index.ts --format esm,cjs --dts` — single dev dep, dual ESM+CJS
  bundle, declarations in one pass.
- `package.json` exports:
  ```json
  {
    "type": "module",
    "main": "./dist/index.cjs",
    "module": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
      ".": {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.js",
        "require": "./dist/index.cjs"
      }
    },
    "files": ["dist", "README.md", "LICENSE"]
  }
  ```
- `engines.node`: `>=22.5.0`.

## Testing

Three test files in `test/`.

### `typograf.test.ts` (mocked fetch)

`vi.stubGlobal('fetch', vi.fn())`. Coverage:

- Successful response → `{ output }`.
- `network_error` (fetch rejects).
- `service_error` for HTTP 500.
- `service_error` for HTTP 200 with body missing `<ProcessTextResult>`.
- `timeout` (fake timers; response delayed past `timeoutMs`).
- `aborted` (caller `AbortSignal` fires).
- Empty-string short-circuit (fetch is NOT called).
- Each `entityType` string maps to the right SOAP integer (`1` / `2` / `3`).
- Default options are applied when omitted.
- Caller's `signal` composes with internal timeout (caller-abort wins,
  timeout-abort wins, both stay independent).

### `soap.test.ts` (pure)

No I/O. Covers `buildEnvelope`, `extractResult`, `decodeXmlEntities`,
`escapeXml`. Includes:

- Round-trip `escapeXml` + `decodeXmlEntities` over `&<>"'` and a sample of
  Unicode strings.
- Multi-line response bodies extract correctly (regex `[\s\S]*?`).
- `entityType: 'numeric'` round-trip: a response body containing
  `&amp;#171;Привет&amp;#187;` decodes to `&#171;Привет&#187;` — the SOAP
  `&amp;` is undone, numeric character references are preserved.

### `live.integration.test.ts` (opt-in)

Skipped by default. Enabled with `TYPOGRAF_LIVE=1`. Single test: round-trip
`"Привет" - мир` through the live service with `entityType: 'none'`, asserts
the result equals `«Привет»` + NBSP (U+00A0) + `— мир`. Typograf inserts
the NBSP between the closing guillemet and the em-dash per `maxNobr=3`.

Compare via the explicit `\uXXXX` codepoint form so an NBSP-vs-regular-space
regression cannot be misread by a human reader:

```ts
const expected = '«Привет»\u00A0— мир';
```

Pinned regression baseline against ArtLebedev's current pipeline; fails
loudly if the envelope shape or default rules change. Not run in CI to avoid
hammering ArtLebedev.

Coverage target: ≥ 90% line coverage via Coveralls.

## CI / release

### `.github/workflows/ci.yml`

```yaml
name: ci
on:
  push: { branches: [master] }
  pull_request: { branches: [master] }
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - run: npm run build
      - uses: coverallsapp/github-action@v2
        with: { github-token: ${{ secrets.GITHUB_TOKEN }} }
```

Node 24 in CI; Node 22.5+ as the consumer runtime floor. The live
integration test is not run in CI.

### `.github/workflows/release.yml`

```yaml
name: release
on:
  push: { tags: ['v*'] }

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions: { contents: read, id-token: write }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24', registry-url: 'https://registry.npmjs.org' }
      - run: npm ci
      - run: npm run build
      - run: npm publish --provenance --access public
        env: { NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }} }
```

Release flow: bump `version` in `package.json` on master → tag `v1.0.0` →
workflow publishes. `--provenance` enabled — generates a signed npm
provenance attestation linking the tarball to this GitHub Actions build.
Requires `id-token: write` permission and an `NPM_TOKEN` secret. No
`semantic-release`, no `changesets`.

## README outline

1. One-liner + badges (npm version, CI status, Coveralls).
2. Install.
3. Usage — minimal example.
4. API reference — `typograf()`, `TypografOptions`, `TypografResult`,
   `EntityType`.
5. Options table — defaults, valid values, link to ArtLebedev docs.
6. Error codes table.
7. Privacy notice — third-party service; do not send sensitive drafts.
8. Comparison — vs `node-artlebedev-typograf` (stale `request` dep, no TS),
   vs `typograf` (local rules, not ArtLebedev's). One sentence each.
9. License (MIT) + author.

## Acceptance criteria

- [ ] Repo `mellonis/typograf-artlebedev` created and pushed to GitHub.
- [ ] Package `@mellonis/typograf-artlebedev@1.0.0` published on npm with
  provenance.
- [ ] CI green on master.
- [ ] ≥ 90% line coverage on Coveralls.
- [ ] `TYPOGRAF_LIVE=1 npm test` passes locally against the live service.
- [ ] README sections (1)-(9) present.
- [ ] [mellonis/poetry-nextjs#114](https://github.com/mellonis/poetry-nextjs/issues/114)
  updated to depend on the published package.
- [ ] [mellonis/poetry#12](https://github.com/mellonis/poetry/issues/12)
  closed.
