# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@mellonis/typograf-artlebedev` — a thin TypeScript wrapper around ArtLebedev's Typograf SOAP service for Russian-language typography polish (smart quotes `«…»`, em/en dashes, NBSPs glued around short words). Single public function `typograf(input, options?)`. Zero runtime dependencies. Node 22.5+ only (uses `AbortSignal.any`). Dual ESM+CJS build via `tsup`.

## Spec and plan

The design spec and the v1.0.0 implementation plan live in this repo:

- Spec: [`docs/superpowers/specs/2026-05-11-typograf-artlebedev-design.md`](docs/superpowers/specs/2026-05-11-typograf-artlebedev-design.md)
- Plan: [`docs/superpowers/plans/2026-05-11-typograf-artlebedev.md`](docs/superpowers/plans/2026-05-11-typograf-artlebedev.md)

Tracking issue (closed) was [`mellonis/poetry#12`](https://github.com/mellonis/poetry/issues/12); first consumer was [`mellonis/poetry-nextjs#114`](https://github.com/mellonis/poetry-nextjs/issues/114). The plan is historical — checked in for context on early architectural choices — and is not maintained against the current code.

## Commands

```sh
npm test                # run vitest once
npm run test:watch
npm run test:coverage   # thresholds enforced in vitest.config.ts
npm run lint
npm run typecheck       # tsc --noEmit
npm run build           # tsup → dist/ (ESM + CJS + .d.ts + sourcemaps)
```

Single test file: `npm test -- test/soap.test.ts`. Single test by name: `npm test -- -t "decodes SOAP-layer XML escapes"`.

### Live integration test

`test/live.integration.test.ts` is **skipped by default** and only runs with `TYPOGRAF_LIVE=1`:

```sh
TYPOGRAF_LIVE=1 npm test -- test/live.integration.test.ts
```

It hits the real ArtLebedev service. CI does not run it; run it locally before tagging a release as a regression check against the live pipeline.

## Architecture

Thin layered pipeline with no internal abstractions to speak of. Each layer is one file in `src/`:

```
entities.ts   pure XML escape/decode of the five named entities only.
              Numeric character references (&#171;, &#x00A0;) and unknown
              named entities pass through UNCHANGED — they are output-mode
              artifacts when entityType is 'numeric' or 'named', not
              transport-layer escapes.
soap.ts       SOAP envelope construction + <ProcessTextResult> extraction
              via a single regex. Owns ENTITY_MAP (named=1, numeric=2,
              none=3 — verified empirically against the live service).
types.ts      Public types (EntityType, TypografOptions, TypografResult,
              TypografErrorCode).
typograf.ts   Main function. Composes empty-string short-circuit, option
              defaults, abort/timeout signal composition via
              AbortSignal.any(), fetch, error mapping, response parsing.
index.ts      Public re-exports only. Excluded from coverage.
```

Result type is a discriminated union — narrow at the call site with `'error' in result`, not a boolean tag:

```ts
const r = await typograf(text);
if ('error' in r) {
  // r.error: 'service_error' | 'network_error' | 'timeout' | 'aborted'
} else {
  // r.output: string
}
```

Four error codes, no `bad_input` — non-string input is a compile-time error in TypeScript. `detail` is a short human reason (`"HTTP 502"`, `"malformed SOAP response"`), not for programmatic dispatch.

## Conventions worth knowing

- **`.js` import suffix in TS source.** `import … from './soap.js'` is correct even though `soap.ts` is the source. The `moduleResolution: "bundler"` setting in `tsconfig.json` allows it, and it keeps emitted ESM importable without a rewrite step.
- **`noUncheckedIndexedAccess` is on.** Regex match group access (`m[1]`) is `string | undefined`; always handle the `undefined` case explicitly.
- **No runtime deps, ever.** `dependencies` in `package.json` must stay empty for v1. If a transformation gets more complex, write it; don't reach for a library.
- **Entity decoder is intentionally narrow.** `decodeXmlEntities` only undoes `&amp; &lt; &gt; &quot; &apos;`. Do **not** broaden it to handle numeric character references or other named entities — those are the intended user-visible output when `entityType` is `'numeric'` or `'named'`.
- **Network code lives only in `typograf.ts`.** `soap.ts` and `entities.ts` are pure and tested without `fetch` stubs. Keep it that way.

## Build & publish

- Output goes to `dist/` via `tsup` (`tsup.config.ts`). The `files` field in `package.json` is an allowlist (`dist`, `README.md`, `LICENSE`); `.npmignore` is belt-and-suspenders.
- Release is tag-driven: pushing `v*` triggers `.github/workflows/release.yml` to `npm publish --provenance --access public`. Do **not** publish from a local machine.
- Before a release tag: `npm run lint && npm run typecheck && npm run test:coverage && TYPOGRAF_LIVE=1 npm test -- test/live.integration.test.ts && npm run build && npm pack --dry-run`. The `npm pack --dry-run` output must contain only `dist/*`, `README.md`, `LICENSE`, `package.json` — no source, no tests, no configs.
