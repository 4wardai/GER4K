import Screen from "@/components/layout/Screen";
import PulseScreen from "@/components/pulse/PulseScreen";

/*
 * Station Pulse (Requirement 24.4): browse community conditions, worst first,
 * and report in one or two taps. Aggregation runs client-side so the 30-minute
 * window uses the viewer's current time.
 */
export default function PulsePage() {
  return (
    <Screen>
      <PulseScreen />
    </Screen>
  );
}
