"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = exports.standardizeJSON = exports.fromBytes = exports.toBytes = exports.callWithBackoffStrategy = exports.sleep = exports.toHumanReadable = exports.toBN = void 0;
const base64url_1 = __importDefault(require("base64url"));
const bignumber_js_1 = require("bignumber.js");
const crypto_1 = __importDefault(require("crypto"));
const toBN = (amount) => {
    return new bignumber_js_1.BigNumber(amount);
};
exports.toBN = toBN;
const toHumanReadable = (amount, stringDecimals = 4) => {
    const fmt = new bignumber_js_1.BigNumber(amount || "0")
        .div(10 ** 9)
        .toFixed(stringDecimals, 1);
    if (stringDecimals > 1) {
        return `${fmt.split(".")[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fmt.split(".")[1]}`;
    }
    return fmt.split(".")[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
exports.toHumanReadable = toHumanReadable;
/**
 * @param timeout number in milliseconds or string e.g (1m, 3h, 20s)
 */
const sleep = (timeout) => {
    const timeoutMs = typeof timeout === "string" ? humanInterval(timeout) : timeout;
    return new Promise((resolve) => setTimeout(resolve, timeoutMs));
};
exports.sleep = sleep;
function humanInterval(str) {
    const multiplier = {
        ms: 1,
        s: 1000,
        m: 1000 * 60,
        h: 1000 * 60 * 60,
        d: 1000 * 60 * 60 * 24,
        w: 1000 * 60 * 60 * 24 * 7,
    };
    const intervalRegex = /^(\d+)(ms|[smhdw])$/;
    const errorConvert = new Error(`Can't convert ${str} to interval`);
    if (!str || typeof str !== "string" || str.length < 2)
        throw errorConvert;
    const matched = intervalRegex.exec(str.trim().toLowerCase());
    // must be positive number
    if (matched && matched.length > 1 && parseInt(matched[1]) > 0) {
        const key = matched[2];
        return parseInt(matched[1]) * multiplier[key];
    }
    throw errorConvert;
}
async function callWithBackoffStrategy(execution, option, onEachError) {
    const limitTimeout = typeof option.limitTimeout === "string"
        ? humanInterval(option.limitTimeout)
        : option.limitTimeout;
    const increaseBy = typeof option.increaseBy === "string"
        ? humanInterval(option.increaseBy)
        : option.increaseBy;
    let time = increaseBy;
    let requests = 1;
    return new Promise(async (resolve) => {
        while (true) {
            try {
                const result = await execution();
                return resolve(result);
            }
            catch (e) {
                if (onEachError) {
                    await onEachError(e, {
                        nextTimeoutInMs: time,
                        numberOfRetries: requests,
                        option,
                    });
                }
                await (0, exports.sleep)(time);
                if (time < limitTimeout) {
                    time += increaseBy;
                    if (time > limitTimeout)
                        time = limitTimeout;
                }
                if (option.maxRequests && requests >= option.maxRequests) {
                    throw e;
                }
                requests++;
            }
        }
    });
}
exports.callWithBackoffStrategy = callWithBackoffStrategy;
const toBytes = (input) => {
    return Buffer.from(base64url_1.default.decode(input, "hex"), "hex");
};
exports.toBytes = toBytes;
const fromBytes = (input) => {
    return base64url_1.default.encode(input.slice(2), "hex");
};
exports.fromBytes = fromBytes;
const standardizeJSON = (object) => JSON.parse(JSON.stringify(object));
exports.standardizeJSON = standardizeJSON;
const sha256 = (object) => {
    const sha256Hasher = crypto_1.default.createHmac("sha256", "");
    return sha256Hasher.update(JSON.stringify(object)).digest("hex");
};
exports.sha256 = sha256;
