import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { home } from "../paths";
import type { Harness, Session } from "./types";

// Claude Code names a project's folder after the directory it was started in,
// with every character that isn't a letter or digit turned into "-".
// Very long paths get shortened, so findProject falls back to scanning.
export function projectKey(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]/g, "-");
}

export const claude: Harness = {
  id: "claude",
  name: "Claude Code",
  bin: () => process.env.HANDOVA_CLAUDE_BIN || "claude",
  // Setting it for the default account, even to ~/.claude, makes Claude Code look for a different login.
  configEnv: "CLAUDE_CONFIG_DIR",
  defaultDir: () => join(home(), ".claude"),
  newAccountDir: (account) => join(home(), `.claude-${account}`),
  sharedLinks: ["CLAUDE.md", "skills", "agents", "commands"],
  sharedCopies: ["settings.json"],

  authStatus(env) {
    const result = spawnSync(this.bin(), ["auth", "status", "--json"], { encoding: "utf8", env });
    try {
      return JSON.parse(result.stdout);
    } catch {
      return undefined;
    }
  },
  loginArgs: ["auth", "login"],
  logoutArgs: ["auth", "logout"],
  resumeArgs: (sessionId) => ["--resume", sessionId],

  projectsDir: (configDir) => join(configDir, "projects"),

  findProject(configDir, cwd) {
    const root = this.projectsDir(configDir);
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
  },

  listSessions(projectDir) {
    return readdirSync(projectDir)
      .filter((name) => name.endsWith(".jsonl"))
      .map((name): Session => {
        const file = join(projectDir, name);
        const id = name.slice(0, -".jsonl".length);
        return {
          id,
          file,
          extras: existsSync(join(projectDir, id)) ? join(projectDir, id) : undefined,
          modified: statSync(file).mtime,
          firstPrompt: firstPrompt(file),
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime());
  },

  memoryDir: (projectDir) => join(projectDir, "memory"),
};

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
