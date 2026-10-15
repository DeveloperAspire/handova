import { getAccount } from "../accounts";
import { runClaude } from "../claude";

export function runCommand(name: string, args: string[]): Promise<number> {
  return runClaude(getAccount(name), args);
}
