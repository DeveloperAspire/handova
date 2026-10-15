# cchandover: product notes

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

- Name `cchandover` (`cc` = Claude Code; avoids "claude" in a third-party name). Renamed from `ccswap` on
  15 October 2026, before the first npm release: a Python tool for the same job already ships as `ccswap` on
  PyPI (errhythm/ccswap), so both would install a `ccswap` command. `cchandover` was free on npm, PyPI and
  GitHub.
- TypeScript on Bun, published to npm for Node 20.16+, with a compiled binary as an extra.
- `personal` is Claude Code's default account and runs with `CLAUDE_CONFIG_DIR` unset; setting it even to
  `~/.claude` makes Claude Code look for a different login.
- Login state comes from `claude auth status --json`; login uses `claude auth login`.
- Handoff never overwrites. A target session the source extends is brought up to date; a diverged one is
  refused.
- Handoff names the target organization and asks before copying.

## Out of scope for now

- Migrating the author's own `.zshrc` aliases and `~/.claude-work` (he'll do it himself with
  `cchandover add work --dir ~/.claude-work`).
- Syncing in both directions or merging diverged sessions.
- Copying file-edit history, so rewind doesn't reach edits made before a handoff.
