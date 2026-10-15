import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_HARNESS, allHarnesses, type Harness } from "./harness";
import { home, onPath } from "./paths";

export interface Account {
  name: string;
  dir: string;
  isDefault: boolean;
  /** Which coding agent the account is for. Registries written before this field existed are all Claude Code. */
  harness: string;
}

interface Registry {
  accounts: Account[];
}

export const RESERVED_NAMES = ["add", "list", "handoff", "remove", "rename", "setup", "doctor", "shell-init", "help", "version"];

export function registryPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME || join(home(), ".config");
  return join(configHome, "handova", "accounts.json");
}

// Until something is saved, the registry holds the primary login of every agent that's installed. After that the
// saved list is the source of truth, so a removed primary login stays removed.
export function loadAccounts(): Account[] {
  const file = registryPath();
  if (!existsSync(file)) {
    return allHarnesses()
      .filter((harness) => onPath(harness.bin()))
      .map((harness) => ({ name: harness.defaultAccountName, dir: harness.defaultDir(), isDefault: true, harness: harness.id }));
  }
  const registry: Registry = JSON.parse(readFileSync(file, "utf8"));
  return registry.accounts.map((account) => ({ ...account, harness: account.harness ?? DEFAULT_HARNESS }));
}

// Accounts the person has actually saved. Unlike loadAccounts, this is empty on a first run.
export function savedAccounts(): Account[] {
  return existsSync(registryPath()) ? loadAccounts() : [];
}

// Puts an agent's primary login (its usual folder) on the list under the name the person chose. On a first run the
// list starts empty, so agents that weren't chosen in setup don't appear.
export function addPrimary(harness: Harness, name: string): Account {
  checkNewName(name, savedAccounts());
  const account: Account = { name, dir: harness.defaultDir(), isDefault: true, harness: harness.id };
  saveAccounts([...savedAccounts().filter((a) => a.dir !== account.dir), account]);
  return account;
}

export function saveAccounts(accounts: Account[]): void {
  const file = registryPath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ accounts } satisfies Registry, null, 2) + "\n");
}

export function getAccount(name: string): Account {
  const accounts = loadAccounts();
  const account = accounts.find((a) => a.name === name);
  if (account) return account;
  if (!accounts.length) {
    throw new Error("No accounts yet. Install Claude Code or Codex, or add an account with: handova add <name>");
  }
  const names = accounts.map((a) => a.name).join(", ");
  throw new Error(`No account named "${name}". Accounts: ${names}. Add one with: handova add ${name}`);
}

// Throws with a sentence a person can act on if the name can't be used for a new account.
export function checkNewName(name: string, existing: Account[] = loadAccounts()): void {
  validateName(name);
  if (existing.some((a) => a.name === name)) throw new Error(`There's already an account named "${name}".`);
}

export function validateName(name: string): void {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new Error(`"${name}" isn't a valid account name. Use lowercase letters, digits and dashes.`);
  }
  if (RESERVED_NAMES.includes(name)) {
    throw new Error(`"${name}" is a handova command, so it can't be an account name.`);
  }
}

