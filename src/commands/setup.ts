import * as p from "@clack/prompts";
import { ensureNormalLogins, loadAccounts, validateName, type Account } from "../accounts";
import { allHarnesses, getHarness, type Harness } from "../harness";
import { onPath } from "../paths";
import { authStatus, runTool } from "../process";
import { busy } from "../spinner";
import { addAccount } from "./add";
import { accountTable } from "./list";

// The guided first run: pick the agents, confirm the normal logins, add more accounts and log in to each.
export async function setupCommand(): Promise<number> {
  if (!process.stdin.isTTY) throw new Error("handova setup asks questions, so run it in a terminal.");
  p.intro("Welcome to Handova");

  const installed = allHarnesses().filter((harness) => onPath(harness.bin()));
  if (!installed.length) {
    p.cancel("Neither Claude Code nor Codex is installed. Install one, then run handova setup again.");
    return 1;
  }

  let chosen = installed;
  if (installed.length === 1) {
    p.log.info(`Found ${installed[0].name}.`);
  } else {
    const choice = await p.select({
      message: "Which agents do you want more than one account for?",
      options: [
        { value: "both", label: installed.map((h) => h.name).join(" and ") },
        ...installed.map((h) => ({ value: h.id, label: `${h.name} only` })),
      ],
    });
    if (p.isCancel(choice)) return cancelled();
    chosen = choice === "both" ? installed : [getHarness(choice)];
  }

  ensureNormalLogins(chosen);
  for (const harness of chosen) {
    if (!(await setUpAgent(harness))) return cancelled();
  }

  p.note(await accountTable(loadAccounts()), "Your accounts");
  const extra = loadAccounts().find((a) => !a.isDefault);
  const normal = extra && loadAccounts().find((a) => a.isDefault && a.harness === extra.harness);
  p.outro(
    extra && normal
      ? `Run ${extra.name} with: handova ${extra.name}\n   When ${normal.name} hits its limit: handova handoff ${normal.name} ${extra.name}`
      : "Add more accounts any time with: handova add <name>",
  );
  return 0;
}

// Returns false when the person cancels.
async function setUpAgent(harness: Harness): Promise<boolean> {
  const normal = loadAccounts().find((a) => a.isDefault && a.harness === harness.id);
  if (normal && !(await ensureLoggedIn(normal, harness, `${harness.name}: your normal login is "${normal.name}"`))) {
    return false;
  }

  for (let added = 0; ; added++) {
    const more = await p.confirm({
      message: added ? `Add one more ${harness.name} account?` : `Add another ${harness.name} account?`,
      initialValue: added === 0,
    });
    if (p.isCancel(more)) return false;
    if (!more) return true;

    const name = await p.text({
      message: `Name for the new ${harness.name} account`,
      placeholder: suggestName(harness),
      defaultValue: suggestName(harness),
      validate: (value) => nameProblem(value || suggestName(harness)),
    });
    if (p.isCancel(name)) return false;

    const account = addAccount(name, { agent: harness.id, share: true, login: false });
    p.log.success(`Added "${account.name}". Your instructions and skills are shared with it.`);
    if (!(await ensureLoggedIn(account, harness, `Log in to "${account.name}"`))) return false;
  }
}

async function ensureLoggedIn(account: Account, harness: Harness, label: string): Promise<boolean> {
  const status = await busy(authStatus(account));
  if (status?.loggedIn) {
    p.log.info(`${label}, logged in as ${[status.email, status.orgName].filter(Boolean).join(", ")}.`);
    return true;
  }
  const login = await p.confirm({ message: `${label}, which isn't logged in yet. Log in now?` });
  if (p.isCancel(login)) return false;
  if (login) await runTool(account, harness.loginArgs);
  return true;
}

function suggestName(harness: Harness): string {
  const base = harness.id === "claude" ? "work" : `${harness.id}-work`;
  const taken = new Set(loadAccounts().map((a) => a.name));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

function nameProblem(name: string): string | undefined {
  try {
    validateName(name);
  } catch (error) {
    return (error as Error).message;
  }
  if (loadAccounts().some((a) => a.name === name)) return `There's already an account named "${name}".`;
  return undefined;
}

function cancelled(): number {
  p.cancel("Setup stopped. Anything already added is kept; run handova setup again to continue.");
  return 1;
}
