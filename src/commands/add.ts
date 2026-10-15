import { copyFileSync, existsSync, mkdirSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import * as p from "@clack/prompts";
import { checkNewName, loadAccounts, saveAccounts, validateName, type Account } from "../accounts";
import { DEFAULT_HARNESS, HARNESS_IDS, allHarnesses, getHarness, type Harness } from "../harness";
import { onPath, tildify } from "../paths";
import { authStatus, runTool } from "../process";
import { busy } from "../spinner";

export interface AddOptions {
  /** Which coding agent the account is for. The command asks when it isn't given; addAccount uses Claude Code. */
  agent?: string;
  dir?: string;
  share: boolean;
  login: boolean;
}

export function addAccount(name: string, options: AddOptions): Account {
  validateName(name);
  const accounts = loadAccounts();
  if (accounts.some((a) => a.name === name)) throw new Error(`There's already an account named "${name}".`);

  const harness = getHarness(options.agent ?? DEFAULT_HARNESS);
  const dir = resolve(options.dir ?? harness.newAccountDir(name));
  // Adopting the agent's usual folder makes it that agent's primary login, which runs with its config variable
  // unset.
  const isDefault = dir === harness.defaultDir();
  const existing = accounts.find((a) => a.dir === dir);
  if (existing) throw new Error(`${tildify(dir)} is already the "${existing.name}" account.`);

  mkdirSync(dir, { recursive: true });
  if (options.share && !isDefault) {
    const source = accounts.find((a) => a.isDefault && a.harness === harness.id)?.dir ?? harness.defaultDir();
    for (const entry of [...harness.sharedLinks, ...harness.sharedCopies]) {
      const from = join(source, entry);
      const to = join(dir, entry);
      if (!existsSync(from) || existsSync(to)) continue;
      if (harness.sharedLinks.includes(entry)) symlinkSync(from, to);
      else copyFileSync(from, to);
    }
  }

  const account: Account = { name, dir, isDefault, harness: harness.id };
  saveAccounts([...accounts, account]);
  return account;
}

export async function addCommand(name: string | undefined, options: AddOptions): Promise<number> {
  if (!name) throw new Error(`Usage: handova add <name> [--agent ${HARNESS_IDS.join("|")}] [--dir <path>] [--no-share] [--no-login]`);
  checkNewName(name);
  const harness = await chooseAgent(options.agent);
  const account = addAccount(name, { ...options, agent: harness.id });
  p.log.success(`Added "${name}", a ${harness.name} account, at ${tildify(account.dir)}.`);

  if (!options.login) return 0;
  const status = await busy(authStatus(account));
  if (status?.loggedIn) {
    p.log.info(`Already logged in as ${status.email} (${status.orgName}).`);
    return 0;
  }
  p.log.step(`Log in to the "${name}" account:`);
  return runTool(account, getHarness(account.harness).loginArgs);
}

// Which agent a new account is for: the one asked for with --agent, the only one installed, or the person's choice.
// Handova never guesses when more than one agent is installed.
export async function chooseAgent(asked: string | undefined): Promise<Harness> {
  if (asked) {
    const harness = getHarness(asked);
    if (!onPath(harness.bin())) throw new Error(`${harness.name} isn't installed (looked for "${harness.bin()}"). Install it first.`);
    return harness;
  }
  const installed = allHarnesses().filter((harness) => onPath(harness.bin()));
  if (!installed.length) throw new Error("Neither Claude Code nor Codex is installed. Install one first.");
  if (installed.length === 1) return installed[0];
  if (!process.stdin.isTTY) {
    throw new Error(`Which agent is this account for? Run it again with ${installed.map((h) => `--agent ${h.id}`).join(" or ")}.`);
  }
  const choice = await p.select({
    message: "Which agent is this account for?",
    options: installed.map((harness) => ({ value: harness.id, label: harness.name })),
  });
  if (p.isCancel(choice)) throw new Error("Cancelled. Nothing was added.");
  return getHarness(choice);
}
