import { rmSync } from "node:fs";
import * as p from "@clack/prompts";
import { getAccount, loadAccounts, saveAccounts, tildify } from "../accounts";
import { runClaude } from "../claude";
import { confirm } from "../prompt";

export interface RemoveOptions {
  purge: boolean;
  yes: boolean;
}

export async function removeCommand(name: string | undefined, options: RemoveOptions): Promise<number> {
  if (!name) throw new Error("Usage: ccswap remove <name> [--purge] [--yes]");
  const account = getAccount(name);
  if (account.isDefault) throw new Error(`"${name}" is the default account (~/.claude) and can't be removed.`);

  if (options.purge && !options.yes) {
    const ok = await confirm(
      `Log out of "${name}" and delete ${tildify(account.dir)}, including its sessions and memory?`,
    );
    if (!ok) return 1;
  }

  saveAccounts(loadAccounts().filter((a) => a.name !== name));
  if (!options.purge) {
    p.log.success(`Removed "${name}". Its folder ${tildify(account.dir)} and login were kept.`);
    return 0;
  }
  await runClaude(account, ["auth", "logout"]);
  rmSync(account.dir, { recursive: true, force: true });
  p.log.success(`Removed "${name}", logged it out and deleted ${tildify(account.dir)}.`);
  return 0;
}
