"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNetwork = exports.parseDesiredStake = exports.parseKeyfile = exports.parseMnemonic = exports.parsePoolId = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const commander_1 = __importDefault(require("commander"));
const fs_1 = require("fs");
const parsePoolId = (value) => {
    const parsedValue = parseInt(value);
    if (isNaN(parsedValue)) {
        throw new commander_1.default.InvalidArgumentError("PoolId must be of type number.");
    }
    return parsedValue;
};
exports.parsePoolId = parsePoolId;
const parseMnemonic = (value) => {
    const parsedValue = value.split(" ");
    if (!(parsedValue.length === 12 || parsedValue.length === 24)) {
        throw new commander_1.default.InvalidArgumentError("Mnemonic must have 12 or 24 words.");
    }
    return value;
};
exports.parseMnemonic = parseMnemonic;
const parseKeyfile = (value) => {
    if (!(0, fs_1.existsSync)(value)) {
        throw new commander_1.default.InvalidArgumentError(`Keyfile does not exist in path ${value}.`);
    }
    return value;
};
exports.parseKeyfile = parseKeyfile;
const parseDesiredStake = (value) => {
    const parsedValue = new bignumber_js_1.default(value);
    if (parsedValue.toString() === "NaN") {
        throw new commander_1.default.InvalidArgumentError("Desired stake must be of type number.");
    }
    return value;
};
exports.parseDesiredStake = parseDesiredStake;
const parseNetwork = (value) => {
    if (!["local", "alpha", "beta", "korellia"].includes(value)) {
        throw new commander_1.default.InvalidArgumentError("Network must be either 'local', 'alpha', 'beta' or 'korellia'.");
    }
    return value;
};
exports.parseNetwork = parseNetwork;
