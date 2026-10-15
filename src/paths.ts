import { homedir } from "node:os";

export function home(): string {
  return process.env.HOME || homedir();
}

export function tildify(path: string): string {
  return path.startsWith(home()) ? "~" + path.slice(home().length) : path;
}
