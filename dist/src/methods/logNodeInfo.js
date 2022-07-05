"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logNodeInfo = void 0;
function logNodeInfo() {
    this.logger.info("Starting node ...\n");
    this.logger.info(`Name \t\t = ${this.name}`);
    this.logger.info(`Address \t\t = ${this.client.account.address}`);
    this.logger.info(`Pool Id \t\t = ${this.poolId}\n`);
    this.logger.info(`Runtime \t\t = ${this.runtime.name}`);
    this.logger.info(`Storage \t\t = ${this.storageProvider.name}`);
    this.logger.info(`Compression \t = ${this.compression.name}`);
    this.logger.info(`Cache \t\t = ${this.cache.name}\n`);
    this.logger.info(`Network \t\t = ${this.network}`);
    this.logger.info(`@kyve/core \t = v${this.coreVersion}`);
    this.logger.info(`${this.runtime.name} \t = v${this.runtime.version}\n`);
}
exports.logNodeInfo = logNodeInfo;
