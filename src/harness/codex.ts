import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { home } from "../paths";
import type { AuthStatus, Harness, Session } from "./types";

// Verified on Codex 0.162:
// - CODEX_HOME points Codex at a folder, and each folder keeps its own login in auth.json.
// - `codex login status` exits 0 when logged in and prints a line to stderr.
// - Sessions are sessions/<yyyy>/<mm>/<dd>/rollout-<time>-<id>.jsonl. The first line is session_meta with the
//   cwd. Codex also indexes sessions in SQLite, but it picks up a rollout copied into another CODEX_HOME and
//   `codex resume <id>` continues it with the full history.
// - Memory lives in a per-account database (memories_1.sqlite), not per project, so handoffs don't move it.
export const codex: Harness = {
  id: "codex",
  name: "Codex",
  bin: () => process.env.HANDOVA_CODEX_BIN || "codex",
  configEnv: "CODEX_HOME",
  defaultDir: () => join(home(), ".codex"),
  defaultAccountName: "codex",
  newAccountDir: (account) => join(home(), `.codex-${account}`),
  sharedLinks: ["AGENTS.md", "prompts", "skills"],
  sharedCopies: ["config.toml"],

  authStatus(env) {
    const result = spawnSync(this.bin(), ["login", "status"], { encoding: "utf8", env });
    if (result.error) return undefined;
    if (result.status !== 0) return { loggedIn: false };
    return { loggedIn: true, ...accountInfo(env.CODEX_HOME || this.defaultDir()) };
  },
  loginArgs: ["login"],
  logoutArgs: ["logout"],
  resumeArgs: (sessionId) => ["resume", sessionId],

  listSessions(configDir, cwd) {
    return rollouts(join(configDir, "sessions"))
      .map((file): Session | undefined => {
        const meta = sessionMeta(file);
        if (meta?.cwd !== cwd || typeof meta.id !== "string") return undefined;
        return { id: meta.id, file, modified: statSync(file).mtime, firstPrompt: firstPrompt(file) };
      })
      .filter((session): session is Session => session !== undefined)
      .sort((a, b) => b.modified.getTime() - a.modified.getTime());
  },
};

// Who is logged in, from auth.json. A ChatGPT login carries an ID token whose claims hold the email and plan.
export function accountInfo(dir: string): Pick<AuthStatus, "email" | "orgName"> {
  try {
    const auth = JSON.parse(readFileSync(join(dir, "auth.json"), "utf8"));
    const token: string | undefined = auth.tokens?.id_token;
    if (token) {
      const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
      const plan = claims["https://api.openai.com/auth"]?.chatgpt_plan_type;
      return { email: claims.email, orgName: plan ? `ChatGPT ${plan}` : "ChatGPT" };
    }
    if (auth.OPENAI_API_KEY) return { orgName: "API key" };
  } catch {
    // No auth.json, or one we don't understand: report the login without details.
  }
  return {};
}

function rollouts(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return rollouts(path);
    return entry.name.startsWith("rollout-") && entry.name.endsWith(".jsonl") ? [path] : [];
  });
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

function sessionMeta(file: string): { id?: string; cwd?: string } | undefined {
  for (const record of records(file)) {
    return record.type === "session_meta" ? record.payload : undefined;
  }
  return undefined;
}

function firstPrompt(file: string): string | undefined {
  for (const record of records(file)) {
    const item = record.payload;
    if (record.type !== "response_item" || item?.role !== "user" || !Array.isArray(item.content)) continue;
    const text: string | undefined = item.content.find((part: any) => typeof part?.text === "string")?.text;
    if (text && !text.startsWith("<")) return text.replace(/\s+/g, " ").trim();
  }
  return undefined;
}
