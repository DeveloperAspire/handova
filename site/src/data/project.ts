// Read from the CLI's package.json so the site never shows a stale version.
import pkg from "../../../package.json";

export const version = pkg.version;
export const repo = "https://github.com/DeveloperAspire/ccswap";
export const npm = "https://www.npmjs.com/package/ccswap";
export const installCommands = [
  { manager: "npm", command: "npm install -g ccswap" },
  { manager: "pnpm", command: "pnpm add -g ccswap" },
  { manager: "yarn", command: "yarn global add ccswap", note: "Yarn 2 and later have no global installs. Use Yarn 1, or one of the others." },
  { manager: "bun", command: "bun add -g ccswap" },
];
