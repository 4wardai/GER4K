import { routeQuestion } from "./src/services/gerak-khas/intentRouter";
import { demoStations } from "./src/data";
const stations = demoStations.map((s) => ({ stationId: s.id, name: s.name, condition: "Normal", reportCount: 0, freshnessMin: null, band: "Low" as const, trend: "steady" as const, signals: [] as string[], isSimulated: false }));
const r = routeQuestion("What colour are the station seats?", stations);
console.log(JSON.stringify({ primary: r.primary, stationId: r.stationId }));
