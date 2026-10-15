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
  console.log(await accountTable(accounts, Boolean(process.stdout.isTTY) && !process.env.NO_COLOR));
  return 0;
}

// Checks every account's login at once, then lays them out as a boxed table.
export async function accountTable(accounts: Account[], color = false): Promise<string> {
  const statuses = await busy(Promise.all(accounts.map(authStatus)));
  const rows = accounts.map((account, i) => {
    const harness = getHarness(account.harness);
    const status = statuses[i];
    // No status at all means the agent couldn't be run, which is different from being logged out.
    const login = !status ? `can't run "${harness.bin()}"` : status.loggedIn ? (status.email ?? "") : "not logged in";
    return [
      account.name + (account.isDefault && account.name !== "primary" ? " (primary)" : ""),
      harness.name,
      login,
      status?.loggedIn ? (status.orgName ?? "") : "",
      tildify(account.dir),
    ];
  });
  return formatTable(["Account", "Agent", "Signed in as", "Organization", "Folder"], rows, color);
}

const paint = (on: boolean, code: string, text: string) => (on ? `\x1b[${code}m${text}\x1b[0m` : text);

/** A table with box-drawing borders. With colour on, the borders are dim and account names bold. */
export function formatTable(head: string[], rows: string[][], color = false): string {
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const rule = (l: string, m: string, r: string) => paint(color, "2", l + widths.map((w) => "─".repeat(w + 2)).join(m) + r);
  const bar = paint(color, "2", "│");
  const line = (cells: string[], style: (cell: string, i: number) => string) =>
    bar + cells.map((cell, i) => ` ${style(cell.padEnd(widths[i]), i)} `).join(bar) + bar;
  return [
    rule("┌", "┬", "┐"),
    line(head, (cell) => paint(color, "1", cell)),
    rule("├", "┼", "┤"),
    ...rows.map((row) => line(row, (cell, i) => (i === 0 ? paint(color, "1", cell) : cell))),
    rule("└", "┴", "┘"),
  ].join("\n");
}
