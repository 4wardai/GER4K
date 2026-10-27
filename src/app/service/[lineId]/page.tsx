import Screen from "@/components/layout/Screen";
import { LineDetailScreen } from "@/components/service/ServiceScreens";
import { lineInfo } from "@/data";

/* Line detail (Requirement 26.2): Service notice → Community → GER4K for you. */
export function generateStaticParams() {
  return lineInfo.filter((l) => l.kind === "rail").map((l) => ({ lineId: l.lineId }));
}

export default async function LinePage({ params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params;
  return (
    <Screen>
      <LineDetailScreen lineId={lineId} />
    </Screen>
  );
}
