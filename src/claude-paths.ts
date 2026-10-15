import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function home(): string {
  return process.env.HOME || homedir();
}

export function defaultConfigDir(): string {
  return join(home(), ".claude");
}

// Claude Code names a project's folder after the directory it was started in,
// with every character that isn't a letter or digit turned into "-".
// Very long paths get shortened, so findProjectDir falls back to scanning.
export function projectKey(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]/g, "-");
}

export function projectsDir(configDir: string): string {
  return join(configDir, "projects");
}

export function findProjectDir(configDir: string, cwd: string): string | undefined {
  const root = projectsDir(configDir);
  const direct = join(root, projectKey(cwd));
  if (existsSync(direct)) return direct;
  if (!existsSync(root)) return undefined;

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(root, entry.name);
    const first = readdirSync(dir).find((name) => name.endsWith(".jsonl"));
    if (first && sessionCwd(join(dir, first)) === cwd) return dir;
  }
  return undefined;
}

export interface Session {
  id: string;
  file: string;
  modified: Date;
  firstPrompt?: string;
}

export function listSessions(projectDir: string): Session[] {
  return readdirSync(projectDir)
    .filter((name) => name.endsWith(".jsonl"))
    .map((name) => {
      const file = join(projectDir, name);
      return {
        id: name.slice(0, -".jsonl".length),
        file,
        modified: statSync(file).mtime,
        firstPrompt: firstPrompt(file),
      };
    })
    .sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

function* records(file: string): Generator<Record<string, any>> {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line) continue;
    try {
      yield JSON.parse(line);
    } catch {
      // A line being written while we read; skip it.
    }
  }
}

function sessionCwd(file: string): string | undefined {
  for (const record of records(file)) {
    if (typeof record.cwd === "string") return record.cwd;
  }
  return undefined;
}

function firstPrompt(file: string): string | undefined {
  for (const record of records(file)) {
    if (record.type !== "user" || record.isMeta) continue;
    const content = record.message?.content;
    const text =
      typeof content === "string"
        ? content
        : Array.isArray(content)
          ? content.find((part: any) => part?.type === "text")?.text
          : undefined;
    if (text && !text.startsWith("<")) return text.replace(/\s+/g, " ").trim();
  }
  return undefined;
}
