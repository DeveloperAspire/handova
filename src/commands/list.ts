import { loadAccounts, type Account } from "../accounts";
import { getHarness } from "../harness";
import { tildify } from "../paths";
import { authStatus } from "../process";
import { busy } from "../spinner";

export async function listCommand(): Promise<number> {
  const accounts = loadAccounts();
  if (!accounts.length) {
    console.log("No accounts yet. Run handova setup, or add one with: handova add <name> [--agent codex]");
    return 0;
  }
  console.log(await accountTable(accounts));
  return 0;
}

// Checks every account's login at once, then lays them out as a table.
export async function accountTable(accounts: Account[]): Promise<string> {
  const statuses = await busy(Promise.all(accounts.map(authStatus)));
  const rows = accounts.map((account, i) => {
    const harness = getHarness(account.harness);
    const status = statuses[i];
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
  return formatTable([["ACCOUNT", "AGENT", "EMAIL", "ORGANIZATION", "FOLDER"], ...rows]);
}

function formatTable(rows: string[][]): string {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i].length)));
  return rows.map((row) => row.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd()).join("\n");
}
