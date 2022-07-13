"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonFileCache = void 0;
const jsonfile_1 = require("jsonfile");
const fs_1 = require("fs");
const fs_extra_1 = __importDefault(require("fs-extra"));
class JsonFileCache {
    constructor() {
        this.name = "JsonFileCache";
    }
    init(path) {
        this.path = path;
        if (!(0, fs_1.existsSync)(this.path)) {
            (0, fs_1.mkdirSync)(this.path, { recursive: true });
        }
        return this;
    }
    async put(key, value) {
        await (0, jsonfile_1.writeFile)(`${this.path}/${key}.json`, value);
    }
    async get(key) {
        return await (0, jsonfile_1.readFile)(`${this.path}/${key}.json`);
    }
    async del(key) {
        await fs_1.promises.unlink(`${this.path}/${key}.json`);
    }
    async drop() {
        await fs_extra_1.default.emptyDir(`${this.path}/`);
    }
    async exists(key) {
        return await fs_extra_1.default.pathExists(`${this.path}/${key}.json`);
    }
}
exports.JsonFileCache = JsonFileCache;
