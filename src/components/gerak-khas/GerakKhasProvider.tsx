"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { RobotActivity } from "./robotState";
import type { PreferenceProfile } from "@/types";
import type {
  ChatMessage,
  CurrentJourneyContext,
} from "@/services/gerak-khas/types";

/**
 * GerakKhasProvider — co-pilot UI state ONLY (Requirements 5, 7).
 *
 * Owns: panel open/closed, robot dock edge + offset (local client state only,
 * never persisted to a server/account), transient robot activity, and the chat
 * transcript. It also hosts the "current journey context bridge" slot
 * (Requirement 10): the journey screen publishes a MINIMAL journey context here
 * via `publishJourneyContext` and clears it on unmount. The provider performs
 * NO transport reasoning and never calls the journey engine.
 */

export type DockEdge = "left" | "right";

export interface GerakKhasUiState {
  // Panel
  open: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;

  // Robot position (local only)
  dockEdge: DockEdge;
  /** Vertical offset from the top, in px, clamped by the robot component. */
  dockOffsetY: number;
  setDock: (edge: DockEdge, offsetY?: number) => void;

  // Robot activity (drives IDLE/LISTENING/THINKING/SUCCESS)
  activity: RobotActivity;
  setActivity: (a: RobotActivity) => void;
  /** Play the one-shot SUCCESS beat, then settle back to idle. */
  flashSuccess: () => void;

  // Chat transcript
  messages: ChatMessage[];
  addMessage: (m: ChatMessage) => void;
  resetMessages: () => void;
  /** True until the first panel open in this session (controls opening message). */
  greeted: boolean;
  markGreeted: () => void;

  // Current journey context bridge (populated by the journey screen in Phase 2)
  journeyContext: CurrentJourneyContext | null;
  publishJourneyContext: (ctx: CurrentJourneyContext) => void;
  clearJourneyContext: () => void;

  /**
   * Route-selection request channel (Phase 3). The action handler sets this; the
   * journey screen consumes it to actually change the selected route/profile,
   * then calls `consumeRouteRequest()`. Null when there is nothing pending.
   */
  routeRequest: { routeId: string; profile?: PreferenceProfile; seq: number } | null;
  requestRouteSelection: (routeId: string, profile?: PreferenceProfile) => void;
  consumeRouteRequest: () => void;
}

const GerakKhasContext = createContext<GerakKhasUiState | null>(null);

let messageSeq = 0;
function nextId(): string {
  messageSeq += 1;
  return `gk-${Date.now().toString(36)}-${messageSeq}`;
}

export function GerakKhasProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dockEdge, setDockEdge] = useState<DockEdge>("right");
  const [dockOffsetY, setDockOffsetY] = useState<number>(0);
  const [activity, setActivityState] = useState<RobotActivity>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [greeted, setGreeted] = useState(false);
  const [journeyContext, setJourneyContext] = useState<CurrentJourneyContext | null>(null);
  const [routeRequest, setRouteRequest] = useState<{ routeId: string; profile?: PreferenceProfile; seq: number } | null>(null);
  const routeSeq = useRef(0);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setDock = useCallback((edge: DockEdge, offsetY?: number) => {
    setDockEdge(edge);
    if (offsetY !== undefined) setDockOffsetY(offsetY);
  }, []);

  const setActivity = useCallback((a: RobotActivity) => setActivityState(a), []);

  const flashSuccess = useCallback(() => {
    if (successTimer.current) clearTimeout(successTimer.current);
    setActivityState("success");
    // One-shot: settle back to idle after the acknowledgement (<=1500ms).
    successTimer.current = setTimeout(() => setActivityState("idle"), 1500);
  }, []);

  const addMessage = useCallback((m: ChatMessage) => {
    setMessages((prev) => [...prev, m]);
  }, []);

  const resetMessages = useCallback(() => setMessages([]), []);
  const markGreeted = useCallback(() => setGreeted(true), []);

  const openPanel = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);
  const togglePanel = useCallback(() => setOpen((v) => !v), []);

  const publishJourneyContext = useCallback((ctx: CurrentJourneyContext) => {
    setJourneyContext(ctx);
  }, []);
  const clearJourneyContext = useCallback(() => setJourneyContext(null), []);

  const requestRouteSelection = useCallback((routeId: string, profile?: PreferenceProfile) => {
    routeSeq.current += 1;
    setRouteRequest({ routeId, profile, seq: routeSeq.current });
  }, []);
  const consumeRouteRequest = useCallback(() => setRouteRequest(null), []);

  const value = useMemo<GerakKhasUiState>(
    () => ({
      open,
      openPanel,
      closePanel,
      togglePanel,
      dockEdge,
      dockOffsetY,
      setDock,
      activity,
      setActivity,
      flashSuccess,
      messages,
      addMessage,
      resetMessages,
      greeted,
      markGreeted,
      journeyContext,
      publishJourneyContext,
      clearJourneyContext,
      routeRequest,
      requestRouteSelection,
      consumeRouteRequest,
    }),
    [
      open,
      openPanel,
      closePanel,
      togglePanel,
      dockEdge,
      dockOffsetY,
      setDock,
      activity,
      setActivity,
      flashSuccess,
      messages,
      addMessage,
      resetMessages,
      greeted,
      markGreeted,
      journeyContext,
      publishJourneyContext,
      clearJourneyContext,
      routeRequest,
      requestRouteSelection,
      consumeRouteRequest,
    ],
  );

  return <GerakKhasContext.Provider value={value}>{children}</GerakKhasContext.Provider>;
}

export function useGerakKhas(): GerakKhasUiState {
  const ctx = useContext(GerakKhasContext);
  if (!ctx) throw new Error("useGerakKhas must be used within a <GerakKhasProvider>.");
  return ctx;
}

export { nextId as nextMessageId };




