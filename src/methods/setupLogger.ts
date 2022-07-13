import { Node } from "..";
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { ILogObject, Logger } from "tslog";

export function setupLogger(this: Node): Logger {
  if (!existsSync("./logs")) {
    mkdirSync("./logs");
  }

  const logToTransport = (log: ILogObject) => {
    appendFileSync(`./logs/${this.name}.txt`, JSON.stringify(log) + "\n");
  };

  const logger = new Logger({
    displayFilePath: "hidden",
    displayFunctionName: false,
  });

  logger.setSettings({
    minLevel: this.verbose ? undefined : "info",
  });

  logger.attachTransport({
    silly: logToTransport,
    debug: logToTransport,
    trace: logToTransport,
    info: logToTransport,
    warn: logToTransport,
    error: logToTransport,
    fatal: logToTransport,
  });

  return logger;
}
