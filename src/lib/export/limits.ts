/** Vercel's request body limit; the export routes reject anything larger with 413. */
export const MAX_EXPORT_BODY_BYTES = 4_500_000;

/** The client trims images until the PowerPoint request fits this many characters, well under the server cap. */
export const CLIENT_EXPORT_BUDGET_CHARS = 3.5 * 1024 * 1024;
