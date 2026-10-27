import "server-only";

/**
 * ImageProvider (NEW) — the swappable server-side image-generation boundary for
 * Gerak Khas (Requirement 27, 28). The UI never talks to a provider directly;
 * it calls `POST /api/gerak-khas/visual`, which uses whatever provider is
 * configured. Implementations keep all credentials server-side.
 */

export interface ImageGenerationRequest {
  stationId: string;
  stationName: string;
  /** A safe, bounded prompt the route builds from structured station facts. */
  prompt: string;
}

export interface ImageGenerationResult {
  /** base64 / data URL of the generated image. */
  imageData: string;
}

export interface ImageProvider {
  /** Generate an illustration. Must reject/throw on failure or timeout. */
  generateIllustration(req: ImageGenerationRequest): Promise<ImageGenerationResult>;
}
