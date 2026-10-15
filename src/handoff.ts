import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { Account } from "./accounts";
import { getHarness, type Session } from "./harness";

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
  /** Absent when memory wasn't asked for, or the agent doesn't keep memory per project. */
  memory?: MemoryResult;
}

export interface MemoryResult {
  copied: string[];
  conflicts: string[];
  indexLinesAdded: number;
}

export function sessionsHere(from: Account, cwd: string): Session[] {
  const sessions = getHarness(from.harness).listSessions(from.dir, cwd);
  if (!sessions.length) {
    throw new Error(`No sessions for ${cwd} in the "${from.name}" account. Run handoff from the folder you worked in.`);
  }
  return sessions;
}

export function handoff(options: HandoffOptions): HandoffResult {
  if (options.from.harness !== options.to.harness) {
    throw new Error(
      `"${options.from.name}" and "${options.to.name}" are for different coding agents. Handoff only works between accounts of the same agent for now.`,
    );
  }
  const harness = getHarness(options.from.harness);
  const sessions = sessionsHere(options.from, options.cwd);
  const session = options.sessionId ? sessions.find((s) => s.id === options.sessionId) : sessions[0];
  if (!session) {
    throw new Error(
      options.sessionId
        ? `No session ${options.sessionId} for this folder in the "${options.from.name}" account.`
        : `No sessions for this folder in the "${options.from.name}" account.`,
    );
  }

  // Same machine and same agent, so the session goes to the same place inside the other account's folder.
  const target = (path: string) => join(options.to.dir, relative(options.from.dir, path));

  const resume = `handova ${options.to.name} ${harness.resumeArgs(session.id).join(" ")}`;
  const result: HandoffResult = { session, sessionStatus: copySession(session, target, options.to.name, resume) };
  const memory = options.memory ? harness.memoryDir?.(options.from.dir, options.cwd) : undefined;
  if (memory) result.memory = mergeMemory(memory, target(memory));
  return result;
}

// A target copy that the source extends is the same conversation, just behind
// (handed over earlier, then continued on the source), so it's safe to bring up
// to date. Anything else on the target is its own work and is never overwritten.
function copySession(
  session: Session,
  target: (path: string) => string,
  account: string,
  resume: string,
): HandoffResult["sessionStatus"] {
  const dstFile = target(session.file);
  let status: HandoffResult["sessionStatus"] = "copied";

  if (existsSync(dstFile)) {
    const src = readFileSync(session.file, "utf8");
    const dst = readFileSync(dstFile, "utf8");
    if (src === dst) status = "unchanged";
    else if (src.startsWith(dst)) status = "updated";
    else if (dst.startsWith(src)) {
      throw new Error(
        `Session ${session.id} is already further along on "${account}". Nothing was copied. ` +
          `Resume it there with: ${resume}`,
      );
    } else {
      throw new Error(
        `Session ${session.id} has been continued on both accounts, so the two copies have diverged. ` +
          `Nothing was copied. Resume it on "${account}" with: ${resume}`,
      );
    }
  }
  if (status !== "unchanged") {
    mkdirSync(dirname(dstFile), { recursive: true });
    copyFileSync(session.file, dstFile);
  }

  if (session.extras) {
    cpSync(session.extras, target(session.extras), { recursive: true, force: false, errorOnExist: false });
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
