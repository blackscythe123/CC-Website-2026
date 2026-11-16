export const TOO_LARGE_MESSAGE = "Images are too large to send in one go (max ~4 MB total)";

/** Keep request bodies safely under the ~4.5 MB serverless limit (base64 is sent as-is). */
export const MAX_REQUEST_IMAGE_BYTES = Math.floor(3.5 * 1024 * 1024);

/** Size on the wire of the base64 payload of these images. */
export function imagePayloadBytes(images: { base64: string }[]): number {
  return images.reduce((sum, img) => sum + img.base64.length, 0);
}

export function imagesTooLarge(images: { base64: string }[]): boolean {
  return imagePayloadBytes(images) > MAX_REQUEST_IMAGE_BYTES;
}

/**
 * Reads an API response without assuming JSON: a 413 (or an HTML error page from the platform)
 * becomes a readable `error` instead of a "Unexpected token <" SyntaxError.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readApiJson(res: Response): Promise<{ ok: boolean; status: number; data: Record<string, any> }> {
  if (res.status === 413) return { ok: false, status: 413, data: { error: TOO_LARGE_MESSAGE } };
  const type = res.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      status: res.status,
      data: { error: res.ok ? "The server sent an unexpected response. Please try again." : `The server couldn't handle that request (HTTP ${res.status}).` },
    };
  }
  try {
    const data = await res.json();
    return { ok: res.ok, status: res.status, data: data && typeof data === "object" ? data : {} };
  } catch {
    return { ok: false, status: res.status, data: { error: "The server sent an unreadable response. Please try again." } };
  }
}
