# handova

## What this is

A public CLI for running an AI coding agent under several accounts and handing a session (plus, for Claude
Code, that folder's memory) from one account to another. Supports Claude Code and Codex; each agent is a
"harness" in `src/harness/`, so more can be added. Product notes: docs/PRD.md. User docs: README.md.

**One sentence:** `handova backup` runs Claude Code as your backup account; `handova handoff primary backup`
moves what you were doing over when primary hits its limit.

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
| Runtime | Bun for dev, Node 20+ for the published build | `--no-<flag>` is handled in `cli.ts`, not by `parseArgs` `allowNegative` (20.16+ only) |
| CLI | `node:util` `parseArgs` | `handova <account> ...` passes args to claude unparsed |
| Prompts | `@clack/prompts` | bundled into `dist/cli.js`, so the published package has no dependencies |
| Tests | `bun test` | temp HOME + `test/fixtures/fake-claude.sh` via `HANDOVA_CLAUDE_BIN` |

## Code layout

- `src/harness/types.ts`: the `Harness` interface, everything agent-specific. `claude.ts` and `codex.ts`
  implement it; `getHarness(id)` and `HARNESS_IDS` are in `src/harness/index.ts`.
- `src/process.ts`: `envFor`, `authStatus`, `runTool`, `installedVersion`. These launch whichever tool an
  account uses.
- `src/accounts.ts`: the registry. Every account has a `harness`, and entries without one load as `"claude"`.
  Before anything is saved, `loadAccounts()` returns the primary login (`defaultAccountName`, `defaultDir()`) of
  every harness whose binary is on PATH. Once saved, the file is the source of truth, so removed accounts stay
  removed.
- `src/handoff.ts`: copies a session file (and its extras) to the same path relative to the other account's
  folder, and merges memory when the harness has `memoryDir`. Same-harness only.
- `src/commands/*`: one file per command. Commands never name a tool directly; they go through the harness.
  `setup.ts` is the guided first run: it offers only installed agents (no question at all when there's just one),
  asks what to call each agent's primary login (its usual folder, `isDefault` in the data) and saves it with
  `addPrimary`, then adds and logs in to accounts. Names during setup are checked with `savedAccounts()`, because
  on a first run the detected primary logins aren't saved yet. `handova add` asks which agent through
  `chooseAgent` unless `--agent` is given or only one agent is installed; it never guesses between two.
- `src/spinner.ts`: `busy(promise)` shows a spinner with Handova's own handoff-themed words (Dilly-dallying…,
  Passing the baton…). It only appears if work takes longer than 150ms, never adds a delay, and stays silent
  without a terminal. Login checks run through `src/spawn.ts` `capture` (async) so the spinner keeps moving and
  `list` checks all accounts at once.

## Adding a harness

1. Verify on a real install, and write down here, how the tool stores things:
   - which environment variable points it at a config folder;
   - where the login lives, and whether two folders really keep separate logins;
   - how to check login status from the command line;
   - where sessions are saved and how one is resumed by ID;
   - whether it has per-project memory.
2. Add `src/harness/<id>.ts` implementing `Harness`, and register it in `src/harness/index.ts`.
3. `handova add --agent <id>` picks it up automatically through `HARNESS_IDS`; update the help text in `cli.ts`.
4. Add tests with a fake binary, like `test/fixtures/fake-claude.sh`, and update the README, site and FAQ.

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

## How Codex stores things (verified on 0.162.1)

- `CODEX_HOME` points Codex at a folder (default `~/.codex`, run with it unset). Each folder keeps its own login
  in `auth.json`: `auth_mode`, plus `tokens.id_token` (a JWT with `email` and the
  `https://api.openai.com/auth`.`chatgpt_plan_type` claim) for ChatGPT logins, or `OPENAI_API_KEY`.
- `codex login status` exits 0 or 1 and prints one line to **stderr**. There's no JSON form.
- Sessions: `sessions/<yyyy>/<mm>/<dd>/rollout-<time>-<id>.jsonl`; the first line is `session_meta` with `id` and
  `cwd`. Codex also indexes threads in `state_5.sqlite` and `thread_history_1.sqlite`, but rebuilds them from a
  rollout copied into another `CODEX_HOME`: `codex resume <id>` continues it with the full history.
- Memory is a per-account database (`memories_1.sqlite`), not per project, so handoffs don't move it.
- Verified with a real ChatGPT login (free plan) and with API-key logins: `list` shows the email and
  "ChatGPT <plan>", or "API key".

## Website (site/)

Astro + Tailwind v4, deployed on Vercel with the root folder set to `site/`, at https://handova.franklinokolie.com.
Neutral dark (`#0a0a0a`, true greys), Geist + Geist Mono. One accent, `--color-active` (mint): it means "the active
account" and nothing else. The version comes from the CLI's package.json (`site/src/data/project.ts`), and the
commands section (`site/src/data/commands.ts`) mirrors the README: change both together. Demo data is made up
(alex@mail.com, Lumen Studio); never use real names or emails.

Two pages: the landing page (`src/pages/index.astro`) and the docs (`src/pages/docs.astro`, one long page with a
sticky "On this page" list that follows the scroll). Layout borrowed from tasteskill.dev (structure and mood only,
never its copy or assets): two-tone headings via `SectionHead` (heavy line, grey second line, short note on the
right), rounded `Button`s, white-on-dark cards with hairline borders, generous spacing, `max-w-6xl` everywhere.
The docs are the full reference: when behaviour changes, update the docs page, the README and `data/commands.ts`
together. Docs code blocks are `components/docs/CodeBlock.astro`; keep its `<pre>` markup on one line.

Wording: an agent's usual login (its usual folder) is its **primary login**, shown as "(primary)" in `list`. Don't
call it "normal" or "default" in anything people read.

Copy rules: the product is **Handova** in prose and titles; only typed things (commands, install lines, package
name, paths, URLs) are lowercase `handova`. Position it as a tool for any AI coding agent's accounts, but be honest:
Claude Code and Codex are supported. Handoff only works between accounts of the same agent, and only Claude Code
handoffs move memory: never imply otherwise.

## Working conventions

- Never touch the real `~/.claude`, `~/.claude-*`, `~/.config/handova` or shell profile in tests or manual
  checks. Use a temp HOME. `handova list` is read-only and safe on the real machine.
- Every command that sends data to another organization or deletes something confirms first, needs `--yes`
  when there's no TTY, and says what it did.
- Errors are `throw new Error(<sentence that says what to do next>)`; `cli.ts` prints them.
- Commits follow the git-workflow skill. No commits until Franklin asks.
