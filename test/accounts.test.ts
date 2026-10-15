import { expect, test } from "bun:test";
import { existsSync, lstatSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { envFor, getAccount, loadAccounts, registryPath } from "../src/accounts";
import { addAccount } from "../src/commands/add";
import { removeCommand } from "../src/commands/remove";
import { tempHome, write } from "./helpers";

test("starts with only the default personal account, without writing anything", () => {
  const home = tempHome();
  expect(loadAccounts()).toEqual([{ name: "personal", dir: join(home, ".claude"), isDefault: true }]);
  expect(existsSync(registryPath())).toBe(false);
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
  await expect(removeCommand("personal", { purge: false, yes: true })).rejects.toThrow();
});
