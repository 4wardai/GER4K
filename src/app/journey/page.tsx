import { Suspense } from "react";

import Screen from "@/components/layout/Screen";
import JourneyScreen from "@/components/journey/JourneyScreen";

/*
 * Journey results (Requirements 21, 22). The same screen plans normally and
 * transitions in place into recovery mode when the Demo_Scenario affects the
 * journey. Suspense is required because JourneyScreen reads search params.
 */
export default function JourneyPage() {
  return (
    <Screen variant="full">
      <Suspense
        fallback={
          <div className="flex h-[60dvh] items-center justify-center text-body text-foreground-muted" role="status">
            Finding your routes…
          </div>
        }
      >
        <JourneyScreen />
      </Suspense>
    </Screen>
  );
}
