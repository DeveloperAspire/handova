import { expect, test } from "bun:test";
import { existsSync, lstatSync, readFileSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { getAccount } from "../src/accounts";
import { addAccount } from "../src/commands/add";
import { accountInfo, codex } from "../src/harness/codex";
import { handoff } from "../src/handoff";
import { authStatus, envFor } from "../src/process";
import { rolloutLines, tempHome, write } from "./helpers";

const CWD = "/Users/me/Code/app";
const rollout = (dir: string, day: string, id: string) => join(dir, "sessions", "2026", "10", day, `rollout-2026-10-${day}T10-00-00-${id}.jsonl`);

test("listSessions finds this folder's rollouts across dated folders, newest first", () => {
  const home = tempHome();
  const dir = join(home, ".codex");
  write(rollout(dir, "14", "old"), rolloutLines("old", CWD, "first task"));
  write(rollout(dir, "15", "new"), rolloutLines("new", CWD, "second task"));
  write(rollout(dir, "15", "elsewhere"), rolloutLines("elsewhere", "/other", "not this one"));
  utimesSync(rollout(dir, "14", "old"), new Date(2020, 1, 1), new Date(2020, 1, 1));

  const sessions = codex.listSessions(dir, CWD);
  expect(sessions.map((s) => s.id)).toEqual(["new", "old"]);
  expect(sessions[0].firstPrompt).toBe("second task");
  expect(codex.listSessions(join(home, "empty"), CWD)).toEqual([]);
});

test("add --agent codex shares AGENTS.md, prompts and skills, and copies config.toml", () => {
  const home = tempHome();
  write(join(home, ".codex", "AGENTS.md"), "rules");
  write(join(home, ".codex", "config.toml"), 'model = "x"');
  write(join(home, ".codex", "prompts", "review.md"), "review");

  const work = addAccount("codex-work", { agent: "codex", share: true, login: false });
  expect(work).toMatchObject({ dir: join(home, ".codex-codex-work"), harness: "codex", isDefault: false });
  expect(lstatSync(join(work.dir, "AGENTS.md")).isSymbolicLink()).toBe(true);
  expect(lstatSync(join(work.dir, "prompts")).isSymbolicLink()).toBe(true);
  expect(lstatSync(join(work.dir, "config.toml")).isSymbolicLink()).toBe(false);
  expect(envFor(work).CODEX_HOME).toBe(work.dir);
});

test("adopting ~/.codex makes it Codex's default account, run with CODEX_HOME unset", () => {
  const home = tempHome();
  // Codex wasn't installed when the list was first saved, so its normal login isn't on it yet.
  process.env.HANDOVA_CODEX_BIN = "/not/installed/codex";
  addAccount("work", { share: false, login: false });
  process.env.CODEX_HOME = "/leaked";
  const account = addAccount("codex", { agent: "codex", dir: join(home, ".codex"), share: true, login: false });
  expect(account.isDefault).toBe(true);
  expect(envFor(account).CODEX_HOME).toBeUndefined();
});

test("authStatus reads the email and plan from a ChatGPT login's ID token", async () => {
  const home = tempHome();
  const claims = { email: "alex@mail.com", "https://api.openai.com/auth": { chatgpt_plan_type: "plus" } };
  const token = ["e30", Buffer.from(JSON.stringify(claims)).toString("base64url"), "sig"].join(".");
  write(join(home, ".codex-w", "auth.json"), JSON.stringify({ auth_mode: "chatgpt", tokens: { id_token: token } }));
  expect(accountInfo(join(home, ".codex-w"))).toEqual({ email: "alex@mail.com", orgName: "ChatGPT plus" });

  const account = addAccount("w", { agent: "codex", dir: join(home, ".codex-w"), share: false, login: false });
  expect(await authStatus(account)).toEqual({ loggedIn: true, email: "alex@mail.com", orgName: "ChatGPT plus" });
  expect(await authStatus(addAccount("x", { agent: "codex", share: false, login: false }))).toEqual({ loggedIn: false });
});

test("handoff copies a Codex rollout to the same dated path and moves no memory", () => {
  const home = tempHome();
  addAccount("a", { agent: "codex", share: false, login: false });
  addAccount("b", { agent: "codex", share: false, login: false });
  const src = rollout(join(home, ".codex-a"), "15", "s1");
  write(src, rolloutLines("s1", CWD, "fix the bug"));

  const result = handoff({ from: getAccount("a"), to: getAccount("b"), cwd: CWD, memory: true });
  expect(result.sessionStatus).toBe("copied");
  expect(result.memory).toBeUndefined();
  const dst = rollout(join(home, ".codex-b"), "15", "s1");
  expect(readFileSync(dst, "utf8")).toBe(readFileSync(src, "utf8"));
  expect(codex.listSessions(join(home, ".codex-b"), CWD).map((s) => s.id)).toEqual(["s1"]);
});

test("handoff between a Claude Code and a Codex account is refused", () => {
  tempHome();
  addAccount("cx", { agent: "codex", share: false, login: false });
  expect(() => handoff({ from: getAccount("personal"), to: getAccount("cx"), cwd: CWD, memory: true })).toThrow(
    /Claude Code account and "cx" is a Codex account/,
  );
  expect(existsSync(join(process.env.HOME!, ".codex-cx", "sessions"))).toBe(false);
});

test("the command refuses a cross-agent handoff before asking for confirmation", async () => {
  tempHome();
  addAccount("cx", { agent: "codex", share: false, login: false });
  const { handoffCommand } = await import("../src/commands/handoff");
  // No TTY and no --yes: if it asked first, this would fail with "needs a confirmation" instead.
  await expect(
    handoffCommand("personal", "cx", { pick: false, memory: true, resume: false, yes: false }),
  ).rejects.toThrow(/isn't supported yet/);
});
