import { loadAccounts } from "../accounts";

// Aliases are named after the account's tool, e.g. claude-work.
export function shellInitCommand(): number {
  for (const account of loadAccounts()) console.log(`alias ${account.harness}-${account.name}='handova ${account.name}'`);
  return 0;
}
