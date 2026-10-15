import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

export function home(): string {
  return process.env.HOME || homedir();
}

export function tildify(path: string): string {
  return path.startsWith(home()) ? "~" + path.slice(home().length) : path;
}

// Whether a command can be found, the way the shell would find it, without running it.
export function onPath(command: string): boolean {
  if (command.includes("/")) return existsSync(command);
  return (process.env.PATH ?? "").split(delimiter).some((dir) => dir && existsSync(join(dir, command)));
}
