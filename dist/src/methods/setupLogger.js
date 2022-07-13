"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupLogger = void 0;
const fs_1 = require("fs");
const tslog_1 = require("tslog");
function setupLogger() {
    if (!(0, fs_1.existsSync)("./logs")) {
        (0, fs_1.mkdirSync)("./logs");
    }
    const logToTransport = (log) => {
        (0, fs_1.appendFileSync)(`./logs/${this.name}.txt`, JSON.stringify(log) + "\n");
    };
    const logger = new tslog_1.Logger({
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
exports.setupLogger = setupLogger;
