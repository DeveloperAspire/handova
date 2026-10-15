# ccswap

Run Claude Code under as many accounts as you have, such as personal, work and a client's, and hand a
conversation from one account to another when you hit a usage limit.

Install it with your package manager:

```sh
npm install -g ccswap
pnpm add -g ccswap
yarn global add ccswap    # Yarn 1; Yarn 2 and later have no global installs
bun add -g ccswap
```

Or run it once without installing: `npx ccswap`, `pnpm dlx ccswap` or `bunx ccswap`.

## How it works

Claude Code keeps an account's login, settings, conversations and memory in a config folder. Your normal
`claude` uses `~/.claude`, which ccswap calls `personal`. Every other account gets its own folder, and ccswap
points Claude Code at it (through `CLAUDE_CONFIG_DIR`) when it starts.

The logins are separate. Logging in or out of one account never affects another, and you can run them side
by side in different terminals. Accounts are listed in `~/.config/ccswap/accounts.json`.

## Commands

An "account" is one of your Claude logins. The examples use `personal` and `work`, but you can add as many as
you like and name them anything.

### Run Claude Code under an account

```
ccswap  work  --continue
        ↑ account  ↑ anything after the account is passed to Claude
```

Opens Claude Code logged in as **work**. Anything after the account name works the same as it does with plain
`claude`:

- `ccswap work` starts a new conversation.
- `ccswap work --continue` reopens the last conversation in this folder.
- `ccswap work --resume` shows a list of past conversations to pick from.
- `ccswap work --resume <id>` opens one specific conversation.

### Hand a conversation to another account

```
ccswap  handoff  personal  work
        ↑ action  ↑ from     ↑ to
```

For when one account hits its usage limit. Run it in the folder you were working in. It:

1. Finds the latest conversation you had in this folder on **personal**.
2. Names the organization it's going to and asks you to confirm.
3. Copies the conversation and that folder's memory to **work**.
4. Opens the conversation on **work**, so you can carry on.

Any two accounts work: `ccswap handoff work client`, or back again with `ccswap handoff work personal`.

```
ccswap  handoff  personal  work  --pick
                                 ↑ optional, see below
```

- `--pick` lets you choose the conversation from a list, instead of the latest.
- `--session <id>` hands over one specific conversation.
- `--no-memory` copies only the conversation.
- `--no-resume` copies without opening Claude.
- `--yes` skips the confirmation.

It never overwrites anything on the receiving account. Memory files that already exist there are kept and
listed, and missing lines are added to `MEMORY.md`. Handing the same conversation over again brings the copy
up to date, unless it has also been continued on the receiving account.

The copy is a fork: what you do on the new account doesn't flow back. It also means the conversation is now
processed under the receiving account's organization, which ccswap names before it copies. Don't hand work
conversations to a personal account, or personal ones to work, if that isn't allowed where you work.

### Add an account

```
ccswap  add  client
        ↑ action  ↑ name you choose for the new account
```

Sets up a new account called **client**: creates the folder `~/.claude-client`, shares your `CLAUDE.md`,
`skills`, `agents` and `commands` with it (so edits show up in every account), copies `settings.json` (so
each account can change its own), then opens the login.

```
ccswap  add  work  --dir ~/.claude-work
                   ↑ use this existing folder instead of creating a new one
```

- `--dir <folder>` uses a folder you already have. If it's already logged in, the login step is skipped.
- `--no-share` starts the account without your shared files.
- `--no-login` skips the login step.

Names use lowercase letters, digits and dashes.

### List accounts

```
ccswap  list
        ↑ action (no names needed)
```

Shows every account with its email, organization and folder:

```
ACCOUNT             EMAIL              ORGANIZATION  FOLDER
personal (default)  me@example.com     Personal      ~/.claude
work                me@company.com     Company       ~/.claude-work
```

### Remove an account

```
ccswap  remove  work  --purge
        ↑ action  ↑ account  ↑ optional: also log out and delete its folder
```

Without `--purge`, ccswap only forgets the account; its folder and login stay, so you can add it back later.
With `--purge`, it also logs the account out and deletes its folder, including its conversations and memory.
It asks first (`--yes` skips the question). The default account can't be removed.

### Check everything

```
ccswap  doctor
        ↑ action (no names needed)
```

Checks that Claude Code is installed, every account is logged in, and the shared `CLAUDE.md` and skills links
still work. For anything wrong, it tells you how to fix it.

### Print shortcuts

```
ccswap  shell-init
        ↑ action (no names needed)
```

Prints one shortcut per account, such as `claude-work` for `ccswap work`. It's optional. To use them, add this
line to your `~/.zshrc` or `~/.bashrc`:

```sh
eval "$(ccswap shell-init)"
```

### Help and version

```
ccswap  help             ccswap  --version
        ↑ every command          ↑ the installed version
```

## Development

```sh
bun install
bun test
bun run build      # dist/cli.js, runs on Node 20.16+
bun run compile    # a single binary in build/
```

## Licence

MIT
