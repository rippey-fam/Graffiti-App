# Developer Learning Mode

<!-- DEBUG LEARNING MODE: Educational setup and guide to read-only instrumentation. -->

This debugger observes the current brush and eraser tools. It does not implement
the Sprint 2 polygon tool. Both current tools store freehand paths as React line
objects; erasing pixels adds an eraser object rather than removing an object.
Clear removes objects. There is no separate temporary drawing preview.

## Enable, configure, and disable

From the repository root in PowerShell:

```powershell
Copy-Item app/client/.env.example app/client/.env.local
```

Edit `app/client/.env.local`:

```dotenv
VITE_DEBUG_MODE=true
VITE_DEBUG_LEVEL=basic
```

Run `npm run dev:client` from the root (or `npm run dev` to also start Express).
Dependencies must already be installed; otherwise run `npm install` at the root
and in each app directory first. Open the URL Vite prints. Restart Vite whenever
you change env settings. To disable, set `VITE_DEBUG_MODE=false` or remove the
setting, then restart. The default is disabled. Production builds ignore
`VITE_DEBUG_MODE=true`; the inspector is excluded from the production bundle.
No server logging bridge or new dependency is involved.

| Level | Observations |
| --- | --- |
| `basic` (default) | Tool changes, drawing start/completion and final points, line creation, object removal, explicitly reported errors |
| `detailed` | Basic plus down/up/leave coordinates, line coordinate changes, committed React drawing changes, sampled drawing ref observations |
| `verbose` | Detailed plus movement including idle hover |

Invalid levels fall back to Basic. Movement, coordinate logs, and inspector
pointer notifications are sampled at most once per 100 ms. Start, completion,
creation and removal events are not throttled. A trailing pointer notification
retains the latest position. Sampling observations never limits drawing updates.

## Read the console

Open browser DevTools (F12), select Console, and enable normal log messages.
Each structured entry has an ISO timestamp, category, event, origin, and values
snapshotted when logged. Expand its values to see the complete points array.
Educational LEARN messages are emitted once per explanation per module lifetime,
so they do not repeat on every movement. A reload resets the explanations.

| Category | Meaning |
| --- | --- |
| KONVA | Public stage event observations, normalized to pointerdown/move/up/leave; nativeEvent identifies the actual mouse/touch/pointer source |
| TOOL | Application tool selection and drawing operation transitions |
| CANVAS | Application line creation, coordinate changes, completion and removal |
| REACT | Observed committed state and sampled drawing-ref values, not every render |
| LEARN | Educational explanation of the event and its consequences |
| API | Reserved for future explicit request instrumentation |
| ERROR | Explicit diagnostic errors, using console.error |

`origin` distinguishes `konva-event`, `application`, and `inferred`. Line creation
means an object appeared in committed application data; it does not claim to
inspect Konva's internal constructor or rasterization. There is no global error
interception, automatic network logging, or database logging.

## Live inspector

The lower-right panel shows the active tool, sampled stage pointer position,
drawing ref, latest committed line's start and endpoint, points, and object count.
Click its heading (or focus it and press Enter) to collapse/expand. The body is
read-only and passes pointer interactions through to the canvas. The heading
necessarily accepts clicks to collapse; draw outside the heading.

Before the first line, line fields show Unavailable. After completion they keep
the latest line, with Drawing State Idle. Pointer Position is independent of the
endpoint: hovering does not extend a line, and leaving shows Unavailable. The
full points array is in the DOM and console; long arrays are visually clipped
to keep the panel small. Temporary Preview is unavailable in the current tools.
Clear empties line data; it does not reset the existing application's drawing ref.

## Walkthrough: follow a stroke

1. Select Brush. TOOL reports the change in React's `tool` state (the initial
   tool is reported when the inspector mounts).
2. Press at `(100,100)`. The existing mouse/touch handler sets `isDrawing.current`
   to true and schedules a line with `[100,100]`. TOOL reports Drawing started
   and, in Detailed, KONVA reports the public event coordinates. After React
   commits, CANVAS reports Line created and REACT reports the object count.
3. Move to `(250,200)` while held. The existing handler appends coordinates. With
   one move, points become `[100,100,250,200]`; additional moves add more pairs.
   Detailed reports sampled coordinate changes; Verbose also reports movement.
   The inspector shows In Progress, the first pair and latest pair. React-Konva
   receives these points as Line props and updates the rendered shape.
4. Release. The ref becomes false. TOOL reports completion and CANVAS reports
   the final committed points. Release does not append a point, so the endpoint
   remains the last movement position. The inspector becomes Idle.
5. Select Eraser and draw: object count grows even though pixels disappear.
   Press Clear: CANVAS reports removed objects and the inspector becomes empty.

Stage coordinates are pixels relative to its top-left. This application's stage
and layer are untransformed, so those coordinates are also appropriate for the
Line points. If future code transforms the stage/layer, instrumentation must
distinguish stage pointer coordinates from local drawing coordinates.

For Sprint 2, a future two-click tool could store `[x1,y1,x2,y2]` to describe a
single straight segment. Instrument its actual start, preview and completion
transitions after that tool exists; do not infer those states from idle hovering.
Event order may vary with React batching. The current operation starts even when
Konva cannot provide a position, because that is what the existing handler does.
Leaving the canvas does not finish the operation; this debugger preserves that
existing behavior. It does not repair release-outside-canvas handling.

## Debug browser JavaScript in VS Code on Windows

1. Start Vite in a terminal using the command above.
2. Open Run and Debug, choose **Graffiti: debug Vite in Edge** (or Chrome), and
   press F5. Install the chosen browser if necessary. The included launch.json
   uses VS Code's built-in JavaScript debugger and Vite's development source maps.
3. If Vite chose a different port because 5173 is busy, change `url` in launch.json
   to the printed URL. The configuration assumes the repo root is open in VS Code.
4. Set a breakpoint in `App.tsx` on `isDrawing.current = true`, on
   `lastLine.points = ...`, or on `isDrawing.current = false`.
5. Interact with the canvas, inspect `pos`, `point`, `tool`, and `prevLines` in
   Variables/Watch, then use F10 to step or F5 to continue. A breakpoint inside a
   state updater may fire more than once in development Strict Mode.
6. View messages in browser Console or the VS Code Debug Console associated with
   the launched browser. The Vite terminal runs a separate Node process; browser
   console messages do not automatically appear there. Server breakpoints are a
   separate workflow.

## Files and integration points

Search VS Code globally for `DEBUG LEARNING MODE` (Ctrl+Shift+F), or run:

```powershell
rg -n "DEBUG LEARNING MODE" app/client/src app/client/.env.example .vscode docs
```

- `app/client/src/App.tsx`: marked imports/lazy loading, down/move/up observation,
  pointer-leave observation, and inspector mounting. Drawing updater logic stays
  unchanged, and logs are kept outside updater callbacks.
- `app/client/src/debug/learningMode.ts`: environment guard, levels, structured
  console utility, one-time explanations, throttling and pointer subscriptions.
- `app/client/src/debug/LearningInspector.tsx`: committed tool/line observation
  effects and read-only live fields from props and sampled events.
- `app/client/src/debug/learningInspector.css`: panel appearance and pointer pass-through.
- `app/client/src/debug/learningMode.test.mjs`: guard, level, snapshot and sampling tests using Node's test runner.
- `app/client/.env.example`: opt-in configuration template.
- `.vscode/launch.json`: commented browser launch configurations (JSONC).
- `docs/developer-learning-mode.md`: this guide.

## Add future events

Use the shared logger only at actual integration points and mark the call with
the same comment convention. Prefer committed state observation to logs inside
React updaters. Pass small plain values, not event objects, credentials, tokens,
request bodies, or personally identifying information.

```ts
// DEBUG LEARNING MODE: Observe a future tool's committed result without
// changing its shape data or claiming to inspect Konva internals.
if (import.meta.env.DEV && DEBUG_ENABLED) {
  debugLog("CANVAS", "Shape committed", { points }, {
    level: "basic",
    origin: "application",
    explanation: "The tool stores coordinates; React-Konva receives them as shape props.",
  });
}
```

Use Detailed for previews/coordinates and Verbose for noisy diagnostics. Set
`throttleMs: 100` for high-frequency logs. API, text, stamping, database and
multiplayer instrumentation can use the same utility when implemented; they
are not implemented by this task.

## Verification

Run `npm --prefix app/client run lint`, `npm --prefix app/client run build`, and
`node --test app/client/src/debug/learningMode.test.mjs`. If PowerShell blocks
`npm.ps1`, use `npm.cmd` instead of `npm` for the documented commands.
There was no existing automated drawing test suite. In a browser, verify disabled
mode, all three levels, brush/eraser, Clear, Export, touch, leave/release behavior,
panel collapse and drawing through its body. Check one-time explanations and
that movement does not flood the console. Test the VS Code launch with a bound
breakpoint. Build with `VITE_DEBUG_MODE=true`, then preview: no inspector or
learning messages should appear. The runtime/browser and VS Code checks require
interactive validation; compilation alone cannot establish them.
