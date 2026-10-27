"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { mockDataProvider } from "@/data";
import {
  awardForReport,
  EMPTY_POINTS,
  validateNewReport,
} from "@/domain/community";
import { profileForMobilityNeeds } from "@/domain/personal";
import type {
  CommunityReport,
  MobilityNeed,
  PointsState,
  PreferenceProfile,
  RecentSearch,
  SavedJourney,
  StationReportType,
} from "@/types";

/**
 * Ger4kStore — local prototype state (Requirements 25, 28, 30, 35).
 *
 * Saved journeys, recent searches, preferred profile, mobility needs, GER4K
 * Points and the passenger's own submitted reports live in localStorage under
 * one versioned key. If localStorage is unavailable the store keeps working in
 * memory (Requirement 35.2). No authentication, no server persistence.
 *
 * Also hosts lightweight UI state shared across screens: the global station
 * sheet, a reports version counter (so Pulse re-aggregates after a submission)
 * and the points thank-you toast.
 */

const STORAGE_KEY = "ger4k.v1";

interface PersistedState {
  version: 1;
  saved: SavedJourney[];
  recents: RecentSearch[];
  preferredProfile: PreferenceProfile;
  mobilityNeeds: MobilityNeed[];
  points: PointsState;
  submittedReports: CommunityReport[];
  devMode: boolean;
}

const DEFAULT_STATE: PersistedState = {
  version: 1,
  saved: [],
  recents: [],
  preferredProfile: "Balanced",
  mobilityNeeds: [],
  points: EMPTY_POINTS,
  submittedReports: [],
  devMode: false,
};

function readStorage(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.version !== 1) return null;
    return { ...DEFAULT_STATE, ...parsed } as PersistedState;
  } catch {
    return null;
  }
}

function writeStorage(state: PersistedState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode, quota) — keep working in memory.
  }
}

export type SubmitReportResult =
  | { ok: true; awarded: number; duplicate: boolean; report: CommunityReport }
  | { ok: false; field: string; message: string };

export interface PointsToast {
  id: number;
  awarded: number;
  stationId: string;
}

export interface Ger4kStoreValue {
  hydrated: boolean;
  saved: SavedJourney[];
  recents: RecentSearch[];
  preferredProfile: PreferenceProfile;
  mobilityNeeds: MobilityNeed[];
  /** Effective default ranking profile (mobility needs win over the preference). */
  defaultProfile: PreferenceProfile;
  points: PointsState;
  devMode: boolean;
  reportsVersion: number;
  stationSheetId: string | null;
  /** Whether the station sheet opened straight into the report form. */
  stationSheetMode: "view" | "report";
  pointsToast: PointsToast | null;

  saveJourney: (label: string, originId: string, destinationId: string) => SavedJourney;
  removeSaved: (id: string) => void;
  renameSaved: (id: string, label: string) => void;
  isSaved: (originId: string, destinationId: string) => SavedJourney | undefined;
  addRecent: (originId: string, destinationId: string) => void;
  setPreferredProfile: (p: PreferenceProfile) => void;
  toggleMobilityNeed: (n: MobilityNeed) => void;
  submitReport: (stationId: string | null, reportType: StationReportType | null) => SubmitReportResult;
  setDevMode: (on: boolean) => void;
  clearLocalData: () => void;
  openStation: (id: string, mode?: "view" | "report") => void;
  closeStation: () => void;
  dismissPointsToast: () => void;
}

const Ger4kStoreContext = createContext<Ger4kStoreValue | null>(null);

export function Ger4kStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [reportsVersion, setReportsVersion] = useState(0);
  const [stationSheetId, setStationSheetId] = useState<string | null>(null);
  const [stationSheetMode, setStationSheetMode] = useState<"view" | "report">("view");
  const [pointsToast, setPointsToast] = useState<PointsToast | null>(null);
  const toastSeq = useRef(0);

  // Hydrate after mount (avoids SSR mismatch) and replay own reports.
  useEffect(() => {
    const stored = readStorage();
    if (stored) {
      setState(stored);
      mockDataProvider.restoreReports?.(stored.submittedReports);
      setReportsVersion((v) => v + 1);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeStorage(state);
  }, [state, hydrated]);

  const update = useCallback((fn: (s: PersistedState) => PersistedState) => {
    setState((s) => fn(s));
  }, []);

  const saveJourney = useCallback(
    (label: string, originId: string, destinationId: string) => {
      const journey: SavedJourney = {
        id: `saved-${Date.now().toString(36)}`,
        label: label.trim() || "Saved journey",
        originId,
        destinationId,
        createdAt: new Date().toISOString(),
      };
      update((s) => ({
        ...s,
        saved: [
          journey,
          ...s.saved.filter((x) => !(x.originId === originId && x.destinationId === destinationId)),
        ].slice(0, 8),
      }));
      return journey;
    },
    [update],
  );

  const removeSaved = useCallback(
    (id: string) => update((s) => ({ ...s, saved: s.saved.filter((x) => x.id !== id) })),
    [update],
  );

  const renameSaved = useCallback(
    (id: string, label: string) =>
      update((s) => ({
        ...s,
        saved: s.saved.map((x) => (x.id === id ? { ...x, label: label.trim() || x.label } : x)),
      })),
    [update],
  );

  const isSaved = useCallback(
    (originId: string, destinationId: string) =>
      state.saved.find((x) => x.originId === originId && x.destinationId === destinationId),
    [state.saved],
  );

  const addRecent = useCallback(
    (originId: string, destinationId: string) =>
      update((s) => ({
        ...s,
        recents: [
          { originId, destinationId, at: new Date().toISOString() },
          ...s.recents.filter((r) => !(r.originId === originId && r.destinationId === destinationId)),
        ].slice(0, 5),
      })),
    [update],
  );

  const setPreferredProfile = useCallback(
    (p: PreferenceProfile) => update((s) => ({ ...s, preferredProfile: p })),
    [update],
  );

  const toggleMobilityNeed = useCallback(
    (n: MobilityNeed) =>
      update((s) => ({
        ...s,
        mobilityNeeds: s.mobilityNeeds.includes(n)
          ? s.mobilityNeeds.filter((x) => x !== n)
          : [...s.mobilityNeeds, n],
      })),
    [update],
  );

  const submitReport = useCallback(
    (stationId: string | null, reportType: StationReportType | null): SubmitReportResult => {
      const valid = validateNewReport({ stationId, reportType });
      if (!valid.ok) return valid;
      const report = mockDataProvider.submitReport({
        stationId: stationId as string,
        condition: "Normal",
        reportType: reportType as StationReportType,
      });
      // Award from the current points state (pure domain rule), then persist.
      const award = awardForReport(state.points, {
        stationId: report.stationId,
        reportType: report.reportType ?? report.condition,
        at: report.timestamp,
      });
      setState((s) => ({
        ...s,
        points: award.state,
        submittedReports: [report, ...s.submittedReports].slice(0, 50),
      }));
      toastSeq.current += 1;
      setPointsToast({ id: toastSeq.current, awarded: award.awarded, stationId: report.stationId });
      setReportsVersion((v) => v + 1);
      return { ok: true, awarded: award.awarded, duplicate: award.duplicate, report };
    },
    [state.points],
  );

  const setDevMode = useCallback((on: boolean) => update((s) => ({ ...s, devMode: on })), [update]);

  const clearLocalData = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setState(DEFAULT_STATE);
    setReportsVersion((v) => v + 1);
  }, []);

  const value = useMemo<Ger4kStoreValue>(
    () => ({
      hydrated,
      saved: state.saved,
      recents: state.recents,
      preferredProfile: state.preferredProfile,
      mobilityNeeds: state.mobilityNeeds,
      defaultProfile: profileForMobilityNeeds(state.mobilityNeeds, state.preferredProfile),
      points: state.points,
      devMode: state.devMode,
      reportsVersion,
      stationSheetId,
      stationSheetMode,
      pointsToast,
      saveJourney,
      removeSaved,
      renameSaved,
      isSaved,
      addRecent,
      setPreferredProfile,
      toggleMobilityNeed,
      submitReport,
      setDevMode,
      clearLocalData,
      openStation: (id: string, mode: "view" | "report" = "view") => {
        setStationSheetMode(mode);
        setStationSheetId(id);
      },
      closeStation: () => setStationSheetId(null),
      dismissPointsToast: () => setPointsToast(null),
    }),
    [
      hydrated,
      state,
      reportsVersion,
      stationSheetId,
      stationSheetMode,
      pointsToast,
      saveJourney,
      removeSaved,
      renameSaved,
      isSaved,
      addRecent,
      setPreferredProfile,
      toggleMobilityNeed,
      submitReport,
      setDevMode,
      clearLocalData,
    ],
  );

  return <Ger4kStoreContext.Provider value={value}>{children}</Ger4kStoreContext.Provider>;
}

export function useGer4kStore(): Ger4kStoreValue {
  const ctx = useContext(Ger4kStoreContext);
  if (!ctx) throw new Error("useGer4kStore must be used within <Ger4kStoreProvider>.");
  return ctx;
}
