import "server-only";

/**
 * BedrockImageProvider (OPTIONAL) — a server-only ImageProvider backed by
 * Amazon Bedrock image generation. It is used ONLY when configured
 * (`BEDROCK_IMAGE_MODEL_ID` present); otherwise `isImageProviderConfigured()`
 * is false and the visual route serves only real references / the graceful
 * fallback. Credentials are read from UNPREFIXED env (never NEXT_PUBLIC_).
 *
 * The SDK call is wrapped so any failure/timeout throws — the route catches it
 * and returns the graceful fallback, so image generation never blocks the app.
 */
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

import type {
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageProvider,
} from "./ImageProvider";

function resolveConfig(): { region: string; modelId: string } | null {
  const modelId = process.env.BEDROCK_IMAGE_MODEL_ID;
  const region = process.env.BEDROCK_REGION ?? process.env.AWS_REGION;
  if (!modelId || !region) return null;
  return { region, modelId };
}

export function isImageProviderConfigured(): boolean {
  return resolveConfig() !== null;
}

export class BedrockImageProvider implements ImageProvider {
  async generateIllustration(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const config = resolveConfig();
    if (!config) throw new Error("Bedrock image model is not configured.");
    const client = new BedrockRuntimeClient({ region: config.region });
    // Titan Image Generator style payload; adjust per configured model.
    const body = JSON.stringify({
      taskType: "TEXT_IMAGE",
      textToImageParams: { text: req.prompt },
      imageGenerationConfig: { numberOfImages: 1, height: 512, width: 512, cfgScale: 7 },
    });
    const out = await client.send(
      new InvokeModelCommand({
        modelId: config.modelId,
        contentType: "application/json",
        accept: "application/json",
        body,
      }),
    );
    const decoded = JSON.parse(new TextDecoder().decode(out.body)) as { images?: string[] };
    const b64 = decoded.images?.[0];
    if (!b64) throw new Error("Bedrock image response had no image.");
    return { imageData: `data:image/png;base64,${b64}` };
  }
}
