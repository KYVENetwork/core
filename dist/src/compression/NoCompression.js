"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoCompression = void 0;
class NoCompression {
    constructor() {
        this.name = "NoCompression";
    }
    async compress(bundle) {
        return Buffer.from(JSON.stringify(bundle));
    }
    async decompress(data) {
        return JSON.parse(data.toString());
    }
}
exports.NoCompression = NoCompression;
