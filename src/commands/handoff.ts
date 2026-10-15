import * as p from "@clack/prompts";
import { getAccount } from "../accounts";
import { authStatus, runClaude } from "../claude";
import { listSessions } from "../claude-paths";
import { handoff, sourceProject } from "../handoff";
import { confirm } from "../prompt";

export interface HandoffCommandOptions {
  session?: string;
  pick: boolean;
  memory: boolean;
  resume: boolean;
  yes: boolean;
}

export async function handoffCommand(
  from: string | undefined,
  to: string | undefined,
  options: HandoffCommandOptions,
): Promise<number> {
  if (!from || !to) {
    throw new Error("Usage: cchandover handoff <from> <to> [--pick | --session <id>] [--no-memory] [--no-resume] [--yes]");
  }
  const source = getAccount(from);
  const target = getAccount(to);
  if (source.name === target.name) throw new Error("Pick two different accounts.");
  const cwd = process.cwd();

  let sessionId = options.session;
  if (options.pick) {
    const sessions = listSessions(sourceProject(source, cwd));
    const choice = await p.select({
      message: "Which session?",
      options: sessions.map((s) => ({
        value: s.id,
        label: (s.firstPrompt ?? "(no prompt)").slice(0, 70),
        hint: s.modified.toLocaleString(),
      })),
    });
    if (p.isCancel(choice)) return 1;
    sessionId = choice;
  }

  const status = authStatus(target);
  if (status && !status.loggedIn) throw new Error(`"${to}" isn't logged in. Run: cchandover ${to} auth login`);
  if (status?.orgName && !options.yes) {
    const ok = await confirm(`The conversation and memory will be sent to ${status.orgName} (${status.email}). Continue?`);
    if (!ok) return 1;
  }

  const result = handoff({ from: source, to: target, cwd, sessionId, memory: options.memory });
  const { session, sessionStatus, memory } = result;
  const label = `Session ${session.id}${session.firstPrompt ? ` ("${session.firstPrompt.slice(0, 50)}")` : ""}`;
  const what = { copied: "copied", updated: "brought up to date", unchanged: "was already up to date" }[sessionStatus];
  p.log.success(`${label} ${what}.`);
  if (memory) {
    p.log.info(
      `Memory: ${memory.copied.length} file(s) copied` +
        (memory.indexLinesAdded ? `, ${memory.indexLinesAdded} line(s) added to MEMORY.md` : "") +
        ".",
    );
    if (memory.conflicts.length) {
      p.log.warn(`Kept the target's version of: ${memory.conflicts.join(", ")} (they differ from "${from}").`);
    }
  }
  p.log.info(`This is a copy. What you do on "${to}" from here won't appear in "${from}".`);

  if (!options.resume) {
    p.log.step(`Resume it with: cchandover ${to} --resume ${session.id}`);
    return 0;
  }
  return runClaude(target, ["--resume", session.id], cwd);
}
