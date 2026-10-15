import { loadAccounts } from "../accounts";

export function shellInitCommand(): number {
  for (const account of loadAccounts()) console.log(`alias claude-${account.name}='ccswap ${account.name}'`);
  return 0;
}
