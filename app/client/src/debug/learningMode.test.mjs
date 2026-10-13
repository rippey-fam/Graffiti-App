/**
 * DEBUG LEARNING MODE
 * Dependency-free Node tests for opt-in/production guards, levels, immutable
 * console snapshots, and sampling. TypeScript is already a project dependency.
 * Browser canvas rendering and VS Code breakpoints still need manual checks.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("./learningMode.ts", import.meta.url), "utf8");
let moduleId = 0;
async function load({ dev = true, enabled = "true", level = "basic" } = {}) {
  // Each import isolates module state. Substitute only Vite's compile-time env
  // inputs; execute the actual logger/store implementation rather than a copy.
  const configured = source
    .replaceAll("import.meta.env.DEV", JSON.stringify(dev))
    .replaceAll("import.meta.env.VITE_DEBUG_MODE", JSON.stringify(enabled))
    .replaceAll("import.meta.env.VITE_DEBUG_LEVEL", JSON.stringify(level));
  const { outputText } = ts.transpileModule(configured, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  });
  return import(`data:text/javascript,${encodeURIComponent(outputText)}#${moduleId++}`);
}

test("environment guards and level filtering keep opt-in behavior", async () => {
  const entries = [];
  const original = console.log;
  console.log = (...args) => entries.push(args);
  try {
    for (const config of [{ enabled: "false" }, { enabled: "" }, { enabled: "TRUE" }, { dev: false }]) {
      const mode = await load(config);
      assert.equal(mode.DEBUG_ENABLED, false);
      mode.debugLog("CANVAS", "Should be silent");
      mode.observePointer("down", { x: 5, y: 6 }, true, "mousedown");
      assert.deepEqual(mode.getPointerObservation(), { pointer: null, drawing: false });
    }
    assert.equal(entries.length, 0);
    for (const [level, expected] of [["basic", 1], ["detailed", 2], ["verbose", 3], ["VERBOSE", 3], ["invalid", 1], ["__proto__", 1]]) {
      entries.length = 0;
      const mode = await load({ level });
      for (const eventLevel of ["basic", "detailed", "verbose"]) {
        mode.debugLog("REACT", eventLevel, {}, { level: eventLevel });
      }
      assert.equal(entries.length, expected);
    }
  } finally { console.log = original; }
});

test("structured snapshots, one-time explanations, throttling, and error routing", async () => {
  const entries = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args) => entries.push(args);
  console.error = (...args) => errors.push(args);
  try {
    const mode = await load({ level: "verbose" });
    const points = [100, 100, 250, 200];
    mode.debugLog("CANVAS", "Line", { points }, { explanation: "Two point pairs." });
    points[0] = 999;
    mode.debugLog("CANVAS", "Line", {}, { explanation: "Two point pairs." });
    assert.deepEqual(entries[0][1].values.points, [100, 100, 250, 200]);
    assert.equal(entries.filter((entry) => entry[1].category === "LEARN").length, 1);
    assert.equal(entries[0][1].origin, "application");
    assert.ok(!Number.isNaN(Date.parse(entries[0][1].timestamp)));
    for (let i = 0; i < 20; i++) mode.debugLog("KONVA", "move", { i }, { throttleMs: 100 });
    assert.equal(entries.filter((entry) => entry[1].event === "move").length, 1);
    mode.debugLog("ERROR", "Test error", { code: "EXAMPLE" });
    assert.equal(errors.length, 1);
  } finally { console.log = originalLog; console.error = originalError; }
});

test("pointer sampling retains trailing values and boundaries cancel stale updates", async () => {
  const original = console.log;
  console.log = () => {};
  let unsubscribe;
  try {
    const mode = await load();
    let updates = 0;
    unsubscribe = mode.subscribePointer(() => updates++);
    mode.observePointer("down", { x: 1, y: 2 }, true, "mousedown");
    for (let i = 3; i <= 20; i++) mode.observePointer("move", { x: i, y: i }, true, "mousemove");
    assert.equal(updates, 1);
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.equal(updates, 2);
    assert.deepEqual(mode.getPointerObservation(), { pointer: { x: 20, y: 20 }, drawing: true });
    mode.observePointer("move", { x: 30, y: 30 }, true, "mousemove");
    mode.observePointer("up", { x: 40, y: 40 }, false, "mouseup");
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.equal(updates, 3);
    assert.deepEqual(mode.getPointerObservation(), { pointer: { x: 40, y: 40 }, drawing: false });
    mode.observePointer("leave", null, false, "pointerleave");
    assert.equal(mode.getPointerObservation().pointer, null);
  } finally { unsubscribe?.(); console.log = original; }
});
