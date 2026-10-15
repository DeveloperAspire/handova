# handova: product notes

Written at kickoff, 12 October 2026, from the planning conversation.

## Problem

People with more than one Claude account (typically personal plus a work organization they were invited to)
switch between them by hand: shell aliases setting `CLAUDE_CONFIG_DIR`, and logging in and out. When one
account hits its usage limit, moving the conversation and its memory to the other means finding and copying
files under `~/.claude/projects` by hand.

## Goal

A small public CLI that:

1. Manages any number of accounts: add (with login), run, list (email and organization), remove, doctor,
   shell aliases.
2. Hands the current folder's session and memory from one account to another, then resumes it.

## Decisions

- Name `handova` ("hand over"). It's neutral on purpose: Claude Code comes first, but other coding tools (Codex,
  Gemini CLI, ...) may be added later. History, all on 15 October 2026 and before the first npm release:
  - `ccswap`: dropped because a Python tool for the same job already ships as `ccswap` on PyPI (errhythm/ccswap).
  - `cchandover`: dropped because "cc" ties the name to Claude Code.
  - `handova`: free on npm, PyPI and Homebrew. The GitHub repos with the name are unrelated.
- TypeScript on Bun, published to npm for Node 20+, with a compiled binary as an extra.
- `primary` is Claude Code's default account (its usual login, named `personal` before 1.0.3) and runs with `CLAUDE_CONFIG_DIR` unset; setting it even to
  `~/.claude` makes Claude Code look for a different login.
- Login state comes from `claude auth status --json`; login uses `claude auth login`.
- Handoff never overwrites. A target session the source extends is brought up to date; a diverged one is
  refused.
- Handoff names the target organization and asks before copying.

## Later

- More agents behind the harness interface (`src/harness/`). Codex was added on 15 October 2026, before the
  first release.
- Handing off between different tools via a written brief rather than a transcript copy.

## Out of scope for now

- Migrating the author's own `.zshrc` aliases and `~/.claude-work` (he'll do it himself with
  `handova add work --dir ~/.claude-work`).
- Syncing in both directions or merging diverged sessions.
- Copying file-edit history, so rewind doesn't reach edits made before a handoff.
