"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBundle = exports.formatBundle = exports.dataSizeOfBinary = exports.dataSizeOfString = exports.fromBytes = exports.toBytes = exports.callWithBackoffStrategy = exports.sleep = exports.toHumanReadable = exports.toBN = void 0;
const base64url_1 = __importDefault(require("base64url"));
const bignumber_js_1 = require("bignumber.js");
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
const dataSizeOfString = (string) => {
    return new Uint8Array(new TextEncoder().encode(string)).byteLength || 0;
};
exports.dataSizeOfString = dataSizeOfString;
const dataSizeOfBinary = (binary) => {
    return new Uint8Array(binary).byteLength || 0;
};
exports.dataSizeOfBinary = dataSizeOfBinary;
// Inspired by https://github.com/Bundlr-Network/arbundles/blob/f3e8e1df09e68e33f3a51af33127999566ab3e37/src/utils.ts#L41-L85.
const longTo32ByteArray = (long) => {
    const byteArray = Buffer.alloc(32, 0);
    for (let index = 0; index < byteArray.length; index++) {
        const byte = long & 0xff;
        byteArray[index] = byte;
        long = (long - byte) / 256;
    }
    return Uint8Array.from(byteArray);
};
// Inspired by https://github.com/Bundlr-Network/arbundles/blob/f3e8e1df09e68e33f3a51af33127999566ab3e37/src/utils.ts#L87-L93.
const byteArrayToLong = (byteArray) => {
    let value = 0;
    for (let i = byteArray.length - 1; i >= 0; i--) {
        value = value * 256 + byteArray[i];
    }
    return value;
};
// Inspired by https://github.com/Bundlr-Network/arbundles/blob/1976030eba3953dcd7582e65b50217f893f6248d/src/ar-data-bundle.ts#L25-L64.
const formatBundle = (input) => {
    const offsets = new Uint8Array(32 * input.length);
    input.forEach((item, index) => {
        offsets.set(longTo32ByteArray(item.byteLength), 32 * index);
    });
    return Buffer.concat([
        longTo32ByteArray(input.length),
        offsets,
        Buffer.concat(input),
    ]);
};
exports.formatBundle = formatBundle;
// Inspired by https://github.com/Bundlr-Network/arbundles/blob/8a1509bc9596467d2f05003039da7e4de4d02ce3/src/Bundle.ts#L174-L199.
const parseBundle = (input) => {
    const count = byteArrayToLong(input.slice(0, 32));
    const itemStart = 32 + 32 * count;
    let offset = 0;
    const result = [];
    for (let i = 32; i < itemStart; i += 32) {
        const _offset = byteArrayToLong(input.slice(i, i + 32));
        result.push(input.slice(itemStart + offset, itemStart + offset + _offset));
        offset += _offset;
    }
    return result;
};
exports.parseBundle = parseBundle;
