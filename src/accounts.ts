import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_HARNESS, getHarness } from "./harness";
import { home } from "./paths";

export interface Account {
  name: string;
  dir: string;
  isDefault: boolean;
  /** Which coding tool the account is for. Registries written before this field existed are all Claude Code. */
  harness: string;
}

interface Registry {
  accounts: Account[];
}

export const RESERVED_NAMES = ["add", "list", "handoff", "remove", "doctor", "shell-init", "help", "version"];

export function registryPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME || join(home(), ".config");
  return join(configHome, "handova", "accounts.json");
}

// Until something is saved, the registry holds just the default account.
export function loadAccounts(): Account[] {
  const file = registryPath();
  if (!existsSync(file)) {
    return [{ name: "personal", dir: getHarness(DEFAULT_HARNESS).defaultDir(), isDefault: true, harness: DEFAULT_HARNESS }];
  }
  const registry: Registry = JSON.parse(readFileSync(file, "utf8"));
  return registry.accounts.map((account) => ({ ...account, harness: account.harness ?? DEFAULT_HARNESS }));
}

export function saveAccounts(accounts: Account[]): void {
  const file = registryPath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ accounts } satisfies Registry, null, 2) + "\n");
}

export function getAccount(name: string): Account {
  const account = loadAccounts().find((a) => a.name === name);
  if (!account) {
    const names = loadAccounts().map((a) => a.name).join(", ");
    throw new Error(`No account named "${name}". Accounts: ${names}. Add one with: handova add ${name}`);
  }
  return account;
}

export function validateName(name: string): void {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new Error(`"${name}" isn't a valid account name. Use lowercase letters, digits and dashes.`);
  }
  if (RESERVED_NAMES.includes(name)) {
    throw new Error(`"${name}" is a handova command, so it can't be an account name.`);
  }
}

