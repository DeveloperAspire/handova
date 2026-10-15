import { spawn } from "node:child_process";

export interface Captured {
  status: number | null;
  stdout: string;
  stderr: string;
  /** Set when the command couldn't be started at all, e.g. it isn't installed. */
  error?: Error;
}

// Runs a command and collects its output without blocking, so spinners keep animating and several checks can
// run at once.
export function capture(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<Captured> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) => resolve({ status: null, stdout, stderr, error }));
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}
