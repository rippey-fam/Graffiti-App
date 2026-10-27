import { useRef } from "react";
import Konva from "konva";
import DrawingCanvas from "./DrawingCanvas";
import DrawingInspector from "./DrawingInspector";
import DrawingToolbar from "./DrawingToolbar";
import { useDrawingContext } from "../context/useDrawingContext";

export default function DrawingWorkspace() {
  const { setLines } = useDrawingContext();
  const stageRef = useRef<Konva.Stage>(null);

  const handleExport = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const link = document.createElement("a");
    link.download = "canvas-drawing.png";
    link.href = stage.toDataURL();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="canvas-container">
      <DrawingToolbar onClear={() => setLines([])} onExport={handleExport} />
      <DrawingCanvas stageRef={stageRef} />
      <DrawingInspector />
    </div>
  );
}
