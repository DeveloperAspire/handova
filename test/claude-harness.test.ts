import { expect, test } from "bun:test";
import { utimesSync } from "node:fs";
import { join } from "node:path";
import { claude, projectKey } from "../src/harness/claude";
import { sessionLines, tempHome, write } from "./helpers";

test("projectKey turns every non-alphanumeric character into a dash", () => {
  expect(projectKey("/Users/me/Code/my.app")).toBe("-Users-me-Code-my-app");
  expect(projectKey("/Users/me/a_b c")).toBe("-Users-me-a-b-c");
});

test("findProject falls back to matching the cwd recorded in sessions", () => {
  const home = tempHome();
  const config = join(home, ".claude");
  write(join(config, "projects", "shortened-name", "s1.jsonl"), sessionLines("/very/long/path", "hi"));
  expect(claude.findProject(config, "/very/long/path")).toBe(join(config, "projects", "shortened-name"));
  expect(claude.findProject(config, "/somewhere/else")).toBeUndefined();
});

test("listSessions sorts newest first and skips meta prompts", () => {
  const home = tempHome();
  const dir = join(home, "p");
  write(join(dir, "old.jsonl"), sessionLines("/x", "first task"));
  write(
    join(dir, "new.jsonl"),
    JSON.stringify({ type: "user", message: { content: "<command-name>/clear</command-name>" } }) + "\n" + sessionLines("/x", "second task"),
  );
  utimesSync(join(dir, "old.jsonl"), new Date(2020, 1, 1), new Date(2020, 1, 1));
  const sessions = claude.listSessions(dir);
  expect(sessions.map((s) => s.id)).toEqual(["new", "old"]);
  expect(sessions[0].firstPrompt).toBe("second task");
});
