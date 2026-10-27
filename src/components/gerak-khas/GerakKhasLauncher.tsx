"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useGerakKhas } from "./GerakKhasProvider";
import { resolveRobotState } from "./robotState";
import type { RobotSeverity } from "./robotState";
import { GerakKhasRobot } from "./GerakKhasRobot";

/**
 * GerakKhasLauncher — the floating, draggable robot that opens the chat
 * (Requirements 3, 4). Uses Pointer Events only.
 *
 *  - Desktop (>=768px): free drag constrained to the viewport; on release it
 *    docks to the nearer left/right edge (within 48px it snaps immediately).
 *  - Mobile (<768px): NO free 2D drag — only vertical repositioning along the
 *    current docked edge; horizontal movement is ignored so the page keeps
 *    scrolling normally.
 *  - A drag never triggers the chat: a pointer that moves past a small
 *    threshold is treated as a drag, and the click-to-open is suppressed.
 *
 * Position is LOCAL client state in the provider — never persisted.
 */

const DESKTOP_MIN = 768;
const EDGE_DOCK_THRESHOLD = 48;
const DRAG_THRESHOLD = 6;
const MARGIN = 12;
const ROBOT = 72;

function isDesktop(): boolean {
  return typeof window !== "undefined" && window.innerWidth >= DESKTOP_MIN;
}

export function GerakKhasLauncher() {
  const { open, openPanel, dockEdge, dockOffsetY, setDock, activity, journeyContext } =
    useGerakKhas();
  const [dragging, setDragging] = useState(false);
  const movedRef = useRef(false);
  const startRef = useRef<{ x: number; y: number; offsetY: number } | null>(null);
  const freePos = useRef<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [, force] = useState(0);

  const severity: RobotSeverity = journeyContext?.disruption?.severity ?? "none";
  const state = resolveRobotState({ activity, severity });

  const clampY = useCallback((y: number) => {
    const max = (typeof window !== "undefined" ? window.innerHeight : 800) - ROBOT - MARGIN;
    return Math.min(Math.max(y, MARGIN + 56), Math.max(MARGIN + 56, max));
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      movedRef.current = false;
      startRef.current = { x: e.clientX, y: e.clientY, offsetY: dockOffsetY || clampY(e.clientY) };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setDragging(true);
    },
    [dockOffsetY, clampY],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!startRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      if (!movedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) movedRef.current = true;
      if (!movedRef.current) return;

      const y = clampY(startRef.current.offsetY + dy);
      if (isDesktop()) {
        // Free drag: track a free position for the live transform.
        freePos.current = { x: e.clientX, y };
      } else {
        // Mobile: vertical only along the current edge.
        freePos.current = null;
      }
      setDock(dockEdge, y);
      force((n) => n + 1);
    },
    [clampY, dockEdge, setDock],
  );

  const onPointerUp = useCallback(
    () => {
      const moved = movedRef.current;
      startRef.current = null;
      setDragging(false);
      if (moved && isDesktop() && freePos.current) {
        // Dock to the nearer edge (or snap if within the threshold).
        const w = window.innerWidth;
        const x = freePos.current.x;
        const nearRight = x > w / 2;
        const atEdge = x <= EDGE_DOCK_THRESHOLD || x >= w - EDGE_DOCK_THRESHOLD;
        void atEdge;
        setDock(nearRight ? "right" : "left", clampY(freePos.current.y));
      }
      freePos.current = null;
      if (!moved) {
        // A genuine tap/click: open the panel.
        openPanel();
      }
    },
    [openPanel, setDock, clampY],
  );

  // Keep the robot inside the viewport on resize.
  useEffect(() => {
    function onResize() {
      setDock(dockEdge, clampY(dockOffsetY || 120));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [dockEdge, dockOffsetY, clampY, setDock]);

  // Default resting position on first mount.
  useEffect(() => {
    if (!dockOffsetY) setDock(dockEdge, clampY(window.innerHeight * 0.62));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (open) return null; // The panel anchors its own robot avatar while open.

  const style: React.CSSProperties =
    dragging && freePos.current
      ? { left: freePos.current.x - ROBOT / 2, top: freePos.current.y }
      : dockEdge === "right"
        ? { right: MARGIN, top: dockOffsetY || 400 }
        : { left: MARGIN, top: dockOffsetY || 400 };

  return (
    <button
      ref={btnRef}
      type="button"
      className="gk-launcher"
      style={style}
      aria-label="Open Gerak Khas, your mobility co-pilot"
      aria-haspopup="dialog"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPanel();
        }
      }}
    >
      <GerakKhasRobot state={state} size={ROBOT} />
    </button>
  );
}

export default GerakKhasLauncher;

