import { loadAccounts } from "../accounts";
import { getHarness } from "../harness";
import { tildify } from "../paths";
import { authStatus } from "../process";

export function listCommand(): number {
  const accounts = loadAccounts();
  if (!accounts.length) {
    console.log("No accounts yet. Install Claude Code or Codex, or add one with: handova add <name> [--agent codex]");
    return 0;
  }
  const rows = accounts.map((account) => {
    const harness = getHarness(account.harness);
    const status = authStatus(account);
    // No status at all means the agent couldn't be run, which is different from being logged out.
    const login = !status ? `can't run "${harness.bin()}"` : status.loggedIn ? (status.email ?? "") : "not logged in";
    return [
      account.name + (account.isDefault ? " (default)" : ""),
      harness.name,
      login,
      status?.loggedIn ? (status.orgName ?? "") : "",
      tildify(account.dir),
    ];
  });
  printTable([["ACCOUNT", "AGENT", "EMAIL", "ORGANIZATION", "FOLDER"], ...rows]);
  return 0;
}

function printTable(rows: string[][]): void {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i].length)));
  for (const row of rows) console.log(row.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd());
}
