import * as p from "@clack/prompts";
import { getAccount } from "../accounts";
import { checkSameAgent, handoff, sessionsHere } from "../handoff";
import { getHarness } from "../harness";
import { authStatus, runTool } from "../process";
import { confirm } from "../prompt";
import { busy } from "../spinner";

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
    throw new Error("Usage: handova handoff <from> <to> [--pick | --session <id>] [--no-memory] [--no-resume] [--yes]");
  }
  const source = getAccount(from);
  const target = getAccount(to);
  if (source.name === target.name) throw new Error("Pick two different accounts.");
  checkSameAgent(source, target);
  const cwd = process.cwd();

  let sessionId = options.session;
  if (options.pick) {
    const sessions = sessionsHere(source, cwd);
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

  const harness = getHarness(target.harness);
  const status = await busy(authStatus(target));
  if (status && !status.loggedIn) {
    throw new Error(`"${to}" isn't logged in. Run: handova ${to} ${harness.loginArgs.join(" ")}`);
  }
  const who = [status?.email, status?.orgName].filter(Boolean).join(", ");
  if (who && !options.yes) {
    const what = options.memory && harness.memoryDir ? "The conversation and memory" : "The conversation";
    const ok = await confirm(`${what} will go to "${to}" (${who}). Continue?`);
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
  } else if (options.memory && !harness.memoryDir) {
    p.log.info(`${harness.name} keeps memory per account, not per project, so only the conversation moved.`);
  }
  p.log.info(`This is a copy. What you do on "${to}" from here won't appear in "${from}".`);

  if (!options.resume) {
    p.log.step(`Resume it with: handova ${to} ${harness.resumeArgs(session.id).join(" ")}`);
    return 0;
  }
  return runTool(target, harness.resumeArgs(session.id), cwd);
}
