# ccswap

## What this is

A public CLI for running Claude Code under several accounts and handing a session (plus that folder's
memory) from one account to another. Product notes: docs/PRD.md. User docs: README.md.

**One sentence:** `ccswap work` runs Claude Code as your work account; `ccswap handoff personal work` moves
what you were doing over when personal hits its limit.

**It wins if:** someone who hits a usage limit is working again on their other account within 30 seconds,
without opening `~/.claude`.

## Non-goals

- Two-way sync or merging diverged sessions.
- Copying file-edit history (rewind).
- Editing the user's shell profile. `shell-init` prints aliases; the user adds the eval line.
- Any UI beyond the terminal.

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Bun for dev, Node 20.16+ for the published build | `parseArgs` `allowNegative` needs 20.16 |
| CLI | `node:util` `parseArgs` | `ccswap <account> ...` passes args to claude unparsed |
| Prompts | `@clack/prompts` | the only runtime dependency |
| Tests | `bun test` | temp HOME + `test/fixtures/fake-claude.sh` via `CCSWAP_CLAUDE_BIN` |

## How Claude Code stores things (verified on 2.1.296)

- Default account: `~/.claude`, account info in `~/.claude.json`, `CLAUDE_CONFIG_DIR` **unset**.
- Other accounts: `CLAUDE_CONFIG_DIR=<dir>`, account info in `<dir>/.claude.json`. macOS Keychain entry
  `Claude Code-credentials-<first 8 hex of sha256(dir)>`, so the path must be exactly the same every time.
- `claude auth status --json` gives `loggedIn`, `email`, `orgName`, `subscriptionType` for the current
  config folder. Use it rather than reading files or the Keychain.
- Sessions: `<dir>/projects/<key>/<id>.jsonl`, key = launch directory with non-alphanumerics turned into
  `-`. The folder is fixed by where claude was **started**, even if the session `cd`s elsewhere. Long paths
  are shortened, hence the fallback scan on the `cwd` field.
- `<dir>/projects/<key>/<id>/` holds subagent transcripts. `<dir>/projects/<key>/memory/` holds memory.

## Website (site/)

Astro + Tailwind v4, deployed on Vercel with the root folder set to `site/`, at https://ccswap.vercel.app for now.
Neutral dark (`#0a0a0a`, true greys), Geist + Geist Mono. One accent, `--color-active` (mint): it means "the active
account" and nothing else. The version comes from the CLI's package.json (`site/src/data/project.ts`), and the
commands section (`site/src/data/commands.ts`) mirrors the README: change both together. Demo data is made up
(alex@mail.com, Lumen Studio); never use real names or emails.

## Working conventions

- Never touch the real `~/.claude`, `~/.claude-*`, `~/.config/ccswap` or shell profile in tests or manual
  checks. Use a temp HOME. `ccswap list` is read-only and safe on the real machine.
- Every command that sends data to another organization or deletes something confirms first, needs `--yes`
  when there's no TTY, and says what it did.
- Errors are `throw new Error(<sentence that says what to do next>)`; `cli.ts` prints them.
- Commits follow the git-workflow skill. No commits until Franklin asks.
