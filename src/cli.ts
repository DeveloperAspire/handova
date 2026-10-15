#!/usr/bin/env node
import { parseArgs } from "node:util";
import * as p from "@clack/prompts";
import pkg from "../package.json" with { type: "json" };
import { addCommand } from "./commands/add";
import { doctorCommand } from "./commands/doctor";
import { handoffCommand } from "./commands/handoff";
import { listCommand } from "./commands/list";
import { removeCommand } from "./commands/remove";
import { runCommand } from "./commands/run";
import { shellInitCommand } from "./commands/shell-init";

const HELP = `ccswap ${pkg.version}
Run Claude Code under several accounts, and hand a session over from one to another.

Usage:
  ccswap <account> [claude args...]   Run Claude Code under an account
  ccswap add <name>                   Add an account and log in to it
      --dir <path>                      Use this folder (default ~/.claude-<name>); an existing one is adopted
      --no-share                        Don't link CLAUDE.md, skills, agents and commands or copy settings.json
      --no-login                        Skip logging in
  ccswap list                         Show accounts with their email and organization
  ccswap handoff <from> <to>          Copy this folder's latest session and its memory, then resume it
      --pick                            Choose the session from a list
      --session <id>                    Hand over this session
      --no-memory                       Leave memory behind
      --no-resume                       Copy only; don't start Claude Code
      --yes                             Skip the confirmation
  ccswap remove <name>                Forget an account (its folder and login are kept)
      --purge                           Also log out and delete its folder
  ccswap doctor                       Check Claude Code, every account's login and shared links
  ccswap shell-init                   Print claude-<account> aliases, for: eval "$(ccswap shell-init)"

The "personal" account is Claude Code's default (~/.claude).`;

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const parse = <T extends Record<string, { type: "boolean" | "string" }>>(options: T) => {
    try {
      return parseArgs({ args: rest, options, allowPositionals: true, allowNegative: true });
    } catch (error: any) {
      if (error.code !== "ERR_PARSE_ARGS_UNKNOWN_OPTION") throw error;
      const option = String(error.message).match(/'([^']+)'/)?.[1] ?? "";
      throw new Error(`Unknown option "${option}" for ccswap ${command}. See: ccswap help`);
    }
  };

  switch (command) {
    case undefined:
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
        dir: { type: "string" },
        share: { type: "boolean" },
        login: { type: "boolean" },
      });
      return addCommand(positionals[0], {
        dir: values.dir,
        share: values.share ?? true,
        login: values.login ?? true,
      });
    }
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
