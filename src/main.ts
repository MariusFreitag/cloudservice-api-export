import { readFile } from "fs/promises";
import { join } from "path";
import Executor from "./executor";
import { createLogger } from "./logger";

async function main() {
  const config = JSON.parse(await readFile(join(__dirname, "..", "private", "config.json"), "utf-8"));
  const variables = config.variables as Record<string, string>;

  // Replace variables in step config
  let rawSteps = JSON.stringify(config.steps);
  for (const [key, value] of Object.entries(variables)) {
    rawSteps = rawSteps.replace(
      new RegExp(`\\$${key}`, "g"),
      value.startsWith("$") ? process.env[value.substring(1)] ?? value : value,
    );
  }

  const executor = new Executor(createLogger("Executor"), { steps: JSON.parse(rawSteps) });
  await executor.execute();
}
main();
