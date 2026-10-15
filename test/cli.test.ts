import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tempHome } from "./helpers";

const cli = (...args: string[]) =>
  spawnSync("bun", [join(import.meta.dir, "..", "src", "cli.ts"), ...args], { encoding: "utf8", env: process.env });

// --no-<flag> is handled by Handova itself, so it works on every Node 20, not only 20.16 and later.
test("--no-<flag> turns a flag off, and unknown flags get a clear error", () => {
  const home = tempHome();
  const added = cli("add", "work", "--no-login", "--no-share");
  expect(added.status).toBe(0);
  expect(existsSync(join(home, ".claude-work"))).toBe(true);

  const bogus = cli("add", "other", "--bogus");
  expect(bogus.status).toBe(1);
  expect(bogus.stdout + bogus.stderr).toContain('Unknown option "--bogus" for handova add');
});
