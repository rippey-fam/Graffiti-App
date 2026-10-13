// DEBUG LEARNING MODE: Lazy loading keeps the inspector out of production;
// Suspense allows normal drawing to render while the diagnostic UI loads.
import { useState, useRef, lazy, Suspense } from "react";
import { Stage, Layer, Line } from "react-konva";
import Konva from "konva";
import ToolDropdown from "./components/ToolDropdown";
// DEBUG LEARNING MODE: These read-only helpers report public event/state data.
import { DEBUG_ENABLED, debugLog, observePointer } from "./debug/learningMode";
const LearningInspector = import.meta.env.DEV && DEBUG_ENABLED
  ? lazy(() => import("./debug/LearningInspector")) : null;

interface LineData {
  tool: "pen" | "eraser";
  stroke: string;
  strokeWidth: number;
  points: number[];
}

export default function App() {
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [lines, setLines] = useState<LineData[]>([]);
  const [color, setColor] = useState("#38bdf8");
  const [strokeWidth, setStrokeWidth] = useState(5);
  const isDrawing = useRef(false);
  const stageRef = useRef<Konva.Stage>(null);

  const handleMouseDown = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    isDrawing.current = true;
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) {
      setLines((prevLines) => [
        ...prevLines,
        {
          tool,
          stroke: color,
          strokeWidth,
          points: [pos.x, pos.y],
        },
      ]);
    }
    // DEBUG LEARNING MODE: Observe the application's start ref and the exact
    // stage coordinates used above; this call does not change drawing logic.
    if (import.meta.env.DEV && DEBUG_ENABLED) observePointer("down", pos ?? null, isDrawing.current, e.type);
  };

  const handleMouseMove = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    // DEBUG LEARNING MODE: Observe hover as well as drawing movement. Sampling
    // happens in the helper and never skips the application's drawing updates.
    if (import.meta.env.DEV && DEBUG_ENABLED) observePointer("move", e.target.getStage()?.getPointerPosition() ?? null, isDrawing.current, e.type);
    if (!isDrawing.current) return;

    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    if (!point) return;

    setLines((prevLines) => {
      const lastLine = { ...prevLines[prevLines.length - 1] };
      lastLine.points = lastLine.points.concat([point.x, point.y]);

      const newLines = prevLines.slice(0, prevLines.length - 1);
      return [...newLines, lastLine];
    });
  };

  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // DEBUG LEARNING MODE: Capture whether a stroke actually ended, without
    // treating an idle mouse-up as creation or completion of an object.
    const wasDrawing = import.meta.env.DEV && DEBUG_ENABLED && isDrawing.current;
    isDrawing.current = false;
    // DEBUG LEARNING MODE: The endpoint comes from committed drawing data, not
    // the release pointer (the normal app adds points only during movement).
    if (import.meta.env.DEV && DEBUG_ENABLED) {
      observePointer("up", stageRef.current?.getPointerPosition() ?? null, isDrawing.current, e.type);
      if (wasDrawing) debugLog("CANVAS", "Completed line coordinates", {
        points: lines.at(-1)?.points ?? null,
      });
    }
  };

  const handleClear = () => {
    setLines([]);
  };

  const handleExport = () => {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL();
    const link = document.createElement("a");
    link.download = "canvas-drawing.png";
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="canvas-container">
      {/* Floating Toolbar */}
      <div className="toolbar">
        <ToolDropdown
          options={[
            { value: "pen", label: "Brush" },
            { value: "eraser", label: "Eraser" },
          ]}
          value={tool}
          onChange={setTool}
        />

        <div className="divider" />

        <input
          type="color"
          className="color-picker"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          disabled={tool === "eraser"}
        />

        <div className="slider-container">
          <span>Size</span>
          <input
            type="range"
            min="1"
            max="50"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
          />
        </div>

        <div className="divider" />

        <button className="tool-btn danger" onClick={handleClear}>
          Clear
        </button>
        <button className="tool-btn" onClick={handleExport}>
          Export
        </button>
      </div>

      {/* Konva Stage */}
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        // DEBUG LEARNING MODE: Leaving only observes the existing drawing ref.
        // It deliberately does not end strokes or add an endpoint.
        onPointerLeave={import.meta.env.DEV && DEBUG_ENABLED ? (e) => observePointer("leave", null, isDrawing.current, e.type) : undefined}
        ref={stageRef}
      >
        <Layer>
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke={line.tool === "eraser" ? "#1e293b" : line.stroke}
              strokeWidth={line.strokeWidth}
              tension={0}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={
                line.tool === "eraser" ? "destination-out" : "source-over"
              }
            />
          ))}
        </Layer>
      </Stage>
      {/* DEBUG LEARNING MODE: Pass existing committed state to a read-only
          observer. No additional drawing state is introduced in App. */}
      {LearningInspector && <Suspense fallback={null}>
        <LearningInspector tool={tool} lines={lines} />
      </Suspense>}
    </div>
  );
}
