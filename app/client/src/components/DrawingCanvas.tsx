import { useRef, type RefObject } from "react";
import { Layer, Line, Stage } from "react-konva";
import Konva from "konva";
import { useDrawingContext } from "../context/useDrawingContext";
import { DEBUG_ENABLED, debugLog, observePointer } from "../debug/learningMode";

interface DrawingCanvasProps {
  stageRef: RefObject<Konva.Stage | null>;
}

export default function DrawingCanvas({ stageRef }: DrawingCanvasProps) {
  const { tool, lines, setLines, color, strokeWidth } = useDrawingContext();
  const isDrawing = useRef(false);

  const handleMouseDown = (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    isDrawing.current = true;
    const position = event.target.getStage()?.getPointerPosition();
    if (position) {
      setLines((previousLines) => [
        ...previousLines,
        {
          tool,
          stroke: color,
          strokeWidth,
          points: [position.x, position.y],
        },
      ]);
    }

    if (import.meta.env.DEV && DEBUG_ENABLED) {
      observePointer("down", position ?? null, isDrawing.current, event.type);
    }
  };

  const handleMouseMove = (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (import.meta.env.DEV && DEBUG_ENABLED) {
      observePointer(
        "move",
        event.target.getStage()?.getPointerPosition() ?? null,
        isDrawing.current,
        event.type,
      );
    }
    if (!isDrawing.current) return;

    const point = event.target.getStage()?.getPointerPosition();
    if (!point) return;

    setLines((previousLines) => {
      const lastLine = { ...previousLines[previousLines.length - 1] };
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      return [...previousLines.slice(0, -1), lastLine];
    });
  };

  const handleMouseUp = (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    const wasDrawing =
      import.meta.env.DEV && DEBUG_ENABLED && isDrawing.current;
    isDrawing.current = false;

    if (import.meta.env.DEV && DEBUG_ENABLED) {
      observePointer(
        "up",
        stageRef.current?.getPointerPosition() ?? null,
        isDrawing.current,
        event.type,
      );
      if (wasDrawing) {
        debugLog("CANVAS", "Completed line coordinates", {
          points: lines.at(-1)?.points ?? null,
        });
      }
    }
  };

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      onMouseDown={handleMouseDown}
      onMousemove={handleMouseMove}
      onMouseup={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
      onPointerLeave={
        import.meta.env.DEV && DEBUG_ENABLED
          ? (event) =>
              observePointer(
                "leave",
                null,
                isDrawing.current,
                event.type,
              )
          : undefined
      }
      ref={stageRef}
    >
      <Layer>
        {lines.map((line, index) => (
          <Line
            key={index}
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
  );
}
