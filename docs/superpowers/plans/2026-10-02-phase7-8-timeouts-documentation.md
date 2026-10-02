# Phase 7 & 8: Serverless Timeouts, Production Configuration & Comprehensive Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure Vercel serverless function `maxDuration` timeouts on AI/compilation routes, verify Next.js production configuration, compose an exhaustive project `README.md`, and verify zero-error build and test status.

**Architecture:** Next.js 14 App Router route segment configs (`export const maxDuration = 60 | 30`). Clean, standards-compliant `next.config.mjs`. Production documentation targeting Philippine DepEd educators and software engineers deploying on Vercel.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Vercel Serverless Functions, Vitest.

## Global Constraints

- Routes with `maxDuration`:
  - `src/app/api/generate/route.ts` -> `60`
  - `src/app/api/generate-image/route.ts` -> `60`
  - `src/app/api/generate-images/route.ts` -> `60`
  - `src/app/api/download-pptx/route.ts` -> `30`
- `README.md` must thoroughly detail:
  1. Architecture & Dual Provider Routing
  2. Setup & Environment Variables (OpenAI, Groq, Together AI, OpenRouter, Ollama)
  3. Feature Walkthrough
  4. Vercel Deployment Instructions
  5. Test suite summary (67 tests)

---

### Task 1: Route Segment Timeout Configuration

**Files:**
- Modify: `src/app/api/generate/route.ts`
- Modify: `src/app/api/generate-image/route.ts`
- Modify: `src/app/api/generate-images/route.ts`
- Modify: `src/app/api/download-pptx/route.ts`

- [ ] **Step 1: Add `export const maxDuration = 60;` to `src/app/api/generate/route.ts`**
- [ ] **Step 2: Add `export const maxDuration = 60;` to `src/app/api/generate-image/route.ts`**
- [ ] **Step 3: Add `export const maxDuration = 60;` to `src/app/api/generate-images/route.ts`**
- [ ] **Step 4: Add `export const maxDuration = 30;` to `src/app/api/download-pptx/route.ts`**

---

### Task 2: Next.js Configuration Verification

**Files:**
- Inspect/Modify: `next.config.mjs`

- [ ] **Step 1: Verify `next.config.mjs` has no deprecated/experimental flags that conflict with Vercel deployment**

---

### Task 3: Comprehensive Project Documentation (`README.md`)

**Files:**
- Overwrite: `README.md`

- [ ] **Step 1: Write production-grade `README.md` with complete architecture comparison, dual AI provider guide with multi-provider examples, local setup, feature walkthrough, Vercel deployment instructions, and test metrics**

---

### Task 4: Full Verification and Final Commit

- [ ] **Step 1: Run `npm test` across all 18 test suites (67 tests)**
- [ ] **Step 2: Run `npm run build` to verify route segment compilation and static page generation**
- [ ] **Step 3: Commit all changes to git**
