# Phase 1: Project Foundation & Dual Provider Service Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize a Next.js 14 TypeScript project with Tailwind CSS, environment validation, prompt templates, presentation schemas, OpenAI-compatible dual AI provider services (text and image) with exponential/fixed backoff retries, and a health check API route verified with TDD.

**Architecture:** Next.js 14 App Router backend service architecture. Centralized type validation with Zod for environment and schema parsing. Provider abstraction on top of the official `openai` SDK with isolated clients for text generation (`/v1/chat/completions`) and image generation (`/v1/images/generations`). Robust retry backoff wrappers.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, ESLint, `openai` SDK, `zod`, `vitest` for test runner.

## Global Constraints

- Must be Next.js 14 with TypeScript and Tailwind CSS in the workspace root.
- Environment schema strictly matches:
  - `TEXT_PROVIDER_BASE_URL`
  - `TEXT_PROVIDER_API_KEY`
  - `TEXT_PROVIDER_MODEL`
  - `IMAGE_PROVIDER_BASE_URL`
  - `IMAGE_PROVIDER_API_KEY`
  - `IMAGE_PROVIDER_MODEL`
  - `MAX_FILE_SIZE_MB`
- Retry logic:
  - Text provider: 5 retries with exponential backoff (1s, 2s, 4s, 8s, 16s).
  - Image provider: 3 retries with 2s backoff.
- Image generation prompt prefix: `"Premium, bright, friendly, primary school educational cartoon vector graphic, set in a Philippine school environment: "` + `visualDescription`.
- Zero frontend UI in this phase — backend services only.
- Red-Green-Refactor: all services must have unit tests verifying behavior and error/retry logic.

---

### Task 1: Scaffold Next.js 14 Project and Test Harness

**Files:**
- Create/Initialize: workspace root Next.js scaffolding (`package.json`, `tsconfig.json`, `tailwind.config.ts`, `src/app/`, etc.)
- Modify: `package.json` to include `openai`, `zod`, and dev dependencies (`vitest`)
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: working Next.js 14 project capable of `npm run build` and `npm test` via vitest.

- [ ] **Step 1: Scaffold Next.js 14 app**
Run: `npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
- [ ] **Step 2: Install dependencies**
Run: `npm install openai zod && npm install -D vitest @types/node`
- [ ] **Step 3: Configure Vitest**
Create `vitest.config.ts` with path aliasing for `@/*`.
- [ ] **Step 4: Verify test runner works**
Run `npm test` or `npx vitest run`.
- [ ] **Step 5: Verify build works**
Run `npm run build`.

---

### Task 2: Shared Presentation Types & Prompts

**Files:**
- Create: `src/types/presentation.ts`
- Create: `src/lib/prompts/slide-generation.ts`
- Test: `tests/prompts/slide-generation.test.ts`

**Interfaces:**
- Consumes: None
- Produces:
  - `SlideData` and `PresentationData` interfaces
  - `SYSTEM_PROMPT` (string)
  - `USER_PROMPT_TEMPLATE(textToProcess: string, selectedSession: string, detectedSubject: string): string`
  - `IMAGE_PROMPT_PREFIX` (string)

- [ ] **Step 1: Write failing test for prompts and types**
Verify `SYSTEM_PROMPT` contains required pedagogical directives, `USER_PROMPT_TEMPLATE` formats input correctly, and `IMAGE_PROMPT_PREFIX` matches the required prefix string.
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/prompts/slide-generation.test.ts`
- [ ] **Step 3: Implement `src/types/presentation.ts` and `src/lib/prompts/slide-generation.ts`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 3: Environment Configuration and Validation

**Files:**
- Create: `.env.example`
- Create: `.env.local`
- Create: `src/lib/env.ts`
- Test: `tests/lib/env.test.ts`

**Interfaces:**
- Consumes: `process.env`
- Produces: `env` object typed with:
  - `textProvider: { baseUrl, apiKey, model }`
  - `imageProvider: { baseUrl, apiKey, model }`
  - `app: { maxFileSizeMb }`
  - Helper `validateEnv(envVars?: Record<string, string | undefined>)`

- [ ] **Step 1: Write failing test for environment validation**
Test valid env parsing, missing key errors, and default parsing.
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/lib/env.test.ts`
- [ ] **Step 3: Implement `.env.example`, `.env.local`, and `src/lib/env.ts`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 4: Text AI Provider Service

**Files:**
- Create: `src/lib/providers/text-provider.ts`
- Test: `tests/lib/providers/text-provider.test.ts`

**Interfaces:**
- Consumes: `env` from `src/lib/env.ts`, `SYSTEM_PROMPT` & `USER_PROMPT_TEMPLATE` from `src/lib/prompts/slide-generation.ts`, `PresentationData` from `src/types/presentation.ts`.
- Produces: `generateSlideContent(lessonText: string, session: string, detectedSubject: string): Promise<PresentationData>`

- [ ] **Step 1: Write failing test for text provider**
Test:
- Successful generation and structured JSON parsing.
- Retry logic triggering on 429/500 errors with backoffs up to 5 retries.
- Schema validation rejection when response does not conform to `PresentationData`.
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/lib/providers/text-provider.test.ts`
- [ ] **Step 3: Implement `src/lib/providers/text-provider.ts`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 5: Image AI Provider Service

**Files:**
- Create: `src/lib/providers/image-provider.ts`
- Test: `tests/lib/providers/image-provider.test.ts`

**Interfaces:**
- Consumes: `env` from `src/lib/env.ts`, `IMAGE_PROMPT_PREFIX` from `src/lib/prompts/slide-generation.ts`.
- Produces: `generateSlideImage(visualDescription: string): Promise<string>` returning base64 image data.

- [ ] **Step 1: Write failing test for image provider**
Test:
- Correct prompt prefixing and standard 1024x576 parameters.
- Base64 image return format.
- 3 retries with 2s backoff on failures.
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/lib/providers/image-provider.test.ts`
- [ ] **Step 3: Implement `src/lib/providers/image-provider.ts`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 6: Health Check API Route and End-to-End Verification

**Files:**
- Create: `src/app/api/health/route.ts`
- Test: `tests/api/health.test.ts`

**Interfaces:**
- Consumes: `textProviderClient`, `imageProviderClient`, `env`
- Produces: `GET /api/health` handler returning `{ textProvider: "ok" | "error", imageProvider: "ok" | "error", errors?: string[] }`

- [ ] **Step 1: Write failing test for `/api/health` route**
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/api/health.test.ts`
- [ ] **Step 3: Implement `src/app/api/health/route.ts`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Full verification**
Run `npm test`, `npm run build`, and test the `/api/health` route.
