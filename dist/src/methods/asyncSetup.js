"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncSetup = void 0;
async function asyncSetup() {
    if (!this.runtime) {
        this.logger.error(`Runtime is not defined. Exiting ...`);
        process.exit(1);
    }
    if (!this.storageProvider) {
        this.logger.error(`Storage Provider is not defined. Exiting ...`);
        process.exit(1);
    }
    if (!this.compression) {
        this.logger.error(`Compression is not defined. Exiting ...`);
        process.exit(1);
    }
    if (!this.cache) {
        this.logger.error(`Cache is not defined. Exiting ...`);
        process.exit(1);
    }
    this.client = await this.sdk.fromMnemonic(this.mnemonic);
}
exports.asyncSetup = asyncSetup;
