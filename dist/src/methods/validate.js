"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateActiveNode = exports.validateVersion = exports.validateRuntime = void 0;
function validateRuntime() {
    if (this.pool.runtime !== this.runtime.name) {
        this.logger.error(`Specified pool does not match the integration runtime! Exiting ...`);
        this.logger.error(`Found = ${this.runtime.name} required = ${this.pool.runtime}`);
        process.exit(1);
    }
    this.logger.info(`Node running on runtime = ${this.runtime.name}`);
    this.logger.debug(`Successfully validated pool runtime\n`);
}
exports.validateRuntime = validateRuntime;
function validateVersion() {
    if (this.pool.protocol.version !== this.runtime.version) {
        this.logger.error(`Running an invalid version. Exiting ...`);
        this.logger.error(`Found Runtime version = ${this.runtime.version} required = ${this.pool.protocol.version}`);
        process.exit(1);
    }
    this.logger.info(`Node running on runtime version = ${this.runtime.version}`);
    this.logger.debug(`Successfully validated pool runtime version\n`);
}
exports.validateVersion = validateVersion;
function validateActiveNode() {
    if (!this.pool.stakers.includes(this.client.account.address)) {
        this.logger.error(`Node is not in the active validator set! Exiting ...`);
        process.exit(1);
    }
    this.logger.info(`Node running as validator on pool "${this.pool.name}"`);
    this.logger.debug(`Successfully validated node stake\n`);
}
exports.validateActiveNode = validateActiveNode;
