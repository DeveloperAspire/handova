import { claude } from "./claude";
import { codex } from "./codex";
import type { Harness } from "./types";

const harnesses: Record<string, Harness> = { claude, codex };

export const DEFAULT_HARNESS = "claude";

export const HARNESS_IDS = Object.keys(harnesses);

export function allHarnesses(): Harness[] {
  return Object.values(harnesses);
}

export function getHarness(id: string): Harness {
  const harness = harnesses[id];
  if (!harness) throw new Error(`handova doesn't support "${id}" yet. Supported: ${Object.keys(harnesses).join(", ")}.`);
  return harness;
}

export type { AuthStatus, Harness, Session } from "./types";
