import { useState, useRef } from "react";
import { Stage, Layer, Line } from "react-konva";
import Konva from "konva";

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
  };

  const handleMouseMove = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
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

  const handleMouseUp = () => {
    isDrawing.current = false;
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
        <button
          className={`tool-btn ${tool === "pen" ? "active" : ""}`}
          onClick={() => setTool("pen")}
        >
          Brush
        </button>
        <button
          className={`tool-btn ${tool === "eraser" ? "active" : ""}`}
          onClick={() => setTool("eraser")}
        >
          Eraser
        </button>

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
    </div>
  );
}
