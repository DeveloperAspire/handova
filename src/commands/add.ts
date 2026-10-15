import { copyFileSync, existsSync, mkdirSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import * as p from "@clack/prompts";
import { loadAccounts, saveAccounts, tildify, validateName, type Account } from "../accounts";
import { authStatus, runClaude } from "../claude";
import { home } from "../claude-paths";

// Shared by symlink, so edits show up in every account.
const LINKED = ["CLAUDE.md", "skills", "agents", "commands"];
// Copied, so each account can change its own.
const COPIED = ["settings.json"];

export interface AddOptions {
  dir?: string;
  share: boolean;
  login: boolean;
}

export function addAccount(name: string, options: AddOptions): Account {
  validateName(name);
  const accounts = loadAccounts();
  if (accounts.some((a) => a.name === name)) throw new Error(`There's already an account named "${name}".`);

  const dir = resolve(options.dir ?? join(home(), `.claude-${name}`));
  const existing = accounts.find((a) => a.dir === dir);
  if (existing) throw new Error(`${tildify(dir)} is already the "${existing.name}" account.`);

  mkdirSync(dir, { recursive: true });
  if (options.share) {
    const source = accounts.find((a) => a.isDefault)!.dir;
    for (const entry of [...LINKED, ...COPIED]) {
      const from = join(source, entry);
      const to = join(dir, entry);
      if (!existsSync(from) || existsSync(to)) continue;
      if (LINKED.includes(entry)) symlinkSync(from, to);
      else copyFileSync(from, to);
    }
  }

  const account: Account = { name, dir, isDefault: false };
  saveAccounts([...accounts, account]);
  return account;
}

export async function addCommand(name: string | undefined, options: AddOptions): Promise<number> {
  if (!name) throw new Error("Usage: cchandover add <name> [--dir <path>] [--no-share] [--no-login]");
  const account = addAccount(name, options);
  p.log.success(`Added "${name}" at ${tildify(account.dir)}.`);

  if (!options.login) return 0;
  const status = authStatus(account);
  if (status?.loggedIn) {
    p.log.info(`Already logged in as ${status.email} (${status.orgName}).`);
    return 0;
  }
  p.log.step(`Log in to the "${name}" account:`);
  return runClaude(account, ["auth", "login"]);
}
