import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export const FAKE_CLAUDE = join(import.meta.dir, "fixtures", "fake-claude.sh");
export const FAKE_CODEX = join(import.meta.dir, "fixtures", "fake-codex.sh");

// A throwaway HOME, so tests never touch the real ~/.claude.
export function tempHome(): string {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "handova-test-")));
  process.env.HOME = home;
  delete process.env.XDG_CONFIG_HOME;
  delete process.env.CLAUDE_CONFIG_DIR;
  delete process.env.CODEX_HOME;
  process.env.HANDOVA_CLAUDE_BIN = FAKE_CLAUDE;
  process.env.HANDOVA_CODEX_BIN = FAKE_CODEX;
  return home;
}

export function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

export function sessionLines(cwd: string, prompt: string): string {
  return (
    JSON.stringify({ type: "user", cwd, message: { role: "user", content: prompt } }) +
    "\n" +
    JSON.stringify({ type: "assistant", cwd, message: { role: "assistant", content: "ok" } }) +
    "\n"
  );
}

// A Codex rollout the way Codex 0.162 writes it: session_meta first, then response items.
export function rolloutLines(id: string, cwd: string, prompt: string): string {
  return [
    { type: "session_meta", payload: { id, session_id: id, cwd } },
    { type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "<environment_context>…</environment_context>" }] } },
    { type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: prompt }] } },
  ]
    .map((record) => JSON.stringify(record))
    .join("\n") + "\n";
}
