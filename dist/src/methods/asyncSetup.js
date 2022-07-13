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
    try {
        this.client = await this.sdk.fromMnemonic(this.mnemonic);
    }
    catch (error) {
        this.logger.error(`Failed to init KYVE client from mnemonic. Exiting ...`);
        this.logger.debug(error);
        process.exit(1);
    }
    this.logNodeInfo();
    await this.syncPoolState();
    this.logger.debug(`Attempting to clear cache`);
    await this.cache.drop();
    this.logger.info(`Cleared cache\n`);
    this.validateRuntime();
    this.validateVersion();
    await this.setupStake();
    await this.syncPoolState();
    this.validateActiveNode();
}
exports.asyncSetup = asyncSetup;
