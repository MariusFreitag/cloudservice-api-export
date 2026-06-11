export type Logger = {
  inlineInfo(...message: string[] | number[]): void;
  info(...message: string[] | number[]): void;
  normal(...message: string[] | number[]): void;
  success(...message: string[] | number[]): void;
  attention(...message: string[] | number[]): void;
  createLogger(prefix: string): Logger;
  createSubLogger(prefixSuffix: string): Logger;
};

export type LogLevel = "verbose" | "normal" | "silent";

function print(
  prefix: string | null,
  modifier: string,
  shouldPrint: boolean,
  newLine: boolean,
  message: string[] | number[],
) {
  if (shouldPrint) {
    if (prefix) {
      process.stdout.write(`\x1b[2m${prefix.padEnd(16, " ")} | \x1b[0m`);
    }
    process.stdout.write(`${modifier}${message.join(" ")}\x1b[0m`);
    if (newLine) {
      process.stdout.write("\n");
    }
  }
}

/**
 * Creates a logger instance that can also be used to create new instances
 * with different prefixes.
 *
 * The log levels are defined as follows:
 *
 * - "verbose": Log `info`, `normal`, `attention`, and `success` messages
 * - "normal": Log `normal`, `attention`, and `success` messages
 * - "silent": Log `attention` messages
 */
export function createLogger(prefix: string, logLevel: LogLevel): Logger {
  return {
    inlineInfo: (...message: string[] | number[]) =>
      print(null, "\x1b[2m", logLevel === "verbose", false, message),
    info: (...message: string[] | number[]) =>
      print(prefix, "\x1b[2m", logLevel === "verbose", true, message),
    normal: (...message: string[] | number[]) =>
      print(prefix, "\x1b[1m", logLevel !== "silent", true, message),
    success: (...message: string[] | number[]) =>
      print(prefix, "\x1b[1m\x1b[32m", logLevel !== "silent", true, message),
    attention: (...message: string[] | number[]) => print(prefix, "\x1b[1m\x1b[34m", true, true, message),
    createLogger: (prefix) => createLogger(prefix, logLevel),
    createSubLogger: (prefixSuffix) => createLogger(prefix + prefixSuffix, logLevel),
  };
}
