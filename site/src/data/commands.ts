// Mirrors the Commands section of the README. Keep the two in sync.
export interface Part {
  text: string;
  label?: string;
}

export interface Command {
  id: string;
  title: string;
  parts: Part[];
  body: string;
  options?: [string, string][];
}

export const commands: Command[] = [
  {
    id: "run",
    title: "Run Claude Code under an account",
    parts: [{ text: "ccswap" }, { text: "work", label: "account" }, { text: "--continue", label: "passed to Claude" }],
    body: "Opens Claude Code logged in as work. Anything after the account name works the same as it does with plain claude.",
    options: [
      ["ccswap work", "starts a new conversation"],
      ["ccswap work --continue", "reopens the last conversation in this folder"],
      ["ccswap work --resume", "lists past conversations to pick from"],
    ],
  },
  {
    id: "handoff",
    title: "Hand a conversation to another account",
    parts: [{ text: "ccswap" }, { text: "handoff", label: "action" }, { text: "personal", label: "from" }, { text: "work", label: "to" }],
    body: "Run it in the folder you were working in. It finds your latest conversation there on personal, names the organization it's going to and asks first, copies the conversation and memory to work, and opens it there. Any two accounts work: ccswap handoff work client, or back again with ccswap handoff work personal.",
    options: [
      ["--pick", "choose the conversation from a list"],
      ["--session <id>", "hand over one specific conversation"],
      ["--no-memory", "copy only the conversation"],
      ["--no-resume", "copy without opening Claude"],
      ["--yes", "skip the confirmation"],
    ],
  },
  {
    id: "add",
    title: "Add an account",
    parts: [{ text: "ccswap" }, { text: "add", label: "action" }, { text: "client", label: "name you choose" }],
    body: "Creates ~/.claude-client, shares your CLAUDE.md, skills, agents and commands with it, copies settings.json, then opens the login.",
    options: [
      ["--dir <folder>", "use a folder you already have"],
      ["--no-share", "start without your shared files"],
      ["--no-login", "skip the login step"],
    ],
  },
  {
    id: "list",
    title: "List accounts",
    parts: [{ text: "ccswap" }, { text: "list", label: "action" }],
    body: "Shows every account with its email, organization and folder.",
  },
  {
    id: "remove",
    title: "Remove an account",
    parts: [{ text: "ccswap" }, { text: "remove", label: "action" }, { text: "work", label: "account" }, { text: "--purge", label: "optional" }],
    body: "Forgets the account and keeps its folder and login. With --purge, it also logs the account out and deletes its folder, after asking.",
  },
  {
    id: "doctor",
    title: "Check everything",
    parts: [{ text: "ccswap" }, { text: "doctor", label: "action" }],
    body: "Checks that Claude Code is installed, every account is logged in, and the shared links still work. For anything wrong, it says how to fix it.",
  },
  {
    id: "shell-init",
    title: "Print shortcuts",
    parts: [{ text: "ccswap" }, { text: "shell-init", label: "action" }],
    body: 'Prints a claude-<account> shortcut for each account. Add eval "$(ccswap shell-init)" to your shell profile to use them.',
  },
];
