import { getAccount } from "../accounts";
import { runTool } from "../process";

export function runCommand(name: string, args: string[]): Promise<number> {
  return runTool(getAccount(name), args);
}
