"""
GER4K — development-time extraction of Historical Demand (Requirement 27).

NOT a runtime dependency. Run manually to refresh
`src/data/mock/historicalDemand.ts`.

Source: data.gov.my "Daily Origin-Destination Ridership: Rapid Rail (KV)"
  https://data.gov.my/data-catalogue/ridership_od_rapidrail_daily
  Parquet: https://storage.data.gov.my/transportation/rail/rapidrail_<YEAR>_daily.parquet
  License: CC BY 4.0 (Prasarana Malaysia, Ministry of Transport)

Measure: average WEEKDAY trips starting or ending at each station (tap-in +
tap-out), station codes merged by name, over the last 28 days of data.
Caveat: interchange transfers inside the paid area are not in tap data.

Usage (in a throwaway virtualenv):
  python -m venv .venv && .venv/Scripts/pip install pyarrow==17.0.0
  curl -o od.parquet https://storage.data.gov.my/transportation/rail/rapidrail_2026_daily.parquet
  .venv/Scripts/python scripts/data/extract_od_demand.py od.parquet
"""

import datetime as dt
import json
import sys

import pyarrow.compute as pc
import pyarrow.parquet as pq

FIXTURE_STATIONS = {
    "Putrajaya Sentral": "putrajaya-sentral",
    "Chan Sow Lin": "chan-sow-lin",
    "Tun Razak Exchange": "trx",
    "Conlay": "conlay",
    "Persiaran KLCC": "persiaran-klcc",
    "Ampang Park": "ampang-park",
    "Pasar Seni": "pasar-seni",
    "Merdeka": "merdeka",
    "Bukit Bintang": "bukit-bintang",
    "Masjid Jamek": "masjid-jamek",
    "KLCC": "klcc",
}


def station_name(code: str) -> str:
    return code.split(": ", 1)[1] if ": " in code else code


def main(path: str) -> None:
    table = pq.read_table(path)
    max_date = pc.max(table["date"]).as_py()
    start = max_date - dt.timedelta(days=27)
    table = table.filter(pc.greater_equal(table["date"], start))

    totals: dict[str, int] = {}
    weekdays = set()
    for row in table.to_pylist():
        origin, dest, day, n = row["origin"], row["destination"], row["date"], row["ridership"]
        if origin.startswith("A0") or dest.startswith("A0") or day.weekday() >= 5:
            continue
        weekdays.add(day)
        for name in (station_name(origin), station_name(dest)):
            totals[name] = totals.get(name, 0) + n

    n_days = len(weekdays)
    ranked = sorted(totals, key=lambda s: totals[s], reverse=True)
    records = []
    for name, sid in FIXTURE_STATIONS.items():
        if name not in totals:
            continue
        rank = ranked.index(name) + 1
        records.append({
            "stationId": sid,
            "datasetName": name,
            "avgWeekdayTrips": round(totals[name] / n_days),
            "rank": rank,
            "of": len(ranked),
            "percentile": round(1 - (rank - 1) / (len(ranked) - 1), 2),
        })
    records.sort(key=lambda r: r["rank"])
    print(json.dumps({
        "window": [str(start.date()), str(max_date.date())],
        "weekdays": n_days,
        "records": records,
    }, indent=2))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "od.parquet")
