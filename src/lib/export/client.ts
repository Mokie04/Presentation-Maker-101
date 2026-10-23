/** Saves a blob through a temporary link, then releases the object URL. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/** The export routes' `error` field, else the first 150 characters of a non-JSON body, else the fallback. */
export async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const errText = await res.text().catch(() => '');
  try {
    return JSON.parse(errText).error || fallback;
  } catch {
    return errText ? errText.slice(0, 150) : fallback;
  }
}
