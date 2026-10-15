import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import type { Account } from "./accounts";
import { findProjectDir, listSessions, projectsDir, type Session } from "./claude-paths";

export interface HandoffOptions {
  from: Account;
  to: Account;
  cwd: string;
  sessionId?: string;
  memory: boolean;
}

export interface HandoffResult {
  session: Session;
  sessionStatus: "copied" | "updated" | "unchanged";
  memory?: MemoryResult;
}

export interface MemoryResult {
  copied: string[];
  conflicts: string[];
  indexLinesAdded: number;
}

export function sourceProject(from: Account, cwd: string): string {
  const dir = findProjectDir(from.dir, cwd);
  if (!dir) throw new Error(`No sessions for ${cwd} in the "${from.name}" account. Run handoff from the folder you worked in.`);
  return dir;
}

export function handoff(options: HandoffOptions): HandoffResult {
  const srcProject = sourceProject(options.from, options.cwd);
  const sessions = listSessions(srcProject);
  const session = options.sessionId ? sessions.find((s) => s.id === options.sessionId) : sessions[0];
  if (!session) {
    throw new Error(
      options.sessionId
        ? `No session ${options.sessionId} for this folder in the "${options.from.name}" account.`
        : `No sessions for this folder in the "${options.from.name}" account.`,
    );
  }

  // Same machine, so the target uses the same project folder name.
  const dstProject = join(projectsDir(options.to.dir), basename(srcProject));
  mkdirSync(dstProject, { recursive: true });

  const result: HandoffResult = { session, sessionStatus: copySession(session, srcProject, dstProject, options.to.name) };
  if (options.memory) {
    result.memory = mergeMemory(join(srcProject, "memory"), join(dstProject, "memory"));
  }
  return result;
}

// A target copy that the source extends is the same conversation, just behind
// (handed over earlier, then continued on the source), so it's safe to bring up
// to date. Anything else on the target is its own work and is never overwritten.
function copySession(
  session: Session,
  srcProject: string,
  dstProject: string,
  target: string,
): HandoffResult["sessionStatus"] {
  const dstFile = join(dstProject, basename(session.file));
  let status: HandoffResult["sessionStatus"] = "copied";

  if (existsSync(dstFile)) {
    const src = readFileSync(session.file, "utf8");
    const dst = readFileSync(dstFile, "utf8");
    if (src === dst) status = "unchanged";
    else if (src.startsWith(dst)) status = "updated";
    else if (dst.startsWith(src)) {
      throw new Error(
        `Session ${session.id} is already further along on "${target}". Nothing was copied. ` +
          `Resume it there with: cchandover ${target} --resume ${session.id}`,
      );
    } else {
      throw new Error(
        `Session ${session.id} has been continued on both accounts, so the two copies have diverged. ` +
          `Nothing was copied. Resume it on "${target}" with: cchandover ${target} --resume ${session.id}`,
      );
    }
  }
  if (status !== "unchanged") copyFileSync(session.file, dstFile);

  // Subagent transcripts and saved tool output.
  const srcExtras = join(srcProject, session.id);
  if (existsSync(srcExtras)) {
    cpSync(srcExtras, join(dstProject, session.id), { recursive: true, force: false, errorOnExist: false });
  }
  return status;
}

export function mergeMemory(srcDir: string, dstDir: string): MemoryResult {
  const result: MemoryResult = { copied: [], conflicts: [], indexLinesAdded: 0 };
  if (!existsSync(srcDir)) return result;
  mkdirSync(dstDir, { recursive: true });

  for (const file of walk(srcDir)) {
    const name = relative(srcDir, file);
    const target = join(dstDir, name);

    if (name === "MEMORY.md" && existsSync(target)) {
      const existing = readFileSync(target, "utf8");
      const have = new Set(existing.split("\n").map((line) => line.trim()));
      const missing = readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => line.trim() && !have.has(line.trim()));
      if (missing.length) {
        writeFileSync(target, existing.replace(/\n*$/, "\n") + missing.join("\n") + "\n");
        result.indexLinesAdded = missing.length;
      }
    } else if (!existsSync(target)) {
      mkdirSync(join(target, ".."), { recursive: true });
      copyFileSync(file, target);
      result.copied.push(name);
    } else if (readFileSync(target, "utf8") !== readFileSync(file, "utf8")) {
      result.conflicts.push(name);
    }
  }
  return result;
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
