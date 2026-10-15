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
  newAccountDir(account: string): string;
  /** Linked from the default account into new ones, so edits show up everywhere. */
  sharedLinks: string[];
  /** Copied into new accounts, so each can change its own. */
  sharedCopies: string[];
  authStatus(env: NodeJS.ProcessEnv): AuthStatus | undefined;
  loginArgs: string[];
  logoutArgs: string[];
  resumeArgs(sessionId: string): string[];
  projectsDir(configDir: string): string;
  /** The folder holding sessions started in cwd, if there are any. */
  findProject(configDir: string, cwd: string): string | undefined;
  listSessions(projectDir: string): Session[];
  memoryDir(projectDir: string): string;
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
