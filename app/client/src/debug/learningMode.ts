/**
 * DEBUG LEARNING MODE
 * Development-only educational logging and sampled pointer observations.
 * These utilities observe application behavior; they never control drawings.
 */
export const DEBUG_ENABLED = import.meta.env.DEV && import.meta.env.VITE_DEBUG_MODE === "true";
export type DebugLevel = "basic" | "detailed" | "verbose";
export type DebugCategory = "KONVA" | "REACT" | "TOOL" | "CANVAS" | "API" | "ERROR" | "LEARN";
type Origin = "konva-event" | "application" | "inferred";
const ranks = { basic: 0, detailed: 1, verbose: 2 };
const configuredLevel = import.meta.env.VITE_DEBUG_LEVEL?.toLowerCase();
export const DEBUG_LEVEL: DebugLevel = configuredLevel === "detailed" || configuredLevel === "verbose"
  ? configuredLevel : "basic";
const lastLogs = new Map<string, number>();
const explanations = new Set<string>();

// Filter before copying values. Throttling applies only to noisy observations,
// so start/completion and error events are never hidden by pointer traffic.
export function debugLog(
  category: DebugCategory,
  event: string,
  values: Record<string, unknown> = {},
  options: { level?: DebugLevel; origin?: Origin; explanation?: string; throttleMs?: number } = {},
) {
  if (!DEBUG_ENABLED || ranks[options.level ?? "basic"] > ranks[DEBUG_LEVEL]) return;
  const key = `${category}:${event}`;
  const now = performance.now();
  if (options.throttleMs && now - (lastLogs.get(key) ?? -Infinity) < options.throttleMs) return;
  lastLogs.set(key, now);
  // Snapshot accepted values so expanding a console entry later shows the data
  // at event time. Callers must supply small, non-sensitive plain data.
  const entry = { timestamp: new Date().toISOString(), category, event,
    origin: options.origin ?? "application", values: structuredClone(values) };
  const output = category === "ERROR" ? console.error : console.log;
  output(`[${entry.timestamp}] [${category}] ${event}`, entry);
  if (options.explanation && !explanations.has(options.explanation)) {
    explanations.add(options.explanation);
    console.log(`[${entry.timestamp}] [LEARN] ${options.explanation}`, {
      timestamp: entry.timestamp, category: "LEARN", event: "Explanation", origin: "inferred",
      values: { relatedEvent: event },
    });
  }
}

export type Point = { x: number; y: number };
type Observation = { pointer: Point | null; drawing: boolean };
let observation: Observation = { pointer: null, drawing: false };
const listeners = new Set<() => void>();
let lastPublished = -Infinity;
let pending: Observation | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

function publish(next: Observation) {
  lastPublished = performance.now();
  observation = next;
  listeners.forEach((listener) => listener());
}

export function subscribePointer(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearTimeout(timer);
      timer = undefined;
      pending = null;
    }
  };
}
export const getPointerObservation = () => observation;

// Sample movement at most ten times per second, with a trailing update so the
// final position is retained. Boundary events publish immediately. Drawing is
// copied from the application's ref, never used as a second control state.
export function observePointer(event: "down" | "move" | "up" | "leave", pointer: Point | null,
  drawing: boolean, nativeEvent: string) {
  if (!DEBUG_ENABLED) return;
  const next = { pointer: pointer ? { ...pointer } : null, drawing };
  debugLog("KONVA", `pointer${event}`, { pointer, nativeEvent }, {
    origin: "konva-event", level: event === "move" ? "verbose" : "detailed",
    throttleMs: event === "move" ? 100 : undefined,
    explanation: "Konva getPointerPosition() reports pixels relative to the stage's top-left. This app's layer has no coordinate transform.",
  });
  if (drawing !== observation.drawing && event !== "move") {
    debugLog("TOOL", drawing ? "Drawing started" : "Drawing completed", { pointer, drawing }, {
      explanation: "The application starts a stroke on mouse/touch down and finishes it on mouse/touch up. Leaving the stage alone does not finish it.",
    });
  }
  const remaining = 100 - (performance.now() - lastPublished);
  if (event !== "move" || remaining <= 0) {
    clearTimeout(timer);
    timer = undefined;
    pending = null;
    publish(next);
  } else {
    pending = next;
    if (!timer) timer = setTimeout(() => {
      timer = undefined;
      if (pending) publish(pending);
      pending = null;
    }, remaining);
  }
}
