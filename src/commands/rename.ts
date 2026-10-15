import * as p from "@clack/prompts";
import { getAccount, loadAccounts, saveAccounts, validateName } from "../accounts";

export function renameCommand(from: string | undefined, to: string | undefined): number {
  if (!from || !to) throw new Error("Usage: handova rename <old name> <new name>");
  getAccount(from);
  validateName(to);
  const accounts = loadAccounts();
  if (accounts.some((a) => a.name === to)) throw new Error(`There's already an account named "${to}".`);

  saveAccounts(accounts.map((a) => (a.name === from ? { ...a, name: to } : a)));
  p.log.success(`Renamed "${from}" to "${to}". Its folder and login didn't change.`);
  return 0;
}
