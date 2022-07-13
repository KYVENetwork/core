"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChecksum = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = require("fs");
const getChecksum = (path) => {
    return new Promise((resolve, reject) => {
        const hash = crypto_1.default.createHash("sha256");
        const input = (0, fs_1.createReadStream)(path);
        input.on("error", reject);
        input.on("data", (chunk) => {
            hash.update(chunk);
        });
        input.on("close", () => {
            resolve(hash.digest("hex"));
        });
    });
};
exports.getChecksum = getChecksum;
const main = async () => {
    const files = (0, fs_1.readdirSync)(`./out/`);
    let result = "";
    for (let file of files) {
        const checksum = await (0, exports.getChecksum)(`./out/${file}`);
        console.log(`${file} -> ${checksum}`);
        result += `${checksum} ${file}\n`;
    }
    (0, fs_1.writeFileSync)(`./out/checksum.txt`, result);
};
main();
