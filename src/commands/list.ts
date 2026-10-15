import { loadAccounts, tildify } from "../accounts";
import { authStatus } from "../claude";

export function listCommand(): number {
  const rows = loadAccounts().map((account) => {
    const status = authStatus(account);
    return [
      account.name + (account.isDefault ? " (default)" : ""),
      status?.loggedIn ? (status.email ?? "") : "not logged in",
      status?.loggedIn ? (status.orgName ?? "") : "",
      tildify(account.dir),
    ];
  });
  printTable([["ACCOUNT", "EMAIL", "ORGANIZATION", "FOLDER"], ...rows]);
  return 0;
}

function printTable(rows: string[][]): void {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i].length)));
  for (const row of rows) console.log(row.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd());
}
