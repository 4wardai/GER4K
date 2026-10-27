"""
GER4K — development-time GTFS Static reference extraction (Requirements 17, 18).

NOT a runtime dependency and NOT a GTFS pipeline. Prints the official values
copied into `src/data/mock/fixture.ts`, `multimodal.ts` and `lineInfo.ts`:
station codes / coordinates / isOKU flags, line names / colours, and the bus
and feeder routes that serve fixture stations (names, headsigns, headways).

Source: https://developer.data.gov.my/realtime-api/gtfs-static (CC BY 4.0)
  https://api.data.gov.my/gtfs-static/prasarana?category=rapid-rail-kl
  https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-kl
  https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-mrtfeeder

Usage: download + unzip the three feeds into folders named after the category,
then: python scripts/data/extract_gtfs_reference.py <folder-containing-feeds>
Uses only the Python standard library.
"""

import csv
import math
import os
import sys
from collections import defaultdict

ANCHORS = {
    "Putrajaya Sentral": (2.9313, 101.6715),
    "Chan Sow Lin": (3.12839, 101.71663),
    "TRX": (3.14289, 101.72034),
    "Conlay": (3.15145, 101.71801),
    "Persiaran KLCC": (3.15712, 101.71834),
    "Ampang Park": (3.16225, 101.71781),
    "Pasar Seni": (3.142439, 101.69531),
    "Merdeka": (3.141969, 101.70205),
    "Bukit Bintang": (3.146503, 101.710947),
    "Masjid Jamek": (3.149714, 101.696815),
    "KLCC": (3.158935, 101.713287),
}
RAIL_STOPS = {"PY41", "PY24", "PY23", "PY22", "PY21", "PY20", "KG20", "KG18A", "KG17", "KG16",
              "KJ14", "KJ13", "KJ10", "KJ9", "AG11", "AG7"}


def read(root, cat, name):
    with open(os.path.join(root, cat, name), encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def metres(a, b):
    r = 6371000
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp, dl = math.radians(b[0] - a[0]), math.radians(b[1] - a[1])
    x = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(x))


def main(root):
    print("== Rail stops (code, name, lat, lon, isOKU)")
    for s in read(root, "rapid-rail-kl", "stops.txt"):
        if s["stop_id"] in RAIL_STOPS:
            print(s["stop_id"], s["stop_name"], s["stop_lat"], s["stop_lon"], s.get("isOKU"))
    print("== Rail routes (id, long name, desc, colour)")
    for r in read(root, "rapid-rail-kl", "routes.txt"):
        print(r["route_id"], r["route_long_name"], r["route_desc"], "#" + r["route_color"])

    for cat in ("rapid-bus-kl", "rapid-bus-mrtfeeder"):
        print(f"== {cat}: routes with a stop within 400 m of a fixture station")
        stops = read(root, cat, "stops.txt")
        routes = {r["route_id"]: r for r in read(root, cat, "routes.txt")}
        trips = {t["trip_id"]: t for t in read(root, cat, "trips.txt")}
        near = defaultdict(set)
        for s in stops:
            p = (float(s["stop_lat"]), float(s["stop_lon"]))
            for name, a in ANCHORS.items():
                if metres(p, a) <= 400:
                    near[s["stop_id"]].add(name)
        served = defaultdict(set)
        with open(os.path.join(root, cat, "stop_times.txt"), encoding="utf-8-sig", newline="") as fh:
            for st in csv.DictReader(fh):
                t = trips.get(st["trip_id"])
                if t and st["stop_id"] in near:
                    for name in near[st["stop_id"]]:
                        served[name].add((t["route_id"], t.get("trip_headsign", "")))
        for name, items in sorted(served.items()):
            for rid, headsign in sorted(items):
                r = routes.get(rid, {})
                label = r.get("route_short_name") or r.get("route_long_name")
                print(f"  {name}: {label} ({r.get('route_long_name')}) — {headsign}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
