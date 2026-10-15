# Handova

**Hit your limit. Hand it over.**

Handova runs your AI coding agent under as many accounts as you have: personal, work, a client's. When one
account hits its usage limit, it hands the conversation (and what the agent learned about your project) to another
account, and you carry on.

[Website](https://handova.franklinokolie.com) · [Docs](https://handova.franklinokolie.com/docs)

**Works with:** Claude Code and Codex.

## Install

```sh
npm install -g handova
pnpm add -g handova
yarn global add handova    # Yarn 1; Yarn 2 and later have no global installs
bun add -g handova
```

Or run it once without installing: `npx handova`, `pnpm dlx handova` or `bunx handova`.

**Then run the guided setup:**

```sh
handova setup
```

It asks whether you want more than one account for Claude Code, Codex or both (only the agents you have
installed are offered), then adds the accounts you name and logs you in to each one.

**Requirements:** Claude Code or Codex, and Node.js 20.16 or newer (or Bun). Built and tested on macOS. Linux should
work; Windows isn't supported yet.

## Quick start

After `handova setup`, or without it:

```sh
handova add work                  # set up a second Claude Code account and log in to it
handova work                      # run Claude Code as work
handova handoff personal work     # personal hit its limit: carry on as work
```

Your normal `claude` keeps working as before. Handova calls it `personal`.

With Codex:

```sh
handova add codex-work --agent codex   # add a second Codex account
handova handoff codex codex-work       # carry on in the other Codex account
```

Your normal `codex` login is the `codex` account.

## How it works

Each coding agent keeps an account's login, settings and conversations in a config folder, and lets you point it
at a different one:

| Agent | Normal folder | Other accounts | Set with |
|---|---|---|---|
| Claude Code | `~/.claude` | `~/.claude-<name>` | `CLAUDE_CONFIG_DIR` |
| Codex | `~/.codex` | `~/.codex-<name>` | `CODEX_HOME` |

The first time you run Handova, it lists the normal login of each agent you have installed: `personal` for
Claude Code and `codex` for Codex. These are marked **(default)** in `handova list`. The names are only labels:
change them with `handova rename`. Every other account gets its own folder, and Handova points the agent at it
when it starts.

The logins are separate. Logging in or out of one account never affects another, and you can run them side
by side in different terminals. Handova keeps its list of accounts in `~/.config/handova/accounts.json`.

## Commands

### Guided setup

```
handova  setup
         └─ action, no names needed
```

Walks you through everything: which agents you use, your normal logins, extra accounts and their logins. Run it
again any time to add more; it keeps what you already have.

An "account" is one of your logins. The examples use `personal` and `work`, but you can add as many as you
like and name them anything.

### Run your coding agent under an account

```
handova  work  --continue
         │     └─ anything after the account is passed to the tool
         └─ account
```

Opens the account's agent, Claude Code or Codex, logged in as **work**. Anything after the account name is
passed to the agent, so it works the same as running it yourself. For Claude Code:

- `handova work` starts a new conversation.
- `handova work --continue` reopens the last conversation in this folder.
- `handova work --resume` shows a list of past conversations to pick from.
- `handova work --resume <id>` opens one specific conversation.

### Hand a conversation to another account

```
handova  handoff  personal  work
         │        │         └─ to this one
         │        └─ from this account
         └─ action
```

For when one account hits its usage limit. **Both accounts must be the same agent:**

| From | To | Works? | What moves |
|---|---|---|---|
| Claude Code account | another Claude Code account | Yes | The conversation, files saved with it (like subagent transcripts), and that folder's memory |
| Codex account | another Codex account | Yes | The conversation. Codex keeps memory per account, not per folder, so memory stays |
| Claude Code account | Codex account, or the other way | Not yet | Nothing. Handova stops before copying and tells you why |

```sh
handova handoff personal work       # Claude Code → Claude Code
handova handoff codex codex-work    # Codex → Codex
handova handoff work personal       # and back again
```

Run it in the folder you were working in. It:

1. Finds the latest conversation you had in this folder on the first account.
2. Names the account and organization it's going to, and asks you to confirm.
3. Copies it to the second account, never overwriting anything already there.
4. Opens the conversation on the second account, so you carry on.

```
handova  handoff  personal  work  --pick
                                  └─ optional, see below
```

- `--pick` lets you choose the conversation from a list, instead of the latest.
- `--session <id>` hands over one specific conversation.
- `--no-memory` copies only the conversation (Claude Code).
- `--no-resume` copies without opening the agent.
- `--yes` skips the confirmation.

It never overwrites anything on the receiving account. Claude Code memory files that already exist there are kept and
listed, and missing lines are added to `MEMORY.md`. Handing the same conversation over again brings the copy
up to date, unless it has also been continued on the receiving account.

The copy is a fork: what you do on the new account doesn't flow back. It also means the conversation is now
processed under the receiving account's organization, which Handova names before it copies. Don't hand work
conversations to a personal account, or personal ones to work, if that isn't allowed where you work.

### Add an account

```
handova  add  client
         │    └─ a name you choose
         └─ action
```

Sets up a new Claude Code account called **client**: creates the folder `~/.claude-client`, shares your
`CLAUDE.md`, `skills`, `agents` and `commands` with it (so edits show up in every account), copies
`settings.json` (so each account can change its own), then opens the login.

```
handova  add  client  --agent codex
                      └─ make it a Codex account
```

A Codex account gets `~/.codex-client`, shares `AGENTS.md`, `prompts` and `skills` from `~/.codex`, and copies
`config.toml`.

```
handova  add  work  --dir ~/.claude-work
                    └─ use this existing folder instead of creating one
```

- `--agent claude|codex` picks the agent. The default is `claude`.
- `--dir <folder>` uses a folder you already have. If it's already logged in, the login step is skipped. Pointing
  it at an agent's normal folder (`--agent codex --dir ~/.codex`) registers that login, for example if you
  installed Codex after you started using Handova.
- `--no-share` starts the account without your shared files.
- `--no-login` skips the login step.

Names use lowercase letters, digits and dashes.

### List accounts

```
handova  list
         └─ action, no names needed
```

Shows every account with its agent, email, organization and folder:

```
ACCOUNT             AGENT        EMAIL           ORGANIZATION  FOLDER
personal (default)  Claude Code  me@example.com  Personal      ~/.claude
work                Claude Code  me@company.com  Company       ~/.claude-work
codex (default)     Codex        me@example.com  ChatGPT plus  ~/.codex
```

### Remove an account

```
handova  remove  work  --purge
         │       │     └─ optional: also log out and delete its folder
         │       └─ account
         └─ action
```

Without `--purge`, Handova only forgets the account; its folder and login stay, so you can add it back later.
With `--purge`, it also logs the account out and deletes its folder, including its conversations and memory.
It asks first (`--yes` skips the question). You can take a normal login off the list too (for example
`personal`, if you don't use Claude Code), but `--purge` never deletes an agent's normal folder.

### Rename an account

```
handova  rename  work  office
         │       │     └─ new name
         │       └─ current name
         └─ action
```

Changes only the name. The folder and login stay the same. Works for normal logins too, so `personal` can
become `claude` or anything you like.

### Check everything

```
handova  doctor
         └─ action, no names needed
```

Checks that each account's agent is installed, every account is logged in, and the shared `CLAUDE.md`
and skills links still work. For anything wrong, it tells you how to fix it.

### Print shortcuts

```
handova  shell-init
         └─ action, no names needed
```

Prints one shortcut per account, named after its agent, such as `claude-work` for `handova work`. It's optional. To use them, add this
line to your `~/.zshrc` or `~/.bashrc`:

```sh
eval "$(handova shell-init)"
```

### Help and version

```sh
handova help        # every command
handova --version   # the installed version
```

## Other agents

Handova supports Claude Code and Codex. Everything specific to an agent lives in one file under `src/harness/`,
so more can be added. If you'd like to add one, the checklist is in [CLAUDE.md](CLAUDE.md#adding-a-harness).

## Development

```sh
bun install
bun test
bun run build      # dist/cli.js, runs on Node 20.16+
bun run compile    # a single binary in build/
```

## Licence

MIT © Franklin Okolie. Handova is an independent project, not affiliated with Anthropic or OpenAI.
