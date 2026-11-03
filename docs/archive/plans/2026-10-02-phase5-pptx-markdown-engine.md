# Phase 5: Server-Side PowerPoint (PPTX) & Markdown Compilation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement server-side PPTX generation using `pptxgenjs` with DepEd styling and image/fallback embedding, Markdown curriculum outline compilation, and binary/text download API endpoints (`/api/download-pptx`, `/api/download-markdown`).

**Architecture:** 
- `src/lib/services/pptx-generator.ts`: Pure service wrapping `PptxGenJS` with DepEd palette constants and precise layout coordinates.
- `src/lib/services/markdown-generator.ts`: Pure string compilation service for structured curriculum outlines.
- `src/app/api/download-pptx/route.ts` & `src/app/api/download-markdown/route.ts`: App Router route handlers validating request bodies using existing `presentationDataSchema`, setting appropriate `Content-Type` and `Content-Disposition` attachment headers, and streaming binary/text responses.

**Tech Stack:** Next.js 14, TypeScript, `pptxgenjs`, `vitest`.

## Global Constraints

- Do NOT touch existing Phase 1–3 files unless strictly necessary.
- Slide layout: `LAYOUT_16x9`.
- Color constants:
  - `SHADE_PRIMARY = '047857'`
  - `SHADE_SECONDARY = '10B981'`
  - `SHADE_BACKGROUND = 'F0FDF4'`
  - `SHADE_TEXT_DARK = '1E293B'`
  - `FALLBACK_BG = 'ECFDF5'`
  - `FALLBACK_BORDER = 'A7F3D0'`
- Sanitized filenames:
  - PPTX: `${topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${(session || 'session').toLowerCase()}_DepEdTambayan.pptx`
  - Markdown: `${topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${(session || 'session').toLowerCase()}_Outline.md`
- All unit tests run against mocks or in-memory execution (fast, deterministic).

---

### Task 1: Install PptxGenJS

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install `pptxgenjs`**
Run: `npm install pptxgenjs`
- [ ] **Step 2: Verify package.json and import compatibility**

---

### Task 2: Markdown Outline Generator Service

**Files:**
- Create: `src/lib/services/markdown-generator.ts`
- Test: `tests/lib/services/markdown-generator.test.ts`

**Interfaces:**
- Produces: `buildPresentationMarkdown(presentationData: PresentationData, session?: string): string`

- [ ] **Step 1: Write failing test verifying markdown outline format, header, session handling, and slide blocks**
- [ ] **Step 2: Run test to verify it fails (RED)**
- [ ] **Step 3: Implement `src/lib/services/markdown-generator.ts` (GREEN)**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 3: PowerPoint (PPTX) Generator Service

**Files:**
- Create: `src/lib/services/pptx-generator.ts`
- Test: `tests/lib/services/pptx-generator.test.ts`

**Interfaces:**
- Produces: `buildPresentationPptx(presentationData: PresentationData, slideImages?: Record<number, string>): Promise<Buffer>`

- [ ] **Step 1: Write failing test verifying PPTX buffer generation, embedded base64 image handling, and fallback placeholder handling**
- [ ] **Step 2: Run test to verify it fails (RED)**
- [ ] **Step 3: Implement `src/lib/services/pptx-generator.ts` (GREEN)**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 4: Download PPTX API Route (`POST /api/download-pptx`)

**Files:**
- Create: `src/app/api/download-pptx/route.ts`
- Test: `tests/api/download-pptx.test.ts`

**Interfaces:**
- Produces: `POST(request: NextRequest): Promise<NextResponse>`

- [ ] **Step 1: Write failing test verifying valid download response (headers and binary buffer) and 400 rejection on invalid schema**
- [ ] **Step 2: Run test to verify it fails (RED)**
- [ ] **Step 3: Implement `src/app/api/download-pptx/route.ts` (GREEN)**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 5: Download Markdown API Route (`POST /api/download-markdown`)

**Files:**
- Create: `src/app/api/download-markdown/route.ts`
- Test: `tests/api/download-markdown.test.ts`

**Interfaces:**
- Produces: `POST(request: NextRequest): Promise<NextResponse>`

- [ ] **Step 1: Write failing test verifying valid download response (headers and markdown text) and 400 rejection on invalid schema**
- [ ] **Step 2: Run test to verify it fails (RED)**
- [ ] **Step 3: Implement `src/app/api/download-markdown/route.ts` (GREEN)**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 6: Full Verification

- [ ] **Step 1: Run `npm test` across all test suites**
- [ ] **Step 2: Run `npm run build` to verify zero TypeScript and ESLint errors**
