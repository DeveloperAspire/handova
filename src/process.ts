import { spawn } from "node:child_process";
import { constants } from "node:os";
import type { Account } from "./accounts";
import { getHarness, type AuthStatus } from "./harness";
import { capture } from "./spawn";

// The default account runs with the tool's config variable unset, so it uses the tool's normal login.
export function envFor(account: Account): NodeJS.ProcessEnv {
  const { configEnv } = getHarness(account.harness);
  const env = { ...process.env };
  if (account.isDefault) delete env[configEnv];
  else env[configEnv] = account.dir;
  return env;
}

export function authStatus(account: Account): Promise<AuthStatus | undefined> {
  return getHarness(account.harness).authStatus(envFor(account));
}

export async function installedVersion(harnessId: string): Promise<string | undefined> {
  const result = await capture(getHarness(harnessId).bin(), ["--version"], process.env);
  return result.status === 0 ? result.stdout.trim() : undefined;
}

// Runs the account's tool in this terminal and resolves with its exit code. Ctrl-C reaches the tool directly
// (same terminal), and Claude Code uses it to interrupt a reply, so handova must ignore it rather than exit and
// hand the prompt back mid-session.
export function runTool(account: Account, args: string[], cwd = process.cwd()): Promise<number> {
  const harness = getHarness(account.harness);
  return new Promise((resolve, reject) => {
    const child = spawn(harness.bin(), args, { stdio: "inherit", env: envFor(account), cwd });
    const ignore = () => {};
    const forward = (signal: NodeJS.Signals) => child.kill(signal);
    process.on("SIGINT", ignore).on("SIGQUIT", ignore).on("SIGTERM", forward).on("SIGHUP", forward);

    const cleanup = () => {
      process.off("SIGINT", ignore).off("SIGQUIT", ignore).off("SIGTERM", forward).off("SIGHUP", forward);
    };
    child.on("error", () => {
      cleanup();
      reject(new Error(`Couldn't start ${harness.name} (${harness.bin()}). Is it installed and on your PATH?`));
    });
    child.on("exit", (code, signal) => {
      cleanup();
      resolve(code ?? 128 + (signal ? constants.signals[signal] : 1));
    });
  });
}
