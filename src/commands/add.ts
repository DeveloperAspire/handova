import { copyFileSync, existsSync, mkdirSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import * as p from "@clack/prompts";
import { loadAccounts, saveAccounts, validateName, type Account } from "../accounts";
import { DEFAULT_HARNESS, HARNESS_IDS, getHarness } from "../harness";
import { tildify } from "../paths";
import { authStatus, runTool } from "../process";

export interface AddOptions {
  /** Which coding agent the account is for. Defaults to Claude Code. */
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
  // Adopting the agent's normal folder makes it that agent's default account, which runs with its config
  // variable unset.
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
  const account = addAccount(name, options);
  p.log.success(`Added "${name}" at ${tildify(account.dir)}.`);

  if (!options.login) return 0;
  const status = authStatus(account);
  if (status?.loggedIn) {
    p.log.info(`Already logged in as ${status.email} (${status.orgName}).`);
    return 0;
  }
  p.log.step(`Log in to the "${name}" account:`);
  return runTool(account, getHarness(account.harness).loginArgs);
}
