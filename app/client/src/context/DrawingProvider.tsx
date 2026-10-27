import { useMemo, useState, type ReactNode } from "react";
import { DrawingContext, type DrawingContextValue } from "./DrawingContext";

export function DrawingProvider({ children }: { children: ReactNode }) {
  const [tool, setTool] = useState<DrawingContextValue["tool"]>("pen");
  const [lines, setLines] = useState<DrawingContextValue["lines"]>([]);
  const [color, setColor] = useState("#38bdf8");
  const [strokeWidth, setStrokeWidth] = useState(5);

  const value = useMemo(
    () => ({
      tool,
      setTool,
      lines,
      setLines,
      color,
      setColor,
      strokeWidth,
      setStrokeWidth,
    }),
    [tool, lines, color, strokeWidth],
  );

  return <DrawingContext value={value}>{children}</DrawingContext>;
}
