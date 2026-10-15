// Read from the CLI's package.json so the site never shows a stale version.
import pkg from "../../../package.json";

export const version = pkg.version;
export const repo = "https://github.com/DeveloperAspire/handova";
export const npm = "https://www.npmjs.com/package/handova";
export const installCommands = [
  { manager: "npm", command: "npm install -g handova" },
  { manager: "pnpm", command: "pnpm add -g handova" },
  { manager: "yarn", command: "yarn global add handova", note: "Yarn 2 and later have no global installs. Use Yarn 1, or one of the others." },
  { manager: "bun", command: "bun add -g handova" },
];
