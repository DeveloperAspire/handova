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
    title: "Run your coding agent under an account",
    parts: [{ text: "handova" }, { text: "work", label: "account" }, { text: "--continue", label: "passed to the tool" }],
    body: "Opens the account's coding agent, Claude Code or Codex, logged in as work. Anything after the account name is passed to it, so it works the same as running the agent yourself.",
    options: [
      ["handova work", "starts a new conversation"],
      ["handova work --continue", "reopens the last conversation in this folder"],
      ["handova work --resume", "lists past conversations to pick from"],
    ],
  },
  {
    id: "handoff",
    title: "Hand a conversation to another account",
    parts: [{ text: "handova" }, { text: "handoff", label: "action" }, { text: "personal", label: "from" }, { text: "work", label: "to" }],
    body: "Run it in the folder you were working in. It finds your latest conversation there on personal, names the organization it's going to and asks first, copies the conversation (and, for Claude Code, that folder's memory) to work, and opens it there. Any two accounts of the same agent work: handova handoff work client, or back again with handova handoff work personal.",
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
    parts: [{ text: "handova" }, { text: "add", label: "action" }, { text: "client", label: "name you choose" }],
    body: "Creates a folder for the account, shares your instructions and skills with it, copies your settings, then opens the login. It's a Claude Code account unless you pick another agent.",
    options: [
      ["--agent codex", "make it a Codex account"],
      ["--dir <folder>", "use a folder you already have"],
      ["--no-share", "start without your shared files"],
      ["--no-login", "skip the login step"],
    ],
  },
  {
    id: "list",
    title: "List accounts",
    parts: [{ text: "handova" }, { text: "list", label: "action" }],
    body: "Shows every account with its agent, email, organization and folder.",
  },
  {
    id: "remove",
    title: "Remove an account",
    parts: [{ text: "handova" }, { text: "remove", label: "action" }, { text: "work", label: "account" }, { text: "--purge", label: "optional" }],
    body: "Forgets the account and keeps its folder and login. With --purge, it also logs the account out and deletes its folder, after asking. It never deletes an agent's normal folder.",
  },
  {
    id: "rename",
    title: "Rename an account",
    parts: [{ text: "handova" }, { text: "rename", label: "action" }, { text: "work", label: "current name" }, { text: "office", label: "new name" }],
    body: "Changes only the name; the folder and login stay the same. Works for your normal logins too, so personal can become claude or anything you like.",
  },
  {
    id: "doctor",
    title: "Check everything",
    parts: [{ text: "handova" }, { text: "doctor", label: "action" }],
    body: "Checks that each account's coding agent is installed, every account is logged in, and the shared links still work. For anything wrong, it says how to fix it.",
  },
  {
    id: "shell-init",
    title: "Print shortcuts",
    parts: [{ text: "handova" }, { text: "shell-init", label: "action" }],
    body: 'Prints a claude-<account> shortcut for each account. Add eval "$(handova shell-init)" to your shell profile to use them.',
  },
];
