# Handova

**Hit your limit. Hand it over.**

Handova runs your AI coding agent under as many accounts as you have: personal, work, a client's. When one
account hits its usage limit, it hands the conversation and what the tool learned about your project to another
account, and you carry on.

[handova.franklinokolie.com](https://handova.franklinokolie.com)

**Works with:** Claude Code. Codex is planned; see [Other agents](#other-agents).

## Install

```sh
npm install -g handova
pnpm add -g handova
yarn global add handova    # Yarn 1; Yarn 2 and later have no global installs
bun add -g handova
```

Or run it once without installing: `npx handova`, `pnpm dlx handova` or `bunx handova`.

**Requirements:** Claude Code, and Node.js 20.16 or newer (or Bun). Built and tested on macOS. Linux should
work; Windows isn't supported yet.

## Quick start

```sh
handova add work                  # set up a second account and log in to it
handova work                      # run Claude Code as work
handova handoff personal work     # personal hit its limit: carry on as work
```

Your normal `claude` keeps working as before. Handova calls it `personal`.

## How it works

Claude Code keeps an account's login, settings, conversations and memory in a config folder. Your normal
`claude` uses `~/.claude`, which Handova calls `personal`. Every other account gets its own folder, and Handova
points Claude Code at it (through `CLAUDE_CONFIG_DIR`) when it starts.

The logins are separate. Logging in or out of one account never affects another, and you can run them side
by side in different terminals. Handova keeps its list of accounts in `~/.config/handova/accounts.json`.

## Commands

An "account" is one of your logins. The examples use `personal` and `work`, but you can add as many as you
like and name them anything.

### Run your coding agent under an account

```
handova  work  --continue
         │     └─ anything after the account is passed to the tool
         └─ account
```

Opens Claude Code logged in as **work**. Anything after the account name works the same as it does with plain
`claude`:

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

For when one account hits its usage limit. Run it in the folder you were working in. It:

1. Finds the latest conversation you had in this folder on **personal**.
2. Names the organization it's going to and asks you to confirm.
3. Copies the conversation and that folder's memory to **work**.
4. Opens the conversation on **work**, so you can carry on.

Any two accounts work: `handova handoff work client`, or back again with `handova handoff work personal`.

```
handova  handoff  personal  work  --pick
                                  └─ optional, see below
```

- `--pick` lets you choose the conversation from a list, instead of the latest.
- `--session <id>` hands over one specific conversation.
- `--no-memory` copies only the conversation.
- `--no-resume` copies without opening the tool.
- `--yes` skips the confirmation.

It never overwrites anything on the receiving account. Memory files that already exist there are kept and
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

Sets up a new account called **client**: creates the folder `~/.claude-client`, shares your `CLAUDE.md`,
`skills`, `agents` and `commands` with it (so edits show up in every account), copies `settings.json` (so
each account can change its own), then opens the login.

```
handova  add  work  --dir ~/.claude-work
                    └─ use this existing folder instead of creating one
```

- `--dir <folder>` uses a folder you already have. If it's already logged in, the login step is skipped.
- `--no-share` starts the account without your shared files.
- `--no-login` skips the login step.

Names use lowercase letters, digits and dashes.

### List accounts

```
handova  list
         └─ action, no names needed
```

Shows every account with its email, organization and folder:

```
ACCOUNT             EMAIL           ORGANIZATION  FOLDER
personal (default)  me@example.com  Personal      ~/.claude
work                me@company.com  Company       ~/.claude-work
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
It asks first (`--yes` skips the question). The default account can't be removed.

### Check everything

```
handova  doctor
         └─ action, no names needed
```

Checks that each account's coding agent is installed, every account is logged in, and the shared `CLAUDE.md`
and skills links still work. For anything wrong, it tells you how to fix it.

### Print shortcuts

```
handova  shell-init
         └─ action, no names needed
```

Prints one shortcut per account, such as `claude-work` for `handova work`. It's optional. To use them, add this
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

Handova supports Claude Code today. It's built so other AI coding agents can be added: everything specific to an
agent lives in one file under `src/harness/`. Codex is planned next. If you'd like to add an agent, the checklist is
in [CLAUDE.md](CLAUDE.md#adding-a-harness).

## Development

```sh
bun install
bun test
bun run build      # dist/cli.js, runs on Node 20.16+
bun run compile    # a single binary in build/
```

## Licence

MIT © Franklin Okolie. Handova is an independent project, not affiliated with Anthropic or OpenAI.
