import * as p from "@clack/prompts";
import { addPrimary, checkNewName, loadAccounts, savedAccounts, type Account } from "../accounts";
import { allHarnesses, getHarness, type Harness } from "../harness";
import { onPath } from "../paths";
import { authStatus, runTool } from "../process";
import { busy } from "../spinner";
import { addAccount } from "./add";
import { accountTable } from "./list";

// The guided first run: pick the agents, name each one's primary login, add more accounts and log in to each.
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

  for (const harness of chosen) {
    if (!(await setUpAgent(harness))) return cancelled();
  }

  p.note(await accountTable(loadAccounts()), "Your accounts");
  const extra = loadAccounts().find((a) => !a.isDefault);
  const primary = extra && loadAccounts().find((a) => a.isDefault && a.harness === extra.harness);
  p.outro(
    extra && primary
      ? `Run ${extra.name} with: handova ${extra.name}\n   When ${primary.name} hits its limit: handova handoff ${primary.name} ${extra.name}`
      : "Add more accounts any time with: handova add <name>",
  );
  return 0;
}

// Returns false when the person cancels.
async function setUpAgent(harness: Harness): Promise<boolean> {
  const primary = await namePrimary(harness);
  if (!primary || !(await ensureLoggedIn(primary, harness, `Your primary ${harness.name} login is "${primary.name}"`))) {
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
      placeholder: suggestName(harness.id === "claude" ? "work" : `${harness.id}-work`),
      defaultValue: suggestName(harness.id === "claude" ? "work" : `${harness.id}-work`),
      validate: (value) => nameProblem(value || suggestName(harness.id === "claude" ? "work" : `${harness.id}-work`)),
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

// Names the agent's primary login the first time setup sees it. Returns undefined when the person cancels.
async function namePrimary(harness: Harness): Promise<Account | undefined> {
  const saved = savedAccounts().find((a) => a.isDefault && a.harness === harness.id);
  if (saved) return saved;

  const probe: Account = { name: harness.defaultAccountName, dir: harness.defaultDir(), isDefault: true, harness: harness.id };
  const status = await busy(authStatus(probe));
  const who = status?.loggedIn && status.email ? ` (${status.email})` : "";
  const suggestion = suggestName(harness.defaultAccountName);
  const name = await p.text({
    message: `What should we call your primary ${harness.name} login${who}?`,
    placeholder: suggestion,
    defaultValue: suggestion,
    validate: (value) => nameProblem(value || suggestion),
  });
  if (p.isCancel(name)) return undefined;
  return addPrimary(harness, name);
}

function suggestName(base: string): string {
  // Only saved accounts count: on a first run the detected primary logins aren't on the list yet.
  const taken = new Set(savedAccounts().map((a) => a.name));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

function nameProblem(name: string): string | undefined {
  try {
    checkNewName(name, savedAccounts());
    return undefined;
  } catch (error) {
    return (error as Error).message;
  }
}

function cancelled(): number {
  p.cancel("Setup stopped. Anything already added is kept; run handova setup again to continue.");
  return 1;
}
