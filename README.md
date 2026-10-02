# Presentation Maker 101

> **Empowering Philippine DepEd Teachers with Automated, Pedagogically-Aligned PowerPoint Presentations.**
> Built with Next.js 14 App Router, TypeScript, Tailwind CSS, and Server-Side Dual AI Providers.

---

## 1. Project Overview & Architecture

**Presentation Maker 101** is a high-performance Next.js 14 web application designed specifically for Philippine Department of Education (DepEd) educators. It transforms Daily Lesson Logs (DLL) and lesson plan documents into comprehensive, classroom-ready PowerPoint (`.pptx`) presentations and Markdown (`.md`) curriculum outlines in seconds.

### Architectural Evolution: v1 vs. Presentation Maker 101

| Dimension | DepEd Tambayan v1 (Legacy) | Presentation Maker 101 (Current) |
| :--- | :--- | :--- |
| **Execution Model** | Client-side single-file HTML / JS | Next.js 14 App Router (Server-side architecture) |
| **API Key Security** | Teachers pasted raw API keys stored in `localStorage` | **100% Server-side credential isolation** — zero user keys required |
| **AI Provider Model** | Single hardcoded provider endpoint | **Dual OpenAI-compatible provider abstraction** (Text & Image) |
| **Document Ingestion** | Manual copy-pasting required | Multi-format parser (`.docx`, `.pdf`, `.txt`, `.md`) + paste toggle |
| **Slide Volume & Depth** | 8–12 summarized slides | **25+ exhaustive sequential slides** covering all annexes and questions |
| **PowerPoint Engine** | Client-side DOM export | Server-side binary compilation with `pptxgenjs` & embedded graphics |
| **Reliability & Retries** | Browser fetch failures aborted flow | Automatic exponential backoff (5 retries for text, 3 for image) |

### Dual Provider Routing Architecture

To give schools, institutions, and developers ultimate freedom and cost optimization, Presentation Maker 101 abstracts AI synthesis into two isolated, swappable server-side provider pipelines:

```
                            ┌──────────────────────────────────────────────┐
                            │               Teacher Browser                │
                            └──────────────────────┬───────────────────────┘
                                                   │
                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Next.js 14 Serverless Backend                                    │
│                                                                                                  │
│  ┌─────────────────────────┐               ┌──────────────────────────────────────────────────┐  │
│  │     Text AI Provider    │               │                Image AI Provider                 │  │
│  │ (/v1/chat/completions)  │               │             (/v1/images/generations)             │  │
│  └────────────┬────────────┘               └────────────────────────┬─────────────────────────┘  │
└───────────────┼─────────────────────────────────────────────────────┼────────────────────────────┘
                │                                                     │
                ▼                                                     ▼
┌───────────────────────────────┐                     ┌───────────────────────────────┐
│     Text Provider Engine      │                     │     Image Provider Engine     │
│  - OpenAI (gpt-4o)            │                     │  - OpenAI (dall-e-3)          │
│  - Groq (llama-3.3-70b)       │                     │  - Together AI (FLUX / SDXL)  │
│  - DeepSeek / OpenRouter      │                     │  - OpenRouter Image Models    │
│  - Local Ollama Engine        │                     │  - Local Stable Diffusion     │
└───────────────────────────────┘                     └───────────────────────────────┘
```

1. **Text AI Provider (`/v1/chat/completions`)**:
   - Analyzes curriculum content against strict instructional design directives.
   - Enforces structured JSON output matching `PresentationData`.
   - Automatic 5-retry exponential backoff (`1s, 2s, 4s, 8s, 16s`).
2. **Image AI Provider (`/v1/images/generations`)**:
   - Generates educational cartoon vector illustrations set in Philippine elementary classrooms.
   - Outputs 16:9 widescreen visuals (`1024x576`) encoded directly into base64.
   - Automatic 3-retry backoff (`2s`).

---

## 2. Getting Started & Local Development

### Prerequisites

- **Node.js**: v18.17.0+ (Tested on Node v20, v22, and v26)
- **npm**: v9+ (or pnpm / yarn / bun)

### Installation

1. Clone or download the repository:
   ```bash
   git clone https://github.com/your-username/presentation-maker-101.git
   cd presentation-maker-101
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```

### Environment Configuration Guide (`.env.local`)

All environment variables are validated at startup using Zod in `src/lib/env.ts`.

```env
# ==========================================
# Text AI Provider (/v1/chat/completions)
# ==========================================
TEXT_PROVIDER_BASE_URL=https://api.openai.com/v1
TEXT_PROVIDER_API_KEY=sk-your-text-provider-api-key
TEXT_PROVIDER_MODEL=gpt-4o

# ==========================================
# Image AI Provider (/v1/images/generations)
# ==========================================
IMAGE_PROVIDER_BASE_URL=https://api.openai.com/v1
IMAGE_PROVIDER_API_KEY=sk-your-image-provider-api-key
IMAGE_PROVIDER_MODEL=dall-e-3

# ==========================================
# Application Configuration
# ==========================================
MAX_FILE_SIZE_MB=10
```

#### Multi-Provider Setup Examples

<details>
<summary><b>1. OpenAI + OpenAI (Default Setup)</b></summary>

```env
TEXT_PROVIDER_BASE_URL=https://api.openai.com/v1
TEXT_PROVIDER_API_KEY=sk-proj-xxxx
TEXT_PROVIDER_MODEL=gpt-4o

IMAGE_PROVIDER_BASE_URL=https://api.openai.com/v1
IMAGE_PROVIDER_API_KEY=sk-proj-xxxx
IMAGE_PROVIDER_MODEL=dall-e-3
```
</details>

<details>
<summary><b>2. Groq (Ultra-Fast Text) + Together AI (Affordable FLUX Images)</b></summary>

```env
# Groq for lightning-fast slide outline generation
TEXT_PROVIDER_BASE_URL=https://api.groq.com/openai/v1
TEXT_PROVIDER_API_KEY=gsk_xxxx
TEXT_PROVIDER_MODEL=llama-3.3-70b-versatile

# Together AI for high-quality educational illustrations
IMAGE_PROVIDER_BASE_URL=https://api.together.xyz/v1
IMAGE_PROVIDER_API_KEY=xxxx
IMAGE_PROVIDER_MODEL=black-forest-labs/FLUX.1-schnell
```
</details>

<details>
<summary><b>3. OpenRouter (Unified Gateway)</b></summary>

```env
TEXT_PROVIDER_BASE_URL=https://openrouter.ai/api/v1
TEXT_PROVIDER_API_KEY=sk-or-v1-xxxx
TEXT_PROVIDER_MODEL=anthropic/claude-3.5-sonnet

IMAGE_PROVIDER_BASE_URL=https://openrouter.ai/api/v1
IMAGE_PROVIDER_API_KEY=sk-or-v1-xxxx
IMAGE_PROVIDER_MODEL=openai/dall-e-3
```
</details>

<details>
<summary><b>4. Ollama (100% Free & Local Offline Execution)</b></summary>

```env
TEXT_PROVIDER_BASE_URL=http://localhost:11434/v1
TEXT_PROVIDER_API_KEY=ollama
TEXT_PROVIDER_MODEL=llama3.1:8b

IMAGE_PROVIDER_BASE_URL=https://api.openai.com/v1
IMAGE_PROVIDER_API_KEY=sk-xxxx
IMAGE_PROVIDER_MODEL=dall-e-3
```
</details>

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

- **Run Production Build Verification**:
  ```bash
  npm run build
  ```

- **Verify AI Providers Health**:
  ```bash
  curl http://localhost:3000/api/health
  ```

---

## 3. Core Feature Walkthrough

### 1. Multi-Format Document Ingestion
- Upload `.docx` (Microsoft Word via `mammoth`), `.pdf` (via `pdf-parse`), `.txt`, or `.md` files up to `MAX_FILE_SIZE_MB`.
- Instant "Paste Lesson Plan Text" toggle for educators who prefer pasting raw text.
- Live character counter and upload status feedback.

### 2. DepEd 6-Part Instructional Structure
Presentations map directly to the Philippine Department of Education 4A's and 5E's curriculum flow across 6 distinct slide parts:
1. **Review**: Activates prior knowledge and checks prerequisite competencies.
2. **Motivation**: Real-world hook or game engaging learners.
3. **Lesson Presentation**: Clear step-by-step introduction of new learning competencies.
4. **Discussion**: Deep pedagogical explanation without summarizing or truncating story annexes.
5. **Activities**: Complete group activity instructions, rubrics, and guide questions.
6. **Assessment**: Individual slide per multiple-choice or identification question for formative assessment.
- **Deep Coverage Guarantee**: Expands comprehensive lessons across 25+ slides.

### 3. Subject-Specific Prompt Directives
Automatic keyword classifier identifies curriculum subjects and instructs the AI to inject specialized prompts:
- **Science**: Process illustrations, cross-sections, and anatomical diagrams.
- **Mathematics**: Visual manipulatives (blocks, fraction pies) and large numerical headers.
- **English / Reading**: Contextual story scenes and high-contrast vocabulary keywords.
- **Social Studies / History**: Character profiles and illustrated Philippine maps.

### 4. Background Sequential Visual Synthesis
- Following slide generation, background batch synthesis generates illustrations for `motivation`, `presentation`, and `discussion` slides.
- Sequenced with an `800ms` inter-request delay to respect external API rate limits.
- Fault-tolerant: If any single image fails, it is marked `"failed"` while the rest of the presentation continues unhindered.
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
  - Formatted with DepEd Tambayan color palette (Emerald `#047857`, Accent `#10B981`, Background `#F0FDF4`).
  - Embeds base64 illustrations or renders rounded mint placeholder boxes.
- **Curriculum Markdown Outline (`POST /api/download-markdown`)**:
  - Clean formatted Markdown outline ready for lesson archiving or syllabus planning.

---

## 4. Vercel Deployment Guide

### Deploying via Vercel Dashboard (GitHub / GitLab / Bitbucket)

1. Push your repository to GitHub:
   ```bash
   git push origin main
   ```
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Select your `presentation-maker-101` repository.
4. Leave framework preset as **Next.js** (root directory `./`).
5. Open the **"Environment Variables"** section and add the keys from your `.env.local`:
   - `TEXT_PROVIDER_BASE_URL`
   - `TEXT_PROVIDER_API_KEY`
   - `TEXT_PROVIDER_MODEL`
   - `IMAGE_PROVIDER_BASE_URL`
   - `IMAGE_PROVIDER_API_KEY`
   - `IMAGE_PROVIDER_MODEL`
   - `MAX_FILE_SIZE_MB` (e.g. `10`)
6. Click **Deploy**.

### Deploying via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```
Set environment variables:
```bash
vercel env add TEXT_PROVIDER_BASE_URL
vercel env add TEXT_PROVIDER_API_KEY
vercel env add TEXT_PROVIDER_MODEL
vercel env add IMAGE_PROVIDER_BASE_URL
vercel env add IMAGE_PROVIDER_API_KEY
vercel env add IMAGE_PROVIDER_MODEL
vercel env add MAX_FILE_SIZE_MB
vercel --prod
```

### Notes on Serverless Function Timeouts (`maxDuration`)

LLM generation for 25+ detailed slides and batch image generation can take between 15 and 45 seconds depending on model latency. To prevent Vercel's default 10s (Hobby) or 15s (Pro) timeouts from terminating in-flight generations, the following routes are configured with explicit `maxDuration` segment settings:

- `POST /api/generate` ➔ `maxDuration = 60`
- `POST /api/generate-image` ➔ `maxDuration = 60`
- `POST /api/generate-images` ➔ `maxDuration = 60`
- `POST /api/download-pptx` ➔ `maxDuration = 30`

*(Note: Vercel Hobby accounts support up to 60 seconds; Pro accounts support up to 300 seconds).*

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

### Test Suite (100% Passing)

The project adheres to strict Test-Driven Development (Red-Green-Refactor) with comprehensive unit and component test suites:

```
 RUN  v5.0.3 /Users/johnnavarro/Sayuna Projects/Presentation Maker 101

 ✓ tests/lib/services/pptx-generator.test.ts (4 tests)
 ✓ tests/lib/providers/text-provider.test.ts (6 tests)
 ✓ tests/api/upload.test.ts (4 tests)
 ✓ tests/lib/env.test.ts (3 tests)
 ✓ tests/lib/providers/image-provider.test.ts (3 tests)
 ✓ tests/api/generate-images.test.ts (3 tests)
 ✓ tests/api/download-markdown.test.ts (3 tests)
 ✓ tests/api/generate.test.ts (5 tests)
 ✓ tests/api/health.test.ts (3 tests)
 ✓ tests/api/download-pptx.test.ts (3 tests)
 ✓ tests/components/SlideshowModal.test.tsx (4 tests)
 ✓ tests/components/SlideCard.test.tsx (3 tests)
 ✓ tests/components/UploadSection.test.tsx (3 tests)
 ✓ tests/lib/parsers/document-parser.test.ts (7 tests)
 ✓ tests/lib/utils/subject-detector.test.ts (5 tests)
 ✓ tests/lib/services/markdown-generator.test.ts (2 tests)
 ✓ tests/api/generate-image.test.ts (3 tests)
 ✓ tests/prompts/slide-generation.test.ts (3 tests)

 Test Files  18 passed (18)
      Tests  67 passed (67)
```

---

## 6. Credits & License

- **Developer**: Richard R. Raqueño
- **Branding & Community**: DepEd Tambayan
- **Companion Tool**: [ILAW Lesson Plan Generator](https://www.depedtambayanph.net/2026/06/ilaw-lesson-plan-generator.html)
- **License**: MIT
