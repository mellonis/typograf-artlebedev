# @mellonis/typograf-artlebedev

[![npm](https://img.shields.io/npm/v/@mellonis/typograf-artlebedev.svg)](https://www.npmjs.com/package/@mellonis/typograf-artlebedev)
[![CI](https://github.com/mellonis/typograf-artlebedev/actions/workflows/ci.yml/badge.svg)](https://github.com/mellonis/typograf-artlebedev/actions/workflows/ci.yml)
[![Coverage](https://coveralls.io/repos/github/mellonis/typograf-artlebedev/badge.svg?branch=master)](https://coveralls.io/github/mellonis/typograf-artlebedev?branch=master)

TypeScript, zero-runtime-dependency wrapper around the [ArtLebedev Typograf](https://www.artlebedev.ru/typograf/) SOAP service. Returns Russian-typography-polished text: smart quotes (`«…»`), em/en dashes, NBSPs glued around short words, and the rest of ArtLebedev's pipeline.

## Install

```sh
npm install @mellonis/typograf-artlebedev
```

Node 22.5+ required (uses `AbortSignal.any`).

## Usage

```ts
import { typograf } from '@mellonis/typograf-artlebedev';

const result = await typograf('"Привет" - мир');
if ('error' in result) {
  console.error(`typograf failed: ${result.error}`, result.detail);
} else {
  console.log(result.output);
  // «Привет»<NBSP>— мир   (NBSP = U+00A0, em-dash = U+2014)
}
```

## API

### `typograf(input: string, options?: TypografOptions): Promise<TypografResult>`

| Option       | Type                                | Default                                            | Description                                                       |
| ------------ | ----------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| `entityType` | `'named' \| 'numeric' \| 'none'`    | `'none'`                                           | `named` → `&laquo;`, `numeric` → `&#171;`, `none` → raw chars.    |
| `useBr`      | `boolean`                           | `false`                                            | Insert `<br/>` at single newlines.                                |
| `useP`       | `boolean`                           | `false`                                            | Wrap blocks in `<p>`.                                             |
| `maxNobr`    | `number`                            | `3`                                                | Glue word length (in characters) for NBSP insertion.              |
| `endpoint`   | `string`                            | ArtLebedev's public SOAP URL                       | Override for self-hosted instances or tests.                      |
| `signal`     | `AbortSignal`                       | —                                                  | Caller-initiated cancellation.                                    |
| `timeoutMs`  | `number`                            | `1500`                                             | Request timeout in milliseconds.                                  |

### `TypografResult`

```ts
type TypografResult =
  | { output: string }
  | { error: 'service_error' | 'network_error' | 'timeout' | 'aborted'; detail?: string };
```

Discriminate via `'error' in result`.

| Error code      | Trigger                                                                          |
| --------------- | -------------------------------------------------------------------------------- |
| `network_error` | `fetch` rejected for non-abort reasons (DNS, connection refused, TLS).            |
| `timeout`       | `timeoutMs` elapsed before response headers arrived.                              |
| `aborted`       | Caller's `AbortSignal` fired.                                                     |
| `service_error` | HTTP non-2xx, missing `<ProcessTextResult>`, or response parse failure.           |

## Privacy

This library calls a **third-party service** (ArtLebedev's `typograf.artlebedev.ru`) with the text you pass in. Do not send sensitive drafts; the operator has no insight into ArtLebedev's logging or rate-limiting. For high-privacy use cases, consider [`typograf`](https://www.npmjs.com/package/typograf) (a local rule-based engine, different rules).

## Comparison

- [`node-artlebedev-typograf`](https://www.npmjs.com/package/node-artlebedev-typograf) — older wrapper; relies on the deprecated `request` package, no TypeScript, last release 2017.
- [`typograf`](https://www.npmjs.com/package/typograf) — local, rule-based, not ArtLebedev's pipeline. Useful when you want offline operation or different rule choices.

## License

[MIT](./LICENSE) © Ruslan Gilmullin
