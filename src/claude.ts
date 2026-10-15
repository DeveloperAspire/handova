import { spawn, spawnSync } from "node:child_process";
import { constants } from "node:os";
import { type Account, envFor } from "./accounts";

export interface AuthStatus {
  loggedIn: boolean;
  email?: string;
  orgName?: string;
  subscriptionType?: string;
}

const claude = () => process.env.CCHANDOVER_CLAUDE_BIN || "claude";

export function claudeInstalled(): string | undefined {
  const result = spawnSync(claude(), ["--version"], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

export function authStatus(account: Account): AuthStatus | undefined {
  const result = spawnSync(claude(), ["auth", "status", "--json"], { encoding: "utf8", env: envFor(account) });
  try {
    return JSON.parse(result.stdout);
  } catch {
    return undefined;
  }
}

// Runs claude in this terminal and resolves with its exit code. Ctrl-C reaches
// claude directly (same terminal), and claude uses it to interrupt a reply, so
// cchandover must ignore it rather than exit and hand the prompt back mid-session.
export function runClaude(account: Account, args: string[], cwd = process.cwd()): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(claude(), args, { stdio: "inherit", env: envFor(account), cwd });
    const ignore = () => {};
    const forward = (signal: NodeJS.Signals) => child.kill(signal);
    process.on("SIGINT", ignore).on("SIGQUIT", ignore).on("SIGTERM", forward).on("SIGHUP", forward);

    const cleanup = () => {
      process.off("SIGINT", ignore).off("SIGQUIT", ignore).off("SIGTERM", forward).off("SIGHUP", forward);
    };
    child.on("error", () => {
      cleanup();
      reject(new Error(`Couldn't start Claude Code (${claude()}). Is it installed and on your PATH?`));
    });
    child.on("exit", (code, signal) => {
      cleanup();
      resolve(code ?? 128 + (signal ? constants.signals[signal] : 1));
    });
  });
}
