import { createContext, type Dispatch, type SetStateAction } from "react";

export type DrawingTool = "pen" | "eraser";

export interface LineData {
  tool: DrawingTool;
  stroke: string;
  strokeWidth: number;
  points: number[];
}

export interface DrawingContextValue {
  tool: DrawingTool;
  setTool: Dispatch<SetStateAction<DrawingTool>>;
  lines: LineData[];
  setLines: Dispatch<SetStateAction<LineData[]>>;
  color: string;
  setColor: Dispatch<SetStateAction<string>>;
  strokeWidth: number;
  setStrokeWidth: Dispatch<SetStateAction<number>>;
}

export const DrawingContext = createContext<DrawingContextValue | undefined>(
  undefined,
);
