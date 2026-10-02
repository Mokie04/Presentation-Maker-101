# Phase 2 & 3: Document Processing & Slide/Image Generation API Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the document parsing service (`.docx`, `.pdf`, `.txt`, `.md`), the DepEd subject detection utility, the multipart file upload route, the presentation generation route, and single/batch image generation routes with sequential delays and fault tolerance.

**Architecture:** Next.js 14 App Router API routes (`src/app/api/.../route.ts`). Document parsing abstraction in `src/lib/parsers/document-parser.ts` using `mammoth` and `pdf-parse`. Deterministic keyword-based subject classification in `src/lib/utils/subject-detector.ts`. Integration with Phase 1 AI provider services (`generateSlideContent`, `generateSlideImage`).

**Tech Stack:** Next.js 14, TypeScript, `mammoth`, `pdf-parse`, `vitest` for TDD.

## Global Constraints

- Do NOT touch existing files from Phase 1 unless strictly necessary.
- Document formats supported: `.docx`, `.pdf`, `.txt`, `.md`.
- Subject categories: "Science", "Mathematics", "English/Reading", "Social Studies/History", fallback "General Study".
- Allowed sessions: "Session 1", "Session 2", "Session 3", "Session 4", "Session 5".
- Batch image generation must be sequential with 800ms delays between calls, filtering for slides where part contains "motivation", "presentation", or "discussion".
- Unit tests with mocks only — no real external API calls in tests.

---

### Task 1: Install Document Parsing Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install mammoth, pdf-parse, and @types/pdf-parse**
Run: `npm install mammoth pdf-parse && npm install -D @types/pdf-parse`
- [ ] **Step 2: Verify package.json and types resolution**

---

### Task 2: Subject Detector Utility

**Files:**
- Create: `src/lib/utils/subject-detector.ts`
- Test: `tests/lib/utils/subject-detector.test.ts`

**Interfaces:**
- Produces: `detectSubject(text: string): string`

- [ ] **Step 1: Write failing test covering all 4 subject categories, keyword variations, case insensitivity, and default fallback**
- [ ] **Step 2: Run test to verify it fails (RED)**
- [ ] **Step 3: Implement `src/lib/utils/subject-detector.ts` (GREEN)**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 3: Document Parser Service

**Files:**
- Create: `src/lib/parsers/document-parser.ts`
- Test: `tests/lib/parsers/document-parser.test.ts`

**Interfaces:**
- Produces: `parseDocument(buffer: Buffer, fileName: string): Promise<string>`

- [ ] **Step 1: Write failing test covering `.docx`, `.pdf`, `.txt`, `.md`, empty buffer, empty text, and unsupported extensions**
- [ ] **Step 2: Run test to verify it fails (RED)**
- [ ] **Step 3: Implement `src/lib/parsers/document-parser.ts` (GREEN)**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 4: File Upload API Route (`POST /api/upload`)

**Files:**
- Create: `src/app/api/upload/route.ts`
- Test: `tests/api/upload.test.ts`

**Interfaces:**
- Produces: `POST(request: NextRequest): Promise<NextResponse>` returning `{ text, fileName, fileType, characterCount }` or 400/500 error.

- [ ] **Step 1: Write failing test covering valid upload, missing file, unsupported extension, and file exceeding `MAX_FILE_SIZE_MB`**
- [ ] **Step 2: Run test to verify it fails (RED)**
- [ ] **Step 3: Implement `src/app/api/upload/route.ts` (GREEN)**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 5: Slide Generation API Route (`POST /api/generate`)

**Files:**
- Create: `src/app/api/generate/route.ts`
- Test: `tests/api/generate.test.ts`

**Interfaces:**
- Produces: `POST(request: NextRequest): Promise<NextResponse>` returning `PresentationData` or error.

- [ ] **Step 1: Write failing test covering valid generation, missing text, invalid session, and auto-detecting subject when omitted**
- [ ] **Step 2: Run test to verify it fails (RED)**
- [ ] **Step 3: Implement `src/app/api/generate/route.ts` (GREEN)**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 6: Image Generation API Routes (`POST /api/generate-image` & `POST /api/generate-images`)

**Files:**
- Create: `src/app/api/generate-image/route.ts`
- Create: `src/app/api/generate-images/route.ts`
- Test: `tests/api/generate-image.test.ts`
- Test: `tests/api/generate-images.test.ts`

**Interfaces:**
- `POST /api/generate-image`: takes `{ prompt, slideIndex }`, returns `{ base64, slideIndex }`
- `POST /api/generate-images`: takes `{ slides: Array<{ visualDescription, slideIndex, part }> }`, filters parts, processes sequentially with 800ms delays, fault tolerant with `"failed"` status per slide.

- [ ] **Step 1: Write failing tests for single image route and batch sequential image route**
- [ ] **Step 2: Run tests to verify they fail (RED)**
- [ ] **Step 3: Implement both image generation routes (GREEN)**
- [ ] **Step 4: Run tests to verify they pass**

---

### Task 7: Full Verification

- [ ] **Step 1: Run `npm test` across all test suites**
- [ ] **Step 2: Run `npm run build` with zero TypeScript and ESLint errors**
