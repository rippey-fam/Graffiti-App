/**
 * DEBUG LEARNING MODE
 * Reads committed drawing props and sampled pointer observations. This panel
 * explains public application data, not undocumented Konva internals.
 * It is lazily mounted only in explicitly enabled development sessions.
 */
import { useEffect, useRef, useSyncExternalStore } from "react";
import { debugLog, DEBUG_LEVEL, getPointerObservation, subscribePointer } from "./learningMode";
import type { Point } from "./learningMode";
import "./learningInspector.css";

type Drawing = { tool: string; points: number[]; stroke: string; strokeWidth: number };
type Props = { tool: string; lines: Drawing[] };
const formatPoint = (point: Point | null) => point ? `X:${point.x}, Y:${point.y}` : "Unavailable";

export default function LearningInspector({ tool, lines }: Props) {
  const { pointer, drawing } = useSyncExternalStore(subscribePointer, getPointerObservation);
  const previous = useRef<{ tool: string | null; lines: Drawing[] }>({ tool: null, lines: [] });

  // Observe committed React data outside state updater functions: Strict Mode
  // can replay updaters, so placing logs inside them would report false duplicates.
  useEffect(() => {
    const before = previous.current;
    if (before.tool !== tool) debugLog("TOOL", "Active tool changed", { from: before.tool, to: tool }, {
      explanation: "Tool selection is React state. Brush adds a stroke; eraser uses destination-out to remove visible pixels while retaining a line object.",
    });
    if (lines.length > before.lines.length) {
      lines.slice(before.lines.length).forEach((line, offset) => debugLog("CANVAS", "Line created", {
        index: before.lines.length + offset, tool: line.tool, points: line.points,
      }, { explanation: "A Konva Line takes a flat points array: [x1,y1,x2,y2,...]. One pair is the start; two pairs define a straight segment; more pairs form a freehand path." }));
    }
    if (lines.length < before.lines.length) debugLog("CANVAS", "Drawing objects removed", {
      removed: before.lines.length - lines.length, remaining: lines.length,
    });
    const last = lines.at(-1);
    if (last && before.lines.length === lines.length && last !== before.lines.at(-1)) {
      debugLog("CANVAS", "Line coordinates updated", { points: last.points }, {
        level: "detailed", throttleMs: 100,
        explanation: "The current freehand stroke is already in React's lines array during drawing. There is no separate temporary preview in this app.",
      });
    }
    if (before.lines !== lines) debugLog("REACT", "Drawing state committed", {
      previousCount: before.lines.length, objectCount: lines.length,
      latestPoints: last?.points ?? null,
    }, { level: "detailed", throttleMs: lines.length === before.lines.length ? 100 : undefined,
      explanation: "React stores the drawing data. React-Konva applies the committed Line props to Konva shapes. This observation does not inspect internal rendering steps." });
    previous.current = { tool, lines };
  }, [tool, lines]);

  useEffect(() => {
    debugLog("REACT", "Drawing operation observed", { drawing, pointer }, {
      level: "detailed", throttleMs: 100,
    });
  }, [drawing, pointer]);

  // Values below come directly from the last committed line. Pointer position
  // may differ from the endpoint when hovering or after releasing a stroke.
  const points = lines.at(-1)?.points;
  const start = points?.length ? { x: points[0], y: points[1] } : null;
  const endpoint = points?.length ? { x: points[points.length - 2], y: points[points.length - 1] } : null;
  return (
    <details className="learning-inspector" open>
      <summary>Developer Learning Mode ({DEBUG_LEVEL})</summary>
      <dl>
        <dt>Active Tool</dt><dd>{tool === "pen" ? "Brush (pen)" : tool}</dd>
        <dt>Pointer Position</dt><dd>{formatPoint(pointer)}</dd>
        <dt>Drawing State</dt><dd>{drawing ? "In Progress" : "Idle"}</dd>
        <dt>Starting Point (latest line)</dt><dd>{formatPoint(start)}</dd>
        <dt>Current Endpoint (latest line)</dt><dd>{formatPoint(endpoint)}</dd>
        <dt>Line Points (latest line)</dt><dd className="learning-points">{points ? JSON.stringify(points) : "Unavailable"}</dd>
        <dt>Total Drawing Objects</dt><dd>{lines.length}</dd>
        <dt>Temporary Preview</dt><dd>Unavailable in current tools</dd>
      </dl>
      <p>Read-only observations. The panel body passes pointer events to the canvas. Use the heading to collapse it.</p>
    </details>
  );
}
