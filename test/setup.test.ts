import { expect, test } from "bun:test";
import { join } from "node:path";
import { addPrimary, loadAccounts, savedAccounts } from "../src/accounts";
import { addAccount, chooseAgent } from "../src/commands/add";
import { removeCommand } from "../src/commands/remove";
import { getHarness } from "../src/harness";
import { busy } from "../src/spinner";
import { tempHome } from "./helpers";

test("the primary login gets the name the person chose, and agents not chosen stay off the list", () => {
  const home = tempHome();
  expect(savedAccounts()).toEqual([]);
  addPrimary(getHarness("claude"), "main");
  expect(loadAccounts()).toEqual([{ name: "main", dir: join(home, ".claude"), isDefault: true, harness: "claude" }]);
});

test("on a first run the detected names don't block the person's choice", () => {
  tempHome();
  // primary and codex are detected (not saved), so they're free to use.
  addPrimary(getHarness("claude"), "primary");
  addPrimary(getHarness("codex"), "codex");
  expect(loadAccounts().map((a) => a.name)).toEqual(["primary", "codex"]);
  expect(() => addPrimary(getHarness("codex"), "primary")).toThrow(/already an account/);
  expect(() => addPrimary(getHarness("codex"), "Primary")).toThrow(/valid account name/);
});

test("naming a primary login again replaces its old entry instead of adding a second one", async () => {
  tempHome();
  addPrimary(getHarness("claude"), "main");
  addAccount("work", { share: false, login: false });
  await removeCommand("main", { purge: false, yes: true });
  addPrimary(getHarness("claude"), "primary");
  expect(loadAccounts().map((a) => [a.name, a.isDefault])).toEqual([
    ["work", false],
    ["primary", true],
  ]);
});

test("add picks the only installed agent, and never guesses when there are two", async () => {
  tempHome();
  // Both fake agents are installed and there's no one to ask. Said explicitly, so the test behaves the same when
  // it runs in a real terminal (where Handova would ask).
  const canAsk = false;
  await expect(chooseAgent(undefined, canAsk)).rejects.toThrow(/--agent claude or --agent codex/);
  expect((await chooseAgent("codex", canAsk)).id).toBe("codex");

  process.env.HANDOVA_CODEX_BIN = "/not/installed/codex";
  expect((await chooseAgent(undefined, canAsk)).id).toBe("claude");
  await expect(chooseAgent("codex", canAsk)).rejects.toThrow(/Codex isn't installed/);

  process.env.HANDOVA_CLAUDE_BIN = "/not/installed/claude";
  await expect(chooseAgent(undefined, canAsk)).rejects.toThrow(/Neither Claude Code nor Codex is installed/);
});

test("the spinner stays out of the way when there's no terminal", async () => {
  expect(await busy(Promise.resolve(42))).toBe(42);
  await expect(busy(Promise.reject(new Error("boom")))).rejects.toThrow("boom");
});
