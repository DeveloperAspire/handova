// Mirrors the Commands section of the README and the docs page. Keep them in sync.
export interface Part {
  text: string;
  label?: string;
}

export interface Command {
  id: string;
  title: string;
  /** One line for the cards on the landing page. */
  short: string;
  parts: Part[];
  body: string;
  options?: [string, string][];
}

export const commands: Command[] = [
  {
    id: "setup",
    title: "Guided setup",
    short: "Pick your agents, name your primary logins, add accounts and log in.",
    parts: [{ text: "handova" }, { text: "setup", label: "action" }],
    body: "Asks whether you want more than one account for Claude Code, Codex or both (only installed agents are offered), asks what to call your primary login for each, then adds the accounts you name and logs you in to each. Run it again any time to add more.",
  },
  {
    id: "run",
    title: "Run your coding agent under an account",
    short: "Open Claude Code or Codex logged in as that account.",
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
    short: "Move a conversation to another account of the same agent.",
    parts: [{ text: "handova" }, { text: "handoff", label: "action" }, { text: "personal", label: "from" }, { text: "work", label: "to" }],
    body: "Both accounts must be the same agent: Claude Code to Claude Code, or Codex to Codex. Run it in the folder you were working in. It finds your latest conversation there on personal, asks before sending it to work, copies it (plus that folder's memory, for Claude Code) and opens it there. Hand it back with handova handoff work personal.",
    options: [
      ["--pick", "choose the conversation from a list"],
      ["--session <id>", "hand over one specific conversation"],
      ["--no-memory", "copy only the conversation"],
      ["--no-resume", "copy without opening the agent"],
      ["--yes", "skip the confirmation"],
    ],
  },
  {
    id: "add",
    title: "Add an account",
    short: "Add an account, choose its agent and log in to it.",
    parts: [{ text: "handova" }, { text: "add", label: "action" }, { text: "client", label: "name you choose" }],
    body: "Asks which agent the account is for (unless you have only one installed), creates a folder for it, shares your instructions and skills, copies your settings, then opens the login.",
    options: [
      ["--agent claude|codex", "say which agent, so it doesn't ask"],
      ["--dir <folder>", "use a folder you already have"],
      ["--no-share", "start without your shared files"],
      ["--no-login", "skip the login step"],
    ],
  },
  {
    id: "list",
    title: "List accounts",
    short: "See every account, its agent, email and organization.",
    parts: [{ text: "handova" }, { text: "list", label: "action" }],
    body: "Shows every account with its agent, email, organization and folder.",
  },
  {
    id: "remove",
    title: "Remove an account",
    short: "Take an account off the list, or delete its folder too.",
    parts: [{ text: "handova" }, { text: "remove", label: "action" }, { text: "work", label: "account" }, { text: "--purge", label: "optional" }],
    body: "Forgets the account and keeps its folder and login. With --purge, it also logs the account out and deletes its folder, after asking. It never deletes an agent's usual folder.",
  },
  {
    id: "rename",
    title: "Rename an account",
    short: "Change an account's name; folder and login stay put.",
    parts: [{ text: "handova" }, { text: "rename", label: "action" }, { text: "work", label: "current name" }, { text: "office", label: "new name" }],
    body: "Changes only the name; the folder and login stay the same. Works for your primary logins too, so personal can become main or anything you like.",
  },
  {
    id: "doctor",
    title: "Check everything",
    short: "Check each agent, every login and the shared links.",
    parts: [{ text: "handova" }, { text: "doctor", label: "action" }],
    body: "Checks that each account's coding agent is installed, every account is logged in, and the shared links still work. For anything wrong, it says how to fix it.",
  },
  {
    id: "shell-init",
    title: "Print shortcuts",
    short: "Print claude-work style shortcuts for your shell.",
    parts: [{ text: "handova" }, { text: "shell-init", label: "action" }],
    body: 'Prints a claude-<account> shortcut for each account. Add eval "$(handova shell-init)" to your shell profile to use them.',
  },
];
