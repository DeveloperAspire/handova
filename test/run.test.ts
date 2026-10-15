import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAccount } from "../src/accounts";
import { runTool } from "../src/process";
import { tempHome } from "./helpers";

// Ctrl-C goes to both handova and claude. Claude uses it to interrupt a reply and
// keeps running, so handova must keep running too and wait for it.
test("survives Ctrl-C while claude runs, and returns claude's exit code", async () => {
  const home = tempHome();
  const running = runTool(getAccount("personal"), ["sleep"]);
  await Bun.sleep(300);
  process.kill(process.pid, "SIGINT");
  expect(await running).toBe(0);
  expect(readFileSync(join(home, "claude-calls.log"), "utf8")).toContain("finished");
});

test("fails clearly when claude isn't installed", async () => {
  tempHome();
  process.env.HANDOVA_CLAUDE_BIN = "/no/such/claude";
  await expect(runTool(getAccount("personal"), [])).rejects.toThrow(/Couldn't start Claude Code/);
});
