import { existsSync, lstatSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { loadAccounts } from "../accounts";
import { getHarness } from "../harness";
import { tildify } from "../paths";
import { authStatus, installedVersion } from "../process";

export function doctorCommand(): number {
  let problems = 0;
  const fail = (message: string) => {
    problems++;
    p.log.error(message);
  };

  const accounts = loadAccounts();
  if (!accounts.length) fail("No accounts, and neither Claude Code nor Codex is installed (looked for claude and codex).");
  const installed = new Map<string, boolean>();
  for (const id of new Set(accounts.map((a) => a.harness))) {
    const harness = getHarness(id);
    const version = installedVersion(id);
    installed.set(id, Boolean(version));
    if (version) p.log.success(`${harness.name}: ${version}`);
    else fail(`${harness.name} isn't on your PATH (looked for "${harness.bin()}").`);

    if (process.env[harness.configEnv]) {
      p.log.warn(
        `${harness.configEnv} is set in your shell (${process.env[harness.configEnv]}), so ${harness.name} on its own uses that account. ` +
          "handova sets it per account, so you can remove it from your shell profile.",
      );
    }
  }

  for (const account of accounts) {
    const label = `${account.name} (${tildify(account.dir)})`;
    const login = `handova ${account.name} ${getHarness(account.harness).loginArgs.join(" ")}`;
    if (!existsSync(account.dir)) {
      fail(`${label}: the folder doesn't exist. Remove the account or run: ${login}`);
      continue;
    }
    const broken = readdirSync(account.dir).filter((name) => {
      const path = join(account.dir, name);
      return lstatSync(path).isSymbolicLink() && !existsSync(path);
    });
    if (broken.length) fail(`${label}: broken links: ${broken.join(", ")}`);

    if (!installed.get(account.harness)) continue;
    const status = authStatus(account);
    if (status?.loggedIn) {
      p.log.success(`${label}: ${[status.email, status.orgName].filter(Boolean).join(", ") || "logged in"}`);
    }
    else fail(`${label}: not logged in. Run: ${login}`);
  }
  return problems ? 1 : 0;
}
