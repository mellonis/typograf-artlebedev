# `@mellonis/typograf-artlebedev` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish `@mellonis/typograf-artlebedev@1.0.0` — a TypeScript, fetch-based, zero-runtime-dependency npm wrapper around ArtLebedev's Typograf SOAP service.

**Architecture:** Single-package npm library. One public function `typograf(input, options?)` that constructs a SOAP envelope, posts it via `fetch`, extracts `<ProcessTextResult>` from the response with a regex, and returns a discriminated-union `{ output } | { error, detail? }`. Source in `src/{typograf,soap,entities,types,index}.ts`. Build via `tsup` → dual ESM + CJS + `.d.ts`. Tests in Vitest: unit tests with mocked `fetch` plus an opt-in live integration test gated by `TYPOGRAF_LIVE=1`.

**Tech Stack:** TypeScript 5+, Vitest 4, `tsup` (build), ESLint 10 + `typescript-eslint`, GitHub Actions CI, Coveralls coverage reporting, npm publish with `--provenance`.

**Spec:** `docs/superpowers/specs/2026-05-11-typograf-artlebedev-design.md`

**Tracking issue:** [mellonis/poetry#12](https://github.com/mellonis/poetry/issues/12)
**Consumer:** [mellonis/poetry-nextjs#114](https://github.com/mellonis/poetry-nextjs/issues/114)

**New repo location:** `/Users/mellonis/Developer/mellonis-workspace/typograf-artlebedev/` (sibling to `machines/`, `poetry/`, etc., per the umbrella-workspace pattern; auto-ignored by the workspace `/*` rule).

---

## ⚠️ Executor notes

- **Per the user's global `CLAUDE.md` (`Never run \`git commit\` without explicit permission`), every `git commit` step in this plan MUST be gated on explicit per-commit user approval.** Stage the changes, show the diff and the proposed commit message, then ask the user "OK to commit?" and wait for an answer before running `git commit`.
- **Branch protection ("mental protection" per poetry/CLAUDE.md):** this is a fresh repo so no PR flow is required for the initial scaffold; commits land directly on `master`. After v1.0.0 is published, future changes should follow the standard branch + PR flow.
- **Pause for `gh repo create` and `npm publish` steps** — these are externally-visible side effects. Confirm with the user before executing.
- **Working directory** for every step below is the new repo root `~/Developer/mellonis-workspace/typograf-artlebedev/` unless noted otherwise.

---

## File Map

**Create (new files):**
- `.gitignore`
- `.npmignore`
- `LICENSE` — MIT
- `README.md`
- `package.json`
- `tsconfig.json`
- `tsconfig.build.json`
- `eslint.config.mjs`
- `vitest.config.ts`
- `tsup.config.ts`
- `src/index.ts` — public exports
- `src/types.ts` — `EntityType`, `TypografOptions`, `TypografResult`
- `src/entities.ts` — `escapeXml`, `decodeXmlEntities`
- `src/soap.ts` — `ENTITY_MAP`, `DEFAULT_ENDPOINT`, `buildEnvelope`, `extractResult`
- `src/typograf.ts` — `typograf()` main function
- `test/entities.test.ts`
- `test/soap.test.ts`
- `test/typograf.test.ts`
- `test/live.integration.test.ts` — opt-in via `TYPOGRAF_LIVE=1`
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`

**No modifications to existing repos in this plan.** Linking `poetry-nextjs#114` to this package is out of scope here — it happens after v1.0.0 is on npm, in a separate PR against `poetry-nextjs`.

---

## Task 1: Initialize the new repo (local + GitHub)

**Files:**
- Create: `LICENSE`, `.gitignore`, `README.md`

- [ ] **Step 1: Create the directory and initialize git**

```bash
mkdir -p ~/Developer/mellonis-workspace/typograf-artlebedev
cd ~/Developer/mellonis-workspace/typograf-artlebedev
git init -b master
```

- [ ] **Step 2: Create `.gitignore`**

```
# dependencies
/node_modules

# build
/dist

# test artifacts
/coverage
*.tsbuildinfo

# editor / OS
.DS_Store
.idea/
.vscode/

# logs
npm-debug.log*

# env
.env
.env.local
```

- [ ] **Step 3: Create `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 Ruslan Gilmullin <mellonis@yandex.ru>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 4: Create a minimal `README.md` placeholder** (full README in Task 12)

```markdown
# @mellonis/typograf-artlebedev

TypeScript wrapper around the ArtLebedev Typograf SOAP service for Russian-language typography polish.

Work in progress — README will be expanded once the API stabilises.
```

- [ ] **Step 5: Initial commit (PAUSE: get user approval before executing)**

Stage:

```bash
git add .gitignore LICENSE README.md
git status
git diff --cached
```

Propose commit message:

```
chore: initialize repo (license, gitignore, placeholder README)
```

After user approves:

```bash
git commit -m "chore: initialize repo (license, gitignore, placeholder README)"
```

- [ ] **Step 6: Create GitHub repo (PAUSE: get user approval before executing)**

```bash
gh repo create mellonis/typograf-artlebedev \
  --public \
  --description "TypeScript wrapper for ArtLebedev's Typograf SOAP service" \
  --source=. \
  --remote=origin \
  --push
```

Expected: the command creates `https://github.com/mellonis/typograf-artlebedev`, sets it as `origin`, and pushes `master`. Verify with `gh repo view mellonis/typograf-artlebedev`.

---

## Task 2: Tooling — package.json, TypeScript, ESLint, Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.build.json`, `eslint.config.mjs`, `vitest.config.ts`, `.npmignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@mellonis/typograf-artlebedev",
  "version": "0.0.0",
  "description": "TypeScript wrapper for ArtLebedev's Typograf SOAP service (Russian typography polish).",
  "keywords": ["typograf", "artlebedev", "typography", "russian", "soap", "smart-quotes", "nbsp"],
  "homepage": "https://github.com/mellonis/typograf-artlebedev#readme",
  "bugs": {
    "url": "https://github.com/mellonis/typograf-artlebedev/issues"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/mellonis/typograf-artlebedev.git"
  },
  "license": "MIT",
  "author": "Ruslan Gilmullin <mellonis@yandex.ru>",
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
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=22.5.0"
  },
  "scripts": {
    "build": "tsup",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@vitest/coverage-v8": "^4.1.5",
    "eslint": "^10.3.0",
    "tsup": "^8.0.0",
    "typescript": "^5.6.0",
    "typescript-eslint": "^8.59.2",
    "vitest": "^4.1.5"
  }
}
```

Notes:
- `version: "0.0.0"` until the first release tag. Bumped to `1.0.0` in Task 14 before tagging.
- `publishConfig.access: public` is required for scoped packages.
- `publishConfig.provenance: true` enables `npm publish --provenance` semantics by default.

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2023", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "test/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

`lib` includes `DOM` for the `AbortSignal`/`fetch`/`Response` ambient types used by the implementation. `noUncheckedIndexedAccess` is on so the regex-match group accesses (`m[1]`) are typed `string | undefined` and forces explicit handling.

- [ ] **Step 3: Create `tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 4: Create `eslint.config.mjs`**

```javascript
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  ...tsEslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
```

- [ ] **Step 5: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    clearMocks: true,
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      all: true,
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', '**/*.d.ts'],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
```

`src/index.ts` excluded from coverage because it's a re-export barrel with no logic.

- [ ] **Step 6: Create `.npmignore`**

```
# Everything by default; `files` in package.json is the allowlist
# This file exists only to suppress files that slip past `files`
*
!dist/**
!README.md
!LICENSE
```

Belt-and-suspenders alongside the `files` allowlist in `package.json`.

- [ ] **Step 7: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` populated, `package-lock.json` created. Verify with `npm ls --depth=0`.

- [ ] **Step 8: Verify the tooling runs (will fail with no sources yet — that's fine for `test`, not for `lint`/`typecheck`)**

```bash
npm run lint
npm run typecheck
npm test
```

Expected:
- `lint`: exit 0 (no files to lint yet)
- `typecheck`: exit 0 (no files to compile yet)
- `test`: exit 1 with "No test files found" — acceptable; will be green after Task 3.

- [ ] **Step 9: Commit (PAUSE: get user approval before executing)**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.build.json eslint.config.mjs vitest.config.ts .npmignore
git status
git diff --cached
```

Propose commit message:

```
chore: set up tooling (tsc, vitest, eslint, tsup, typescript-eslint)
```

After approval, run the commit and push:

```bash
git commit -m "chore: set up tooling (tsc, vitest, eslint, tsup, typescript-eslint)"
git push
```

---

## Task 3: `src/entities.ts` — escapeXml + decodeXmlEntities (TDD)

**Files:**
- Create: `test/entities.test.ts`, `src/entities.ts`

- [ ] **Step 1: Write the failing test**

`test/entities.test.ts`:

```typescript
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
    // If we replaced `<` before `&`, then a literal `&lt;` in the input
    // would become `&amp;lt;` instead of `&amp;lt;` (which IS what we want
    // but only because `&` is handled first). Verify the canonical case:
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: Vitest reports the test file failed to load — `Cannot find module '../src/entities.js'`. This confirms the test setup is correct and the implementation is missing.

- [ ] **Step 3: Implement `src/entities.ts`**

```typescript
const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

/**
 * Decode SOAP-layer XML escapes only. Numeric character references
 * (`&#171;`, `&#x00A0;`) and unknown named entities MUST pass through
 * unchanged — if the caller requested `entityType: 'numeric'` or
 * `entityType: 'named'`, those references are the intended output and
 * must not be reversed.
 */
export function decodeXmlEntities(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|apos);/g, (_match, name: string) => NAMED[name]!);
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

`NAMED[name]!` is safe — the regex only captures keys that exist in the map.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all 9 tests pass.

- [ ] **Step 5: Lint and typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: both exit 0.

- [ ] **Step 6: Commit (PAUSE for approval)**

```bash
git add src/entities.ts test/entities.test.ts
git diff --cached
```

Proposed message:

```
feat: add escapeXml and decodeXmlEntities

decodeXmlEntities is intentionally limited to the five SOAP-layer XML
escapes; numeric character references pass through unchanged so a caller
who requested entityType=numeric gets the intended output.
```

After approval: `git commit -m "..."` and `git push`.

---

## Task 4: `src/soap.ts` — buildEnvelope, extractResult, ENTITY_MAP (TDD)

**Files:**
- Create: `test/soap.test.ts`, `src/soap.ts`

- [ ] **Step 1: Write the failing test**

`test/soap.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: `Cannot find module '../src/soap.js'`.

- [ ] **Step 3: Implement `src/soap.ts`**

```typescript
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
```

Note: this file imports `EntityType` from `./types.js`, which doesn't exist yet. The TypeScript build will fail until Task 5 lands. Vitest will also fail to load this file. That's expected — the failing-test step at the start of Task 5 covers it.

- [ ] **Step 4: Create `src/types.ts` (needed for `soap.ts` to compile)**

This file is fully fleshed out in Task 5; for now only the bare `EntityType` is needed:

```typescript
export type EntityType = 'named' | 'numeric' | 'none';

// Rest of the types are added in Task 5.
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test
```

Expected: all `soap.test.ts` tests pass (in addition to the 9 from Task 3). Total: ~22 tests.

- [ ] **Step 6: Lint and typecheck**

```bash
npm run lint && npm run typecheck
```

- [ ] **Step 7: Commit (PAUSE for approval)**

```bash
git add src/soap.ts src/types.ts test/soap.test.ts
git diff --cached
```

Proposed message:

```
feat: add SOAP envelope builder and response extractor

buildEnvelope constructs the ProcessText SOAP body; extractResult parses
<ProcessTextResult> and undoes SOAP-layer XML escaping. ENTITY_MAP maps
the public 'named'/'numeric'/'none' strings to the integers ArtLebedev's
service expects.
```

After approval: commit and push.

---

## Task 5: `src/types.ts` — public type surface

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Replace `src/types.ts` with the full type surface**

```typescript
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
  /** Override service URL. Default: ArtLebedev's public endpoint. */
  endpoint?: string;
  /** AbortSignal for caller-initiated cancellation. */
  signal?: AbortSignal;
  /** Request timeout in milliseconds. Default: 1500. */
  timeoutMs?: number;
};

export type TypografErrorCode =
  | 'service_error'
  | 'network_error'
  | 'timeout'
  | 'aborted';

export type TypografResult =
  | { output: string }
  | { error: TypografErrorCode; detail?: string };
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: No commit yet** — this small change will be folded into the Task 6 commit since `src/typograf.ts` consumes these types directly. Skip ahead.

---

## Task 6: `src/typograf.ts` — main function, success path (TDD)

**Files:**
- Create: `test/typograf.test.ts`, `src/typograf.ts`

- [ ] **Step 1: Write the failing test (success path only)**

`test/typograf.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    mockFetchOnce(wrap('«Привет» — мир'));
    const result = await typograf('"Привет" - мир');
    expect(result).toEqual({ output: '«Привет» — мир' });
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: `Cannot find module '../src/typograf.js'`.

- [ ] **Step 3: Implement `src/typograf.ts` (success path only — error handling in Task 7)**

```typescript
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
```

(Error handling, signal/timeout, and empty-string short-circuit added in later tasks.)

- [ ] **Step 4: Run tests to verify success cases pass**

```bash
npm test
```

Expected: all tests pass, including the two new success-path tests.

- [ ] **Step 5: Lint and typecheck**

```bash
npm run lint && npm run typecheck
```

- [ ] **Step 6: Commit (PAUSE for approval)**

```bash
git add src/types.ts src/typograf.ts test/typograf.test.ts
git diff --cached
```

Proposed message:

```
feat: add typograf() main function (success path)

Minimal happy-path implementation: builds SOAP envelope, POSTs via fetch,
extracts the result. Public types are defined in types.ts. Error handling,
timeout/abort composition, and empty-string short-circuit follow.
```

After approval: commit and push.

---

## Task 7: `src/typograf.ts` — error paths (TDD)

**Files:**
- Modify: `test/typograf.test.ts`, `src/typograf.ts`

- [ ] **Step 1: Append failing error-path tests to `test/typograf.test.ts`**

Add this `describe` block at the end of the file:

```typescript
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
```

- [ ] **Step 2: Run tests to verify the new ones fail**

```bash
npm test
```

Expected: 2 new failures (HTTP 500 → success path returns `{ output: ... }` because the current code doesn't check `res.ok`; network_error → unhandled exception). The malformed-body test should already pass thanks to Task 6's behavior.

- [ ] **Step 3: Update `src/typograf.ts` to handle these error paths**

```typescript
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

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: `"${SOAPACTION}"`,
      },
      body: buildEnvelope(input, entityType, useBr, useP, maxNobr),
    });
  } catch (e: unknown) {
    return {
      error: 'network_error',
      detail: e instanceof Error ? e.message : String(e),
    };
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

- [ ] **Step 4: Run tests to verify all pass**

```bash
npm test
```

- [ ] **Step 5: Lint and typecheck**

```bash
npm run lint && npm run typecheck
```

- [ ] **Step 6: Commit (PAUSE for approval)**

```bash
git add src/typograf.ts test/typograf.test.ts
```

Proposed message:

```
feat: add network_error and service_error handling to typograf()
```

After approval: commit and push.

---

## Task 8: `src/typograf.ts` — timeout, AbortSignal, empty-string short-circuit (TDD)

**Files:**
- Modify: `test/typograf.test.ts`, `src/typograf.ts`

- [ ] **Step 1: Append the remaining tests**

Add at the end of `test/typograf.test.ts`:

```typescript
describe('typograf — timeout and abort', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // Mock fetch as a promise that only rejects when the signal it received aborts.
  // The implementation passes the composed signal (caller ∪ internal timeout)
  // via init.signal; aborting either ends up rejecting the fetch promise.
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
    // Abort on the next microtask, after the implementation has wired up
    // its abort listeners.
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
```

- [ ] **Step 2: Run tests to verify the new ones fail**

```bash
npm test
```

Expected: timeout / aborted / empty-string tests all fail (current implementation lacks signal handling and the empty-string short-circuit). Entity-type mapping tests pass.

- [ ] **Step 3: Update `src/typograf.ts` with the final implementation**

```typescript
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
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
npm test
```

Expected: every test passes (~30 tests total across the three test files).

- [ ] **Step 5: Coverage check**

```bash
npm run test:coverage
```

Expected: ≥ 90% lines, ≥ 90% functions, ≥ 85% branches. If below threshold, identify uncovered lines via the text report and add the missing case. Coverage thresholds in `vitest.config.ts` will fail the run if missed.

- [ ] **Step 6: Lint and typecheck**

```bash
npm run lint && npm run typecheck
```

- [ ] **Step 7: Commit (PAUSE for approval)**

```bash
git add src/typograf.ts test/typograf.test.ts
```

Proposed message:

```
feat: add timeout, AbortSignal composition, and empty-input short-circuit

- timeoutMs default 1500ms; caller can override per call
- caller signal composes with internal timeout via AbortSignal.any
- empty string returns { output: '' } without any network call
```

After approval: commit and push.

---

## Task 9: `src/index.ts` — public exports barrel

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create `src/index.ts`**

```typescript
export { typograf } from './typograf.js';
export type {
  EntityType,
  TypografOptions,
  TypografResult,
  TypografErrorCode,
} from './types.js';
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit (PAUSE for approval)**

```bash
git add src/index.ts
```

Proposed message:

```
feat: add public exports barrel
```

After approval: commit and push.

---

## Task 10: Build configuration — tsup dual ESM/CJS + d.ts

**Files:**
- Create: `tsup.config.ts`

- [ ] **Step 1: Create `tsup.config.ts`**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
  outDir: 'dist',
  splitting: false,
  treeshake: true,
});
```

- [ ] **Step 2: Run the build**

```bash
npm run build
```

Expected: `dist/` contains `index.js` (ESM), `index.cjs` (CJS), `index.d.ts`, plus `.map` source maps. Verify with `ls -la dist/`.

- [ ] **Step 3: Smoke-test the published shape (no actual publish)**

```bash
npm pack --dry-run
```

Expected: the listed file set is exactly `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/index.js.map`, `dist/index.cjs.map`, `dist/index.d.ts.map`, `README.md`, `LICENSE`, `package.json`. **No source files, no test files, no configs.**

If anything else slips in, tighten `files` in `package.json` or `.npmignore`.

- [ ] **Step 4: Smoke-test ESM and CJS resolution from a temp consumer**

```bash
TMPDIR=$(mktemp -d)
cd "$TMPDIR"
npm init -y >/dev/null
npm install ~/Developer/mellonis-workspace/typograf-artlebedev
node --input-type=module -e "import { typograf } from '@mellonis/typograf-artlebedev'; console.log(typeof typograf === 'function' ? 'ESM_OK' : 'ESM_FAIL');"
node -e "const { typograf } = require('@mellonis/typograf-artlebedev'); console.log(typeof typograf === 'function' ? 'CJS_OK' : 'CJS_FAIL');"
cd ~/Developer/mellonis-workspace/typograf-artlebedev
rm -rf "$TMPDIR"
```

Expected output: `ESM_OK` and `CJS_OK`.

- [ ] **Step 5: Commit (PAUSE for approval)**

```bash
git add tsup.config.ts
```

Proposed message:

```
build: configure tsup for dual ESM/CJS bundle with declarations
```

After approval: commit and push.

---

## Task 11: Live integration test (opt-in)

**Files:**
- Create: `test/live.integration.test.ts`

- [ ] **Step 1: Create the test file**

`test/live.integration.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { typograf } from '../src/typograf.js';

const LIVE = process.env.TYPOGRAF_LIVE === '1';

describe.skipIf(!LIVE)('typograf — live ArtLebedev service', () => {
  it('round-trips "Привет" - мир with entityType=none', async () => {
    const result = await typograf('"Привет" - мир', { entityType: 'none', timeoutMs: 5000 });
    // Expected: «Привет»<NBSP>— мир  (NBSP = U+00A0, em-dash = U+2014).
    // Compare via explicit \uXXXX so a regular-space-vs-NBSP regression
    // cannot be misread by a human reading this source.
    expect(result).toEqual({ output: '«Привет» — мир' });
  }, 10_000);
});
```

`timeoutMs: 5000` for the live test (network round-trip + Typograf compute). Vitest's `10_000` overall test timeout accommodates retries.

- [ ] **Step 2: Verify the test is SKIPPED by default**

```bash
npm test
```

Expected: the live test appears as `skipped` in the report. CI must not run it.

- [ ] **Step 3: Run the live test once locally**

```bash
TYPOGRAF_LIVE=1 npm test -- test/live.integration.test.ts
```

Expected: 1 test passes. If it fails:
- Output differs slightly → ArtLebedev may have tweaked their rules. Update the expected string and consider whether the change is acceptable.
- Network/timeout error → wait and retry, or verify the service is up via curl.

- [ ] **Step 4: Commit (PAUSE for approval)**

```bash
git add test/live.integration.test.ts
```

Proposed message:

```
test: add opt-in live integration test (TYPOGRAF_LIVE=1)

Skipped by default. Pins one input/output pair as a regression baseline
against ArtLebedev's live pipeline so changes in their service are caught.
```

After approval: commit and push.

---

## Task 12: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md` with the full content**

```markdown
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
```

- [ ] **Step 2: Commit (PAUSE for approval)**

```bash
git add README.md
```

Proposed message:

```
docs: write the README
```

After approval: commit and push.

---

## Task 13: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
name: ci
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:coverage
      - run: npm run build
      - uses: coverallsapp/github-action@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 2: Commit and push to trigger CI (PAUSE for approval)**

```bash
git add .github/workflows/ci.yml
```

Proposed message:

```
ci: add lint + typecheck + test:coverage + build workflow
```

After approval: commit and push.

- [ ] **Step 3: Verify CI passes**

```bash
gh run watch
```

Expected: green on the first push. If red, fix and force a re-run via `gh run rerun --failed`.

- [ ] **Step 4: Enable Coveralls for the repo (one-time manual setup)**

PAUSE — ask the user to confirm that `coveralls.io` is enabled for the new repo. Instructions:
1. Visit https://coveralls.io/
2. Sign in with GitHub.
3. Enable coverage for `mellonis/typograf-artlebedev`.

The badge URL in the README assumes this is done. If the user prefers to skip Coveralls for now, remove the Coveralls step from `ci.yml` and the badge from `README.md`.

---

## Task 14: Release workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create the release workflow**

```yaml
name: release
on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:coverage
      - run: npm run build
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 2: Add the `NPM_TOKEN` secret (manual, PAUSE)**

Ask the user to provision an `NPM_TOKEN` automation token at https://www.npmjs.com/settings/~/tokens (type: "Automation"; required for 2FA-protected accounts to publish from CI), then save it as a repo secret:

```bash
gh secret set NPM_TOKEN --repo mellonis/typograf-artlebedev
```

Paste the token when prompted.

- [ ] **Step 3: Commit (PAUSE for approval)**

```bash
git add .github/workflows/release.yml
```

Proposed message:

```
ci: add release workflow (publish on git tag v*)

Uses npm provenance — requires id-token: write permission and NPM_TOKEN
secret. Builds, tests, lints, then publishes the dist/ output.
```

After approval: commit and push.

---

## Task 15: First release — v1.0.0

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Final pre-release verification**

```bash
npm ci
npm run lint
npm run typecheck
npm run test:coverage
TYPOGRAF_LIVE=1 npm test -- test/live.integration.test.ts
npm run build
npm pack --dry-run
```

Every command must exit 0. If anything fails, **do not tag** — investigate and fix.

- [ ] **Step 2: Bump version to 1.0.0**

Edit `package.json` and change:

```json
"version": "0.0.0",
```

to:

```json
"version": "1.0.0",
```

- [ ] **Step 3: Commit the version bump (PAUSE for approval)**

```bash
git add package.json
git diff --cached
```

Proposed message:

```
chore(release): 1.0.0
```

After approval: commit and push.

- [ ] **Step 4: Tag and push the tag (PAUSE for approval)**

```bash
git tag -a v1.0.0 -m "v1.0.0 — initial release"
git push origin v1.0.0
```

This triggers `.github/workflows/release.yml`. Watch with:

```bash
gh run watch
```

Expected: green run, package published, provenance attestation visible on the npm package page.

- [ ] **Step 5: Verify the published package**

```bash
npm view @mellonis/typograf-artlebedev
```

Expected: shows `1.0.0` as `latest`. Verify provenance:

```bash
npm view @mellonis/typograf-artlebedev dist
```

The output should reference the GitHub Actions build that published it.

- [ ] **Step 6: Create a GitHub release**

```bash
gh release create v1.0.0 \
  --repo mellonis/typograf-artlebedev \
  --title "v1.0.0 — initial release" \
  --notes "Initial release. See README for usage."
```

- [ ] **Step 7: Close the tracking issue**

```bash
gh issue close 12 --repo mellonis/poetry --comment "Published as @mellonis/typograf-artlebedev@1.0.0 — https://www.npmjs.com/package/@mellonis/typograf-artlebedev"
```

- [ ] **Step 8: Update poetry-nextjs#114**

Add a comment to [poetry-nextjs#114](https://github.com/mellonis/poetry-nextjs/issues/114) noting that the wrapper is available, and the server-action work can now proceed:

```bash
gh issue comment 114 --repo mellonis/poetry-nextjs --body "Wrapper published — \`@mellonis/typograf-artlebedev@1.0.0\` is on npm. The server action work can now use it as a runtime dep instead of embedding SOAP plumbing."
```

---

## Done criteria

- [ ] `@mellonis/typograf-artlebedev@1.0.0` is on npm with a provenance attestation.
- [ ] `mellonis/typograf-artlebedev` repo exists on GitHub with a green CI run on master.
- [ ] Coveralls shows ≥ 90% coverage.
- [ ] `TYPOGRAF_LIVE=1 npm test` passes locally.
- [ ] poetry#12 is closed with a link to the published package.
- [ ] poetry-nextjs#114 has been notified.
