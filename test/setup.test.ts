import { expect, test } from "bun:test";
import { join } from "node:path";
import { ensureNormalLogins, loadAccounts } from "../src/accounts";
import { addAccount } from "../src/commands/add";
import { removeCommand } from "../src/commands/remove";
import { getHarness } from "../src/harness";
import { busy } from "../src/spinner";
import { tempHome } from "./helpers";

test("first-run setup saves only the agents that were chosen", () => {
  tempHome();
  ensureNormalLogins([getHarness("codex")]);
  expect(loadAccounts().map((a) => a.name)).toEqual(["codex"]);
});

test("running setup again keeps existing accounts and adds back a removed normal login", async () => {
  const home = tempHome();
  addAccount("work", { share: false, login: false });
  await removeCommand("personal", { purge: false, yes: true });
  ensureNormalLogins([getHarness("claude"), getHarness("codex")]);
  expect(loadAccounts().map((a) => [a.name, a.dir])).toEqual([
    ["codex", join(home, ".codex")],
    ["work", join(home, ".claude-work")],
    ["personal", join(home, ".claude")],
  ]);
});

test("a normal login whose usual name is taken gets a -main name", () => {
  tempHome();
  ensureNormalLogins([getHarness("claude")]);
  addAccount("codex", { share: false, login: false });
  ensureNormalLogins([getHarness("codex")]);
  expect(loadAccounts().find((a) => a.harness === "codex" && a.isDefault)?.name).toBe("codex-main");
});

test("the spinner stays out of the way when there's no terminal", async () => {
  expect(await busy(Promise.resolve(42))).toBe(42);
  await expect(busy(Promise.reject(new Error("boom")))).rejects.toThrow("boom");
});
