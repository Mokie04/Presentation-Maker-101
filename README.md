# SAYUNA AI PRESENTATION MAKER

> **Empowering Teachers with Automated, Pedagogically-Aligned PowerPoint Presentations.**
> Built with Next.js 14 App Router, TypeScript, Tailwind CSS, and server-side text and image providers.

---

## 1. Project Overview & Architecture

**SAYUNA AI PRESENTATION MAKER** is a Next.js 14 web application designed specifically for educators. It transforms Daily Lesson Logs (DLL) and lesson plan documents into editable presentations, PowerPoint (`.pptx`) files and Markdown (`.md`) curriculum outlines.

For the current request flow, module map and extension recipes, read [ARCHITECTURE.md](ARCHITECTURE.md). The [glossary](GLOSSARY.md), [architecture decisions](docs/adr/README.md) and [documentation index](docs/README.md) provide the supporting detail.

### Current architecture

| Step | Current owner |
| :--- | :--- |
| **Upload or paste** | `src/components/UploadSection.tsx`, `src/app/api/upload/route.ts`, `src/lib/parsers/document-parser.ts` |
| **Generate slides** | `src/app/api/generate/route.ts`, `src/lib/providers/text-provider.ts` |
| **Edit and attach images** | `src/lib/deck/`, `src/lib/providers/image/`, `src/lib/image-library/` |
| **Export** | `src/lib/export/`, `src/lib/services/pptx-generator.ts`, `src/lib/services/markdown-generator.ts` |

### Provider routing

Text generation uses a configurable OpenAI-compatible chat endpoint. Automatic images use an OpenAI-compatible image adapter or Pexels; manual image search and selection use the separate NASA and Wikimedia Commons libraries. Provider credentials stay on the server.

```
Teacher browser → authenticated Next.js routes → text provider → slide deck
                                             ↘ image provider (AI / Pexels)
                                             ↘ image library (NASA / Commons)
Slide deck → export payload → PPTX or Markdown route
```

The text client validates structured `PresentationData` and retries up to five times after the initial attempt. The OpenAI-compatible image adapter retries up to three times after the initial attempt; `auto` falls back to Pexels only when `PEXELS_API_KEY` is configured. Pexels search and the NASA/Commons libraries have separate retrieval paths.

---

## 2. Getting Started & Local Development

### Prerequisites

- **Node.js**: 22.22.2 or newer for the test suite (`.github/workflows/ci.yml` uses Node 22; this checkout was also tested on Node 26).
- **npm**: install from the committed lockfile with `npm ci`.

### Installation

1. Clone or download the repository:
   ```bash
   git clone https://github.com/Mokie04/Presentation-Maker-101.git
   cd Presentation-Maker-101
   ```

2. Install dependencies:
   ```bash
   npm ci
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```

### Environment Configuration Guide (`.env.local`)

`src/lib/env.ts` validates settings lazily per feature, so an upload does not need text or image provider keys. `src/lib/sessionAuth.ts` reads App Store authentication settings separately. Copy `.env.example` and replace sample credentials only for the features you use; automated tests need no provider keys.

```env
# Required when generating slides or checking text-provider health
TEXT_PROVIDER_BASE_URL=https://api.openai.com/v1
TEXT_PROVIDER_API_KEY=sk-your-key
TEXT_PROVIDER_MODEL=gpt-4o

# Used for AI images; choose ai, pexels or auto
IMAGE_SOURCE=auto
IMAGE_PROVIDER_BASE_URL=https://api.openai.com/v1
IMAGE_PROVIDER_API_KEY=sk-your-key
IMAGE_PROVIDER_MODEL=dall-e-3
PEXELS_API_KEY=

# Upload file-size check (MB); see the Vercel request limit below
MAX_FILE_SIZE_MB=10
```

| Setting | Current behavior |
|---|---|
| `TEXT_PROVIDER_BASE_URL`, `TEXT_PROVIDER_API_KEY`, `TEXT_PROVIDER_MODEL` | Required when the text client is used. |
| `IMAGE_SOURCE` | `auto` by default; `ai` uses the OpenAI-compatible adapter, `pexels` uses Pexels, and `auto` tries AI then Pexels only if a Pexels key is present. |
| `IMAGE_PROVIDER_BASE_URL`, `IMAGE_PROVIDER_API_KEY`, `IMAGE_PROVIDER_MODEL` | Image adapter defaults are the OpenAI URL, `not-configured` and `dall-e-3`; a usable key is needed for AI image requests. |
| `PEXELS_API_KEY` | Optional unless using Pexels; also enables fallback in `auto`. |
| `MAX_FILE_SIZE_MB` | Positive number, default 10; the upload route applies this file-size check. |

Vercel Functions have a [4.5 MB request-body limit](https://vercel.com/docs/functions/limitations#request-body-size). That limit can reject an upload before the application's default 10 MB file check runs.

#### App Store SSO Configuration

Presentation Maker Pro is launched from the Sayuna AI App Store with a short-lived signed `access` handoff. The application exchanges that handoff once for the `presentation_maker_pro_session` HttpOnly cookie; when App Store auth is enabled, generation, upload, image, download, and health APIs require that session.

For local development without an App Store launch, set:

```env
APPSTORE_AUTH_ENABLED=false
```

Production is fail-closed. Configure these values in the Vercel project environment; never commit the shared secret:

```env
APPSTORE_AUTH_ENABLED=true
APPSTORE_SHARED_SECRET=<the same secret configured for the Sayuna App Store issuer>
APPSTORE_AUDIENCE=presentation-maker
APPSTORE_ALLOWED_CLOCK_SKEW_SECONDS=20
APPSTORE_MAX_TOKEN_TTL_SECONDS=900
APPSTORE_SESSION_MAX_AGE_SECONDS=3600
APPSTORE_COOKIE_SAMESITE=none
APPSTORE_COOKIE_SECURE=true
# Omit this for the default host-only cookie.
APPSTORE_COOKIE_DOMAIN=
```

The App Store issuer and this application must use the same `APPSTORE_AUDIENCE` value. Numeric settings are bounded by the server, and a production `APPSTORE_AUTH_ENABLED=false` value is not treated as a bypass. `APPSTORE_COOKIE_DOMAIN` is optional; leave it empty unless the deployment requires an explicit cookie domain.

#### Provider setup examples

<details>
<summary><b>1. OpenAI-compatible text and AI images</b></summary>

```env
TEXT_PROVIDER_BASE_URL=https://api.openai.com/v1
TEXT_PROVIDER_API_KEY=sk-proj-xxxx
TEXT_PROVIDER_MODEL=gpt-4o

IMAGE_PROVIDER_BASE_URL=https://api.openai.com/v1
IMAGE_PROVIDER_API_KEY=sk-proj-xxxx
IMAGE_PROVIDER_MODEL=dall-e-3
IMAGE_SOURCE=ai
```
</details>

<details>
<summary><b>2. OpenAI-compatible text with Pexels images</b></summary>

```env
TEXT_PROVIDER_BASE_URL=https://api.openai.com/v1
TEXT_PROVIDER_API_KEY=sk-proj-xxxx
TEXT_PROVIDER_MODEL=gpt-4o
IMAGE_SOURCE=pexels
PEXELS_API_KEY=your-pexels-key
```
</details>

Other OpenAI-compatible endpoints can be configured, but their model and image-request compatibility must be verified separately. The AI image adapter currently sends a fixed `1024x576` size, `standard` quality and `b64_json` response format.

### Running Development Server & Tests

- **Start Dev Server**:
  ```bash
  npm run dev
  ```
  Visit [http://localhost:3000](http://localhost:3000) in your browser.

- **Run Automated Test Suite**:
  ```bash
  npm test
  ```
  The tests use local fixtures and mocks; no provider environment variables are needed.

- **Typecheck and lint source plus tests**:
  ```bash
  npx tsc --noEmit
  npm run lint
  ```
  `.github/workflows/ci.yml` runs these and `npm test` in its `verify` job for PRs and pushes to `main`.

- **Run Production Build Verification**:
  ```bash
  npm run build
  ```

- **Check provider health**: `/api/health` requires an auth session when App Store auth is enabled; its text check calls the configured text endpoint. Use it only when you intend a live provider check.

---

## 3. Core Feature Walkthrough

### 1. Multi-Format Document Ingestion
- Upload `.docx` (Microsoft Word via `mammoth`), `.pdf` (via `pdf-parse`), `.txt`, or `.md` files, subject to the configured file-size check and the hosting request-body limit.
- Instant "Paste Lesson Plan Text" toggle for educators who prefer pasting raw text.
- Live character counter and upload status feedback.

### 2. DepEd 6-Part Instructional Structure
The generation prompt asks for six lesson parts, following a Title Page:
1. **Review**: Activates prior knowledge and checks prerequisite competencies.
2. **Motivation**: Real-world hook or game engaging learners.
3. **Lesson Presentation**: Clear step-by-step introduction of new learning competencies.
4. **Discussion**: Deep pedagogical explanation without summarizing or truncating story annexes.
5. **Activities**: Complete group activity instructions, rubrics, and guide questions.
6. **Assessment**: Individual slide per multiple-choice or identification question for formative assessment.
- **Deep Coverage Prompt**: Requests at least 25 slides and full lesson coverage; the response schema checks structure, not slide count or pedagogical quality.

### 3. Subject-Specific Prompt Directives
The teacher can select a subject; otherwise a keyword classifier supplies one. The generation prompt asks the text provider for subject-specific visual descriptions:
- **Science**: Process illustrations, cross-sections, and anatomical diagrams.
- **Mathematics**: Visual manipulatives (blocks, fraction pies) and large numerical headers.
- **English / Reading**: Contextual story scenes and high-contrast vocabulary keywords.
- **Social Studies / History**: Character profiles and illustrated Philippine maps.

### 4. Background Sequential Visual Synthesis
- Following slide generation, background batch synthesis requests images for Motivation, Lesson Presentation and Discussion slides.
- Sequenced with an `800ms` inter-request delay to respect external API rate limits.
- Fault-tolerant: If an image request fails, the batch emits the `"failed"` wire value and continues; the deck preserves an existing image when appropriate.
- Individual "Render Visual Concept Image" / "Regenerate AI Graphic" buttons on each slide card.

### 5. Interactive Slide Editor
- Toggle between **Slides View** and **Edit Slides**.
- Inline editing of slide titles and multi-line bullet points.
- Delete individual bullets or click `+ Add Bullet Point`.
- Delete entire slides (which automatically re-numbers remaining slides).
- Add new slides with customized parts.

### 6. Fullscreen Slideshow Modal
- Clean 16:9 viewport with responsive typography (titles up to 5xl, bullets up to 2xl).
- Keyboard shortcuts: `ArrowRight` / `Space` (Next), `ArrowLeft` (Previous), `Escape` (Exit).
- Jump-to-Slide dropdown menu.
- Mobile touch swipe navigation (tracks horizontal delta `> 60px`).

### 7. Server-Side PowerPoint (.pptx) & Markdown (.md) Exports
- **PowerPoint Export (`POST /api/download-pptx`)**:
  - Compiled server-side with `pptxgenjs` in 16:9 widescreen format.
  - Uses sky/cyan colours (`#0284C7`, `#06B6D4`) and a pale blue background (`#F0F9FF`).
  - Embeds base64 illustrations or renders rounded pale-blue placeholder boxes.
- **Curriculum Markdown Outline (`POST /api/download-markdown`)**:
  - Clean formatted Markdown outline ready for lesson archiving or syllabus planning.

---

## 4. Vercel Deployment Guide

Use a change branch and PR for the connected Vercel project. Configure the feature keys you need from `.env.example` in the Vercel project, plus production App Store settings: `APPSTORE_AUTH_ENABLED=true`, the matching `APPSTORE_SHARED_SECRET` and `APPSTORE_AUDIENCE`, and any required clock, lifetime or cookie overrides. Production rejects disabled App Store auth; the default cookie is host-only when `APPSTORE_COOKIE_DOMAIN` is omitted.

Wait for the `verify` CI job and the Vercel preview. Smoke-test the preview through the App Store handoff: upload or paste, generate, obtain an image, edit, and download both formats. Merge only after approval. Local tests, a build or an unauthenticated health request do not prove this browser flow. Making `verify` a required GitHub branch-protection check is still a separate user action in `docs/architecture-roadmap.md`.

### Notes on Serverless Function Timeouts (`maxDuration`)

The route files currently set these `maxDuration` values; actual execution still depends on deployment settings and provider latency:

- `POST /api/generate` ➔ `maxDuration = 300`
- `POST /api/generate-image` ➔ `maxDuration = 120`
- `POST /api/generate-images` ➔ `maxDuration = 300`
- `POST /api/download-pptx` ➔ `maxDuration = 120`


---

## 5. Tech Stack & Test Suite

### Technologies

- **Framework**: Next.js 14.2 (App Router, Server-side API Routes)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS
- **AI SDK**: Official `openai` SDK (Dual isolated instances)
- **Document Parsers**: `mammoth` (DOCX), `pdf-parse` (PDF)
- **Presentation Compiler**: `pptxgenjs` (Node.js Buffer export)
- **Icons**: `lucide-react`
- **Validation**: `zod`
- **Testing**: `vitest`, `@testing-library/react`, `jsdom`, `@vitejs/plugin-react`

### Test Suite

Run `npm test` for the current count. Tests cover route policy, configuration boundaries, deck image races, libraries, providers, exports and React components; `npm run lint` checks both `src/` and `tests/`. The CI `verify` job runs typecheck, lint and tests without provider credentials.

---

## 6. Credits & License

- **Developer**: JOHN M. NAVARRO
- **Product**: SAYUNA AI PRESENTATION MAKER
- **License**: MIT
