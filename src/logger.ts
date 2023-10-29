export type Logger = {
  info(...message: string[] | number[]): void;
  normal(...message: string[] | number[]): void;
  attention(...message: string[] | number[]): void;
  success(...message: string[] | number[]): void;
};

export function createLogger(prefix: string): Logger {
  return {
    info: (...message: string[] | number[]) =>
      console.log(`\x1b[2m${prefix.padEnd(15, " ")} |\x1b[0m \x1b[2m${message.join(" ")}\x1b[0m`),
    normal: (...message: string[] | number[]) =>
      console.log(`\x1b[2m${prefix.padEnd(15, " ")} |\x1b[0m \x1b[1m${message.join(" ")}\x1b[0m`),
    attention: (...message: string[] | number[]) =>
      console.log(`\x1b[2m${prefix.padEnd(15, " ")} |\x1b[0m \x1b[1m\x1b[34m${message.join(" ")}\x1b[0m`),
    success: (...message: string[] | number[]) =>
      console.log(`\x1b[2m${prefix.padEnd(15, " ")} |\x1b[0m \x1b[1m\x1b[32m${message.join(" ")}\x1b[0m`),
  };
}
