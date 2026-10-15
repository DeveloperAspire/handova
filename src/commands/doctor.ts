import { existsSync, lstatSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { loadAccounts, tildify } from "../accounts";
import { authStatus, claudeInstalled } from "../claude";

export function doctorCommand(): number {
  let problems = 0;
  const fail = (message: string) => {
    problems++;
    p.log.error(message);
  };

  const version = claudeInstalled();
  if (version) p.log.success(`Claude Code ${version}`);
  else fail("Claude Code isn't on your PATH. Install it from https://claude.com/claude-code");

  if (process.env.CLAUDE_CONFIG_DIR) {
    p.log.warn(
      `CLAUDE_CONFIG_DIR is set in your shell (${process.env.CLAUDE_CONFIG_DIR}), so plain \`claude\` uses that account. ` +
        "cchandover sets it per account, so you can remove it from your shell profile.",
    );
  }

  for (const account of loadAccounts()) {
    const label = `${account.name} (${tildify(account.dir)})`;
    if (!existsSync(account.dir)) {
      fail(`${label}: the folder doesn't exist. Remove the account or run: cchandover ${account.name} auth login`);
      continue;
    }
    const broken = readdirSync(account.dir).filter((name) => {
      const path = join(account.dir, name);
      return lstatSync(path).isSymbolicLink() && !existsSync(path);
    });
    if (broken.length) fail(`${label}: broken links: ${broken.join(", ")}`);

    if (!version) continue;
    const status = authStatus(account);
    if (status?.loggedIn) p.log.success(`${label}: ${status.email} (${status.orgName})`);
    else fail(`${label}: not logged in. Run: cchandover ${account.name} auth login`);
  }
  return problems ? 1 : 0;
}
