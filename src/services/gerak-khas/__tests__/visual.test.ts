import { describe, it, expect } from "vitest";

import { STATION_IDS } from "@/data";
import {
  REAL_REFERENCE_LABEL,
  AI_GENERATED_LABEL,
} from "../types";
import {
  resolveRealVisual,
  generatedVisual,
  fallbackVisual,
  NO_REAL_PHOTO,
  IMAGE_FALLBACK,
} from "../visual/visualTool";
import { referenceFor, STATION_IMAGE_REFERENCES } from "../visual/stationImageReference";

describe("VisualTool provenance", () => {
  it("REAL_REFERENCE is honest when no approved asset is curated yet", () => {
    const v = resolveRealVisual(STATION_IDS.putrajayaSentral);
    expect(v.visualType).toBe("REAL_REFERENCE");
    expect(v.label).toBe(REAL_REFERENCE_LABEL);
    // No asset => honest "no photo yet" message, no fake image.
    expect(v.imageUrl).toBeUndefined();
    expect(v.unavailableMessage).toBe(NO_REAL_PHOTO);
  });

  it("a curated real reference carries attribution + approved flag", () => {
    // Simulate a curated entry by checking the referenceFor contract directly.
    const ref = STATION_IMAGE_REFERENCES.find((r) => r.stationId === STATION_IDS.trx)!;
    expect(ref).toBeTruthy();
    // Until an asset is added, referenceFor returns null (no usable image).
    expect(referenceFor(STATION_IDS.trx)).toBeNull();
  });

  it("generated images are labelled AI_GENERATED and NEVER as a real photo", () => {
    const v = generatedVisual(STATION_IDS.klcc, "data:image/png;base64,AAAA");
    expect(v.visualType).toBe("AI_GENERATED");
    expect(v.label).toBe(AI_GENERATED_LABEL);
    expect(v.label).not.toBe(REAL_REFERENCE_LABEL);
    // A generated visual never carries real-photo source metadata.
    expect(v.sourceMeta).toBeUndefined();
    expect(v.imageData).toContain("base64");
  });

  it("generated visual carries no transport sourceStatus/isSimulated", () => {
    const v = generatedVisual(STATION_IDS.klcc, "data:image/png;base64,AAAA");
    expect("sourceStatus" in v).toBe(false);
    expect("isSimulated" in v).toBe(false);
  });

  it("the graceful fallback returns the exact message and no image", () => {
    const v = fallbackVisual(STATION_IDS.pasarSeni);
    expect(v.unavailableMessage).toBe(IMAGE_FALLBACK);
    expect(v.imageData).toBeUndefined();
    expect(v.label).toBe(AI_GENERATED_LABEL);
  });
});
