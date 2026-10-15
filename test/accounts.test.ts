import { expect, test } from "bun:test";
import { existsSync, lstatSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getAccount, loadAccounts, registryPath, saveAccounts } from "../src/accounts";
import { envFor } from "../src/process";
import { addAccount } from "../src/commands/add";
import { removeCommand } from "../src/commands/remove";
import { renameCommand } from "../src/commands/rename";
import { tempHome, write } from "./helpers";

test("on first run, lists the normal login of each installed agent, without writing anything", () => {
  const home = tempHome();
  expect(loadAccounts()).toEqual([
    { name: "personal", dir: join(home, ".claude"), isDefault: true, harness: "claude" },
    { name: "codex", dir: join(home, ".codex"), isDefault: true, harness: "codex" },
  ]);
  expect(existsSync(registryPath())).toBe(false);

  process.env.HANDOVA_CODEX_BIN = "/not/installed/codex";
  expect(loadAccounts().map((a) => a.name)).toEqual(["personal"]);
  process.env.HANDOVA_CLAUDE_BIN = "/not/installed/claude";
  expect(loadAccounts()).toEqual([]);
  expect(() => getAccount("personal")).toThrow(/No accounts yet/);
});

test("add links shared files and copies settings", () => {
  const home = tempHome();
  write(join(home, ".claude", "CLAUDE.md"), "rules");
  write(join(home, ".claude", "settings.json"), "{}");
  mkdirSync(join(home, ".claude", "skills"));

  const work = addAccount("work", { share: true, login: false });
  expect(work.dir).toBe(join(home, ".claude-work"));
  expect(lstatSync(join(work.dir, "CLAUDE.md")).isSymbolicLink()).toBe(true);
  expect(lstatSync(join(work.dir, "skills")).isSymbolicLink()).toBe(true);
  expect(lstatSync(join(work.dir, "settings.json")).isSymbolicLink()).toBe(false);
  expect(existsSync(join(work.dir, "agents"))).toBe(false);
  expect(getAccount("work").dir).toBe(work.dir);
});

test("add adopts an existing folder without overwriting what's in it", () => {
  const home = tempHome();
  write(join(home, ".claude", "settings.json"), "personal");
  write(join(home, "existing", "settings.json"), "work");
  addAccount("work", { dir: join(home, "existing"), share: true, login: false });
  expect(readFileSync(join(home, "existing", "settings.json"), "utf8")).toBe("work");
});

test("add rejects bad, reserved and duplicate names", () => {
  tempHome();
  expect(() => addAccount("Work", { share: false, login: false })).toThrow();
  expect(() => addAccount("list", { share: false, login: false })).toThrow();
  addAccount("work", { share: false, login: false });
  expect(() => addAccount("work", { share: false, login: false })).toThrow();
});

test("the default account runs with CLAUDE_CONFIG_DIR unset", () => {
  const home = tempHome();
  process.env.CLAUDE_CONFIG_DIR = "/leaked";
  addAccount("work", { share: false, login: false });
  expect(envFor(getAccount("personal")).CLAUDE_CONFIG_DIR).toBeUndefined();
  expect(envFor(getAccount("work")).CLAUDE_CONFIG_DIR).toBe(join(home, ".claude-work"));
});

test("remove without --purge keeps the folder", async () => {
  const home = tempHome();
  addAccount("work", { share: false, login: false });
  await removeCommand("work", { purge: false, yes: true });
  expect(existsSync(join(home, ".claude-work"))).toBe(true);
  expect(() => getAccount("work")).toThrow();
});

test("a normal login can be taken off the list, stays off, and is never purged", async () => {
  const home = tempHome();
  write(join(home, ".claude", "settings.json"), "{}");
  await expect(removeCommand("personal", { purge: true, yes: true })).rejects.toThrow(/won't delete it/);
  await removeCommand("personal", { purge: false, yes: true });
  expect(loadAccounts().map((a) => a.name)).toEqual(["codex"]);
  expect(existsSync(join(home, ".claude", "settings.json"))).toBe(true);
});

test("rename changes only the name", () => {
  const home = tempHome();
  addAccount("work", { share: false, login: false });
  renameCommand("work", "office");
  expect(getAccount("office")).toMatchObject({ dir: join(home, ".claude-work"), harness: "claude" });
  expect(() => getAccount("work")).toThrow();
  renameCommand("personal", "main");
  expect(getAccount("main").isDefault).toBe(true);
  expect(() => renameCommand("main", "office")).toThrow(/already an account/);
  expect(() => renameCommand("main", "list")).toThrow(/command/);
  expect(() => renameCommand("nope", "x")).toThrow(/No account named/);
});

test("a registry written before harnesses existed loads every account as Claude Code", () => {
  const home = tempHome();
  write(registryPath(), JSON.stringify({ accounts: [{ name: "work", dir: join(home, ".claude-work"), isDefault: false }] }));
  expect(getAccount("work").harness).toBe("claude");
  saveAccounts(loadAccounts());
  expect(JSON.parse(readFileSync(registryPath(), "utf8")).accounts[0].harness).toBe("claude");
});
