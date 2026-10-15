import { expect, test } from "bun:test";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getAccount } from "../src/accounts";
import { addAccount } from "../src/commands/add";
import { projectKey } from "../src/harness/claude";
import { handoff, mergeMemory } from "../src/handoff";
import { sessionLines, tempHome, write } from "./helpers";

const CWD = "/Users/me/Code/app";

function setup() {
  const home = tempHome();
  addAccount("work", { share: false, login: false });
  const src = join(home, ".claude", "projects", projectKey(CWD));
  const dst = join(home, ".claude-work", "projects", projectKey(CWD));
  write(join(src, "abc.jsonl"), sessionLines(CWD, "build the thing"));
  write(join(src, "abc", "subagents", "agent-1.jsonl"), "{}\n");
  write(join(src, "memory", "MEMORY.md"), "- [A](a.md) — a\n");
  write(join(src, "memory", "a.md"), "fact a");
  const run = () => handoff({ from: getAccount("personal"), to: getAccount("work"), cwd: CWD, memory: true });
  return { src, dst, run };
}

test("hands the session, its subagents and memory to an empty account", () => {
  const { dst, run } = setup();
  const result = run();
  expect(result.sessionStatus).toBe("copied");
  expect(result.session.firstPrompt).toBe("build the thing");
  expect(existsSync(join(dst, "abc.jsonl"))).toBe(true);
  expect(existsSync(join(dst, "abc", "subagents", "agent-1.jsonl"))).toBe(true);
  expect(readFileSync(join(dst, "memory", "a.md"), "utf8")).toBe("fact a");
});

test("running it again changes nothing, and a longer source brings the copy up to date", () => {
  const { src, dst, run } = setup();
  run();
  expect(run().sessionStatus).toBe("unchanged");
  appendFileSync(join(src, "abc.jsonl"), sessionLines(CWD, "more"));
  expect(run().sessionStatus).toBe("updated");
  expect(readFileSync(join(dst, "abc.jsonl"), "utf8")).toBe(readFileSync(join(src, "abc.jsonl"), "utf8"));
});

test("refuses to overwrite a copy that was continued on the target", () => {
  const { dst, run } = setup();
  run();
  appendFileSync(join(dst, "abc.jsonl"), sessionLines(CWD, "work-only reply"));
  const before = readFileSync(join(dst, "abc.jsonl"), "utf8");
  // The source moves on too, so the two have diverged.
  appendFileSync(join(dst, "..", "..", "..", ".claude", "projects", projectKey(CWD), "abc.jsonl"), "x\n");
  expect(run).toThrow(/diverged/);
  expect(readFileSync(join(dst, "abc.jsonl"), "utf8")).toBe(before);
});

test("says so when the target copy is already further along", () => {
  const { dst, run } = setup();
  run();
  appendFileSync(join(dst, "abc.jsonl"), sessionLines(CWD, "work-only reply"));
  expect(run).toThrow(/already further along on "work"/);
});

test("errors clearly when the folder has no sessions", () => {
  const { run } = setup();
  expect(() => handoff({ from: getAccount("personal"), to: getAccount("work"), cwd: "/nope", memory: true })).toThrow(
    /No sessions/,
  );
  expect(run).not.toThrow();
});

test("mergeMemory never overwrites, and appends missing index lines", () => {
  const home = tempHome();
  const src = join(home, "src");
  const dst = join(home, "dst");
  write(join(src, "MEMORY.md"), "- [A](a.md) — a\n- [B](b.md) — b\n");
  write(join(src, "a.md"), "new a");
  write(join(src, "b.md"), "b");
  write(join(src, "same.md"), "same");
  write(join(dst, "MEMORY.md"), "- [A](a.md) — a\n- [C](c.md) — c");
  write(join(dst, "a.md"), "old a");
  write(join(dst, "same.md"), "same");

  const result = mergeMemory(src, dst);
  expect(result).toEqual({ copied: ["b.md"], conflicts: ["a.md"], indexLinesAdded: 1 });
  expect(readFileSync(join(dst, "a.md"), "utf8")).toBe("old a");
  expect(readFileSync(join(dst, "MEMORY.md"), "utf8")).toBe("- [A](a.md) — a\n- [C](c.md) — c\n- [B](b.md) — b\n");
});

test("refuses to hand off between accounts of different agents", () => {
  setup();
  const other = { ...getAccount("work"), harness: "codex" };
  expect(() => handoff({ from: getAccount("personal"), to: other, cwd: CWD, memory: true })).toThrow(/isn't supported yet/);
});
