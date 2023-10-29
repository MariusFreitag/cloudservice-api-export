import { readFile } from "fs/promises";
import { join } from "path";
import Executor from "./executor";
import { createLogger } from "./logger";

async function main() {
  let rawConfig = await readFile(join(__dirname, "..", "private", "config.json"), "utf-8");
  rawConfig = rawConfig.replace(/\$DIR/g, join(__dirname, "..", "private", "output"));
  const config = JSON.parse(rawConfig);
  const executor = new Executor(createLogger("Executor"), config);
  await executor.execute();
}
main();
