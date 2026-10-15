import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export const FAKE_CLAUDE = join(import.meta.dir, "fixtures", "fake-claude.sh");

// A throwaway HOME, so tests never touch the real ~/.claude.
export function tempHome(): string {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "cchandover-test-")));
  process.env.HOME = home;
  delete process.env.XDG_CONFIG_HOME;
  delete process.env.CLAUDE_CONFIG_DIR;
  process.env.CCHANDOVER_CLAUDE_BIN = FAKE_CLAUDE;
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
