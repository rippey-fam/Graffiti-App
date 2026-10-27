import { lazy, Suspense } from "react";
import { useDrawingContext } from "../context/useDrawingContext";
import { DEBUG_ENABLED } from "../debug/learningMode";

const LearningInspector =
  import.meta.env.DEV && DEBUG_ENABLED
    ? lazy(() => import("../debug/LearningInspector"))
    : null;

export default function DrawingInspector() {
  const { tool, lines } = useDrawingContext();

  if (!LearningInspector) return null;

  return (
    <Suspense fallback={null}>
      <LearningInspector tool={tool} lines={lines} />
    </Suspense>
  );
}
