export type Logger = {
  info(...message: string[] | number[]): void;
  normal(...message: string[] | number[]): void;
  success(...message: string[] | number[]): void;
  attention(...message: string[] | number[]): void;
  createLogger(prefix: string): Logger;
};

export type LogLevel = "verbose" | "normal" | "silent";

function print(prefix: string, modifier: string, shouldPrint: boolean, message: string[] | number[]) {
  if (shouldPrint) {
    console.log(`\x1b[2m${prefix.padEnd(16, " ")} |\x1b[0m ${modifier}${message.join(" ")}\x1b[0m`);
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
    info: (...message: string[] | number[]) => print(prefix, "\x1b[2m", logLevel === "verbose", message),
    normal: (...message: string[] | number[]) => print(prefix, "\x1b[1m", logLevel !== "silent", message),
    success: (...message: string[] | number[]) =>
      print(prefix, "\x1b[1m\x1b[32m", logLevel !== "silent", message),
    attention: (...message: string[] | number[]) => print(prefix, "\x1b[1m\x1b[34m", true, message),
    createLogger: (prefix) => createLogger(prefix, logLevel),
  };
}
