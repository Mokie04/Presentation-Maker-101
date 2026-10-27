/** Adapt existing multi-picture fixtures to the individual automatic-image response contract. */
export async function automaticImageResponse(response: Response | Promise<Response>, init?: RequestInit): Promise<Response> {
  const resolved = await response;
  if (!resolved.ok) return resolved.clone();
  const { slideIndex } = JSON.parse(String(init?.body)) as { slideIndex: number };
  const { images } = await resolved.clone().json() as { images: Record<number, string> };
  return Response.json({ base64: images[slideIndex], slideIndex });
}
