import ToolDropdown from "./ToolDropdown";
import { useDrawingContext } from "../context/useDrawingContext";

interface DrawingToolbarProps {
  onClear: () => void;
  onExport: () => void;
}

const toolOptions = [
  { value: "pen", label: "Brush" },
  { value: "eraser", label: "Eraser" },
] as const;

export default function DrawingToolbar({
  onClear,
  onExport,
}: DrawingToolbarProps) {
  const {
    tool,
    setTool,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
  } = useDrawingContext();

  return (
    <div className="toolbar">
      <ToolDropdown
        options={toolOptions}
        value={tool}
        onChange={setTool}
      />

      <div className="divider" />

      <input
        type="color"
        className="color-picker"
        value={color}
        onChange={(event) => setColor(event.target.value)}
        disabled={tool === "eraser"}
      />

      <div className="slider-container">
        <span>Size</span>
        <input
          type="range"
          min="1"
          max="50"
          value={strokeWidth}
          onChange={(event) => setStrokeWidth(Number(event.target.value))}
        />
      </div>

      <div className="divider" />

      <button
        type="button"
        className="tool-btn danger"
        onClick={onClear}
      >
        Clear
      </button>
      <button type="button" className="tool-btn" onClick={onExport}>
        Export
      </button>
    </div>
  );
}
