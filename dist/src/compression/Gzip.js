"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gzip = void 0;
const zlib_1 = require("zlib");
class Gzip {
    constructor() {
        this.name = "Gzip";
    }
    async compress(bundle) {
        return (0, zlib_1.gzipSync)(Buffer.from(JSON.stringify(bundle)));
    }
    async decompress(data) {
        return JSON.parse((0, zlib_1.gunzipSync)(data).toString());
    }
}
exports.Gzip = Gzip;
