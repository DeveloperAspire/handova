#!/usr/bin/env node
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import * as p from "@clack/prompts";
import pkg from "../package.json" with { type: "json" };
import { registryPath } from "./accounts";
import { addCommand } from "./commands/add";
import { doctorCommand } from "./commands/doctor";
import { handoffCommand } from "./commands/handoff";
import { listCommand } from "./commands/list";
import { removeCommand } from "./commands/remove";
import { renameCommand } from "./commands/rename";
import { setupCommand } from "./commands/setup";
import { runCommand } from "./commands/run";
import { shellInitCommand } from "./commands/shell-init";

const HELP = `handova ${pkg.version}
Run your AI coding agent under several accounts, and hand a conversation from one account to another.
Supports Claude Code and Codex.

Usage:
  handova setup                        Guided setup: pick your agents, add accounts and log in
  handova <account> [args...]          Run the account's agent; args are passed to it
  handova add <name>                   Add an account and log in to it
      --agent claude|codex               Which agent (default claude)
      --dir <path>                       Use this folder (default ~/.claude-<name> or ~/.codex-<name>);
                                         an existing one is adopted
      --no-share                         Don't share instructions, skills and settings from your normal account
      --no-login                         Skip logging in
  handova list                         Show accounts with their agent, email and organization
  handova handoff <from> <to>          Copy this folder's latest conversation (and memory, for Claude Code),
                                       then resume it
      --pick                             Choose the conversation from a list
      --session <id>                     Hand over this conversation
      --no-memory                        Leave memory behind
      --no-resume                        Copy only; don't start the agent
      --yes                              Skip the confirmation
  handova remove <name>                Forget an account (its folder and login are kept)
      --purge                            Also log out and delete its folder (never an agent's normal folder)
  handova rename <old> <new>           Rename an account
  handova doctor                       Check each agent, every account's login and shared links
  handova shell-init                   Print <agent>-<account> aliases, for: eval "$(handova shell-init)"

On first run, Handova lists the normal login of each agent that's installed: "personal" for Claude Code
(~/.claude) and "codex" for Codex (~/.codex).`;

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const parse = <T extends Record<string, { type: "boolean" | "string" }>>(options: T) => {
    try {
      return parseArgs({ args: rest, options, allowPositionals: true, allowNegative: true });
    } catch (error: any) {
      if (error.code !== "ERR_PARSE_ARGS_UNKNOWN_OPTION") throw error;
      const option = String(error.message).match(/'([^']+)'/)?.[1] ?? "";
      throw new Error(`Unknown option "${option}" for handova ${command}. See: handova help`);
    }
  };

  switch (command) {
    case undefined:
      if (!existsSync(registryPath())) console.log("New here? Start with: handova setup\n");
      console.log(HELP);
      return 0;
    case "help":
    case "-h":
    case "--help":
      console.log(HELP);
      return 0;
    case "version":
    case "-v":
    case "--version":
      console.log(pkg.version);
      return 0;
    case "add": {
      const { values, positionals } = parse({
        agent: { type: "string" },
        dir: { type: "string" },
        share: { type: "boolean" },
        login: { type: "boolean" },
      });
      return addCommand(positionals[0], {
        agent: values.agent,
        dir: values.dir,
        share: values.share ?? true,
        login: values.login ?? true,
      });
    }
    case "setup":
      return setupCommand();
    case "list":
      return listCommand();
    case "handoff": {
      const { values, positionals } = parse({
        session: { type: "string" },
        pick: { type: "boolean" },
        memory: { type: "boolean" },
        resume: { type: "boolean" },
        yes: { type: "boolean" },
      });
      return handoffCommand(positionals[0], positionals[1], {
        session: values.session,
        pick: values.pick ?? false,
        memory: values.memory ?? true,
        resume: values.resume ?? true,
        yes: values.yes ?? false,
      });
    }
    case "remove": {
      const { values, positionals } = parse({ purge: { type: "boolean" }, yes: { type: "boolean" } });
      return removeCommand(positionals[0], { purge: values.purge ?? false, yes: values.yes ?? false });
    }
    case "rename":
      return renameCommand(rest[0], rest[1]);
    case "doctor":
      return doctorCommand();
    case "shell-init":
      return shellInitCommand();
    default:
      // Everything after the account name goes to claude untouched.
      return runCommand(command, rest);
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error: Error) => {
    p.log.error(error.message);
    process.exit(1);
  },
);
