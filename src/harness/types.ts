// A coding tool handova can run under several accounts. Each tool keeps an account's login and history in a
// config folder that an environment variable points at; the rest describes where things live in that folder.
export interface Harness {
  id: string;
  /** Shown in messages, e.g. "Claude Code". */
  name: string;
  bin(): string;
  /** The environment variable that points the tool at a config folder. Unset for the default account. */
  configEnv: string;
  defaultDir(): string;
  /** What Handova calls the agent's normal login when it adds it on first run. */
  defaultAccountName: string;
  newAccountDir(account: string): string;
  /** Linked from the default account into new ones, so edits show up everywhere. */
  sharedLinks: string[];
  /** Copied into new accounts, so each can change its own. */
  sharedCopies: string[];
  authStatus(env: NodeJS.ProcessEnv): AuthStatus | undefined;
  loginArgs: string[];
  logoutArgs: string[];
  resumeArgs(sessionId: string): string[];
  /** Sessions started in cwd, newest first. Their files live inside configDir; a handoff copies them to the
   * same relative path in the other account's folder. */
  listSessions(configDir: string, cwd: string): Session[];
  /** The tool's memory for cwd, if it keeps memory per project as files. Absent when it doesn't. */
  memoryDir?(configDir: string, cwd: string): string | undefined;
}

export interface AuthStatus {
  loggedIn: boolean;
  email?: string;
  orgName?: string;
  subscriptionType?: string;
}

export interface Session {
  id: string;
  file: string;
  /** A folder of extra files belonging to the session (subagent transcripts, saved output), if the tool has one. */
  extras?: string;
  modified: Date;
  firstPrompt?: string;
}
