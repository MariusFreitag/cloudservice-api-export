import { readFile } from "fs/promises";
import { join } from "path";
import Executor, { ExecutionStep } from "./executor";
import { LogLevel, createLogger } from "./logger";

/**
 * Type of the configuration JSON file that
 * can be provided as first and only CLI argument.
 *
 * Default path: {@link defaultConfigPath}
 *
 */
export type Configuration = {
  /** default: `{}` */
  variables: Record<string, string>;
  /** default: "normal" */
  logLevel: LogLevel;
  /** default: see {@link defaultSteps} */
  steps: ExecutionStep[];
};

/**
 * Points to `<project-root>/private/config.json`.
 */
const defaultConfigPath = join(__dirname, "..", "private", "config.json");

/**
 * Requires a config file with the following variables:
 *
 * ```
 * {
 *   "variables": {
 *     "OUTPUT_DIR": "",
 *     "CLOUDFLARE_TOKEN": "",
 *     "GITHUB_API_URL": "",
 *     "GITHUB_USERNAME": "",
 *     "GITHUB_TOKEN": "",
 *     "GITHUB_REPO": "",
 *     "GOOGLE_CLIENT_ID": "",
 *     "GOOGLE_CLIENT_SECRET": ""
 *   }
 * }
 * ```
 */
const defaultSteps: ExecutionStep[] = [
  {
    type: "Cloudflare",
    id: "Cloudflare",
    credentials: {
      token: "$CLOUDFLARE_TOKEN",
    },
    features: {
      details: true,
    },
    target: {
      overview: "$OUTPUT_DIR/cloudflare",
      details: "$OUTPUT_DIR/cloudflare",
    },
  },
  {
    type: "GitHub",
    id: "GitHub",
    credentials: {
      apiUrl: "$GITHUB_API_URL",
      username: "$GITHUB_USERNAME",
      accessToken: "$GITHUB_TOKEN",
    },
    repositories: ["$GITHUB_REPO"],
    features: {
      issueComments: true,
    },
    target: {
      issues: "$OUTPUT_DIR/github",
    },
  },
  {
    type: "Google",
    id: "Google",
    credentials: {
      installed: {
        client_id: "$GOOGLE_CLIENT_ID",
        client_secret: "$GOOGLE_CLIENT_SECRET",
      },
    },
    tokenCachePath: "$OUTPUT_DIR/google/google-token-cache.json",
    authPort: "3124",
    features: {
      calendars: true,
      contacts: true,
    },
    target: {
      calendars: "$OUTPUT_DIR/google",
      contacts: "$OUTPUT_DIR/google",
    },
  },
];

async function main() {
  // Read configuration and apply defaults
  const configPath = process.argv[2] ?? defaultConfigPath;
  const config: Configuration = JSON.parse(await readFile(configPath, "utf-8"));
  config.variables ??= {};
  config.logLevel ??= "normal";
  config.steps ??= defaultSteps;
  const variables = config.variables;

  // Replace variables in step config
  let rawSteps = JSON.stringify(config.steps);
  for (const [key, value] of Object.entries(variables)) {
    rawSteps = rawSteps.replace(
      new RegExp(`\\$${key}`, "g"),
      value.startsWith("$") ? process.env[value.substring(1)] ?? value : value,
    );
  }

  // Execute export steps
  const executor = new Executor(createLogger("Executor", config.logLevel), { steps: JSON.parse(rawSteps) });
  await executor.execute();
}
main();
