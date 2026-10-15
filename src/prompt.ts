import * as p from "@clack/prompts";

export async function confirm(message: string): Promise<boolean> {
  if (!process.stdin.isTTY) throw new Error("This needs a confirmation. Run it again with --yes.");
  return (await p.confirm({ message })) === true;
}
