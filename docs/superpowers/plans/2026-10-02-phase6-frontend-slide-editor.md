# Phase 6: Frontend UI, Interactive Slide Editor & Fullscreen Slideshow Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete Next.js 14 frontend workspace with document upload/paste, session selection, slide generation, interactive slide editing (bullet management, title edits, slide deletion), single & batch image generation, fullscreen slideshow with keyboard/touch navigation, and native PPTX/Markdown export downloads.

**Architecture:** Client-side App Router page (`src/app/page.tsx`) with modular UI components in `src/components/` (`Header`, `UploadSection`, `SlideCard`, `SlideshowModal`, `Footer`). Clean state transitions communicating with all Phase 1–5 API routes. Component test suite powered by `@testing-library/react` and `jsdom`.

**Tech Stack:** Next.js 14 (App Router), React 18, Tailwind CSS, `lucide-react`, `@testing-library/react`, `jsdom`, `vitest`.

## Global Constraints

- Do NOT touch existing Phase 1–5 backend files (`src/lib/...`, `src/app/api/...`).
- Maintain DepEd Tambayan emerald/mint palette:
  - Emerald primary: `emerald-700` (`#047857`)
  - Accent secondary: `emerald-500` / `teal-500` (`#10B981`)
  - Background: `emerald-50/40` (`#F0FDF4`)
  - Dark text: `slate-800` (`#1E293B`)
- Native browser downloads: Use `Blob` and `URL.createObjectURL` with dynamic anchor click.
- Slideshow navigation: ArrowLeft/ArrowRight, Space, Escape, slide select jump, and mobile horizontal touch swipe (>60px threshold).

---

### Task 1: Dependencies & Testing Setup

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.mts`

- [ ] **Step 1: Install `lucide-react` and test dependencies `@testing-library/react`, `jsdom`**
Run: `npm install lucide-react && npm install -D @testing-library/react jsdom`
- [ ] **Step 2: Configure Vitest for React Testing Library**

---

### Task 2: Header & Footer Components

**Files:**
- Create: `src/components/Header.tsx`
- Create: `src/components/Footer.tsx`

**Interfaces:**
- `Header`: displays DepEd Tambayan branding, link to ILAW, and live server AI status pill (`/api/health`)
- `Footer`: displays creator credits and DepEd Tambayan copyright

- [ ] **Step 1: Implement `src/components/Header.tsx`**
- [ ] **Step 2: Implement `src/components/Footer.tsx`**

---

### Task 3: UploadSection Component

**Files:**
- Create: `src/components/UploadSection.tsx`
- Test: `tests/components/UploadSection.test.tsx`

**Interfaces:**
- Props:
  - `extractedText: string`, `fileName: string`
  - `onUploadSuccess: (text: string, fileName: string) => void`
  - `selectedSession: string`, `onSessionChange: (session: string) => void`
  - `onGenerate: (text: string, session: string) => void`
  - `isLoading: boolean`, `loadingStage: string`

- [ ] **Step 1: Write failing test for session selection, manual text mode, and generate button enablement**
- [ ] **Step 2: Run test to verify it fails (RED)**
- [ ] **Step 3: Implement `src/components/UploadSection.tsx` (GREEN)**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 4: SlideCard Component

**Files:**
- Create: `src/components/SlideCard.tsx`
- Test: `tests/components/SlideCard.test.tsx`

**Interfaces:**
- Props:
  - `slide: SlideData`, `index: number`, `totalSlides: number`
  - `isEditing: boolean`
  - `slideImage?: string`, `isGeneratingImage?: boolean`
  - `onUpdateTitle: (index: number, title: string) => void`
  - `onUpdateBullet: (slideIndex: number, bulletIndex: number, text: string) => void`
  - `onAddBullet: (slideIndex: number) => void`
  - `onDeleteBullet: (slideIndex: number, bulletIndex: number) => void`
  - `onDeleteSlide: (index: number) => void`
  - `onRegenerateImage: (index: number, visualDescription: string) => void`

- [ ] **Step 1: Write failing test for view mode vs edit mode, bullet operations, and image regenerate triggers**
- [ ] **Step 2: Run test to verify it fails (RED)**
- [ ] **Step 3: Implement `src/components/SlideCard.tsx` (GREEN)**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 5: SlideshowModal Component

**Files:**
- Create: `src/components/SlideshowModal.tsx`
- Test: `tests/components/SlideshowModal.test.tsx`

**Interfaces:**
- Props:
  - `isOpen: boolean`, `onClose: () => void`
  - `presentationData: PresentationData`, `session: string`
  - `slideImages: Record<number, string>`
  - `initialIndex?: number`

- [ ] **Step 1: Write failing test for modal navigation (Next, Prev, select jump, Escape key, touch events)**
- [ ] **Step 2: Run test to verify it fails (RED)**
- [ ] **Step 3: Implement `src/components/SlideshowModal.tsx` (GREEN)**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 6: Main Workspace Page (`src/app/page.tsx`)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement full state orchestration and API connections:**
  - File upload (`/api/upload`)
  - Slide generation (`/api/generate`)
  - Sequential batch image generation (`/api/generate-images`)
  - Single image regeneration (`/api/generate-image`)
  - PPTX download (`/api/download-pptx`)
  - Markdown download (`/api/download-markdown`)
  - Slide editor management (title, bullet points, add/remove slides, re-numbering)
  - Fullscreen preview modal integration
  - Reset / Regenerate flow

---

### Task 7: Full Verification

- [ ] **Step 1: Run `npm test` across all test suites**
- [ ] **Step 2: Run `npm run build` to verify zero errors and clean page compilation**
