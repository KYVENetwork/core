"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unstakePool = exports.stakePool = void 0;
const utils_1 = require("../utils");
async function stakePool(amount) {
    try {
        this.logger.debug(`Attempting to stake ${(0, utils_1.toHumanReadable)(amount)} $KYVE in pool`);
        const tx = await this.client.kyve.v1beta1.base.stakePool({
            id: this.poolId.toString(),
            amount,
        });
        this.logger.debug(`StakePool = ${tx.txHash}`);
        const receipt = await tx.execute();
        if (receipt.code === 0) {
            this.logger.info(`Successfully staked ${(0, utils_1.toHumanReadable)(amount)} $KYVE\n`);
        }
        else {
            this.logger.error(`Could not stake ${(0, utils_1.toHumanReadable)(amount)} $KYVE. Exiting ...`);
            process.exit(1);
        }
    }
    catch (error) {
        this.logger.error(`Failed to stake ${(0, utils_1.toHumanReadable)(amount)} $KYVE. Exiting ...`);
        this.logger.debug(error);
        process.exit(1);
    }
}
exports.stakePool = stakePool;
async function unstakePool(amount) {
    try {
        this.logger.debug(`Attempting to unstake ${(0, utils_1.toHumanReadable)(amount)} $KYVE from pool`);
        const tx = await this.client.kyve.v1beta1.base.unstakePool({
            id: this.poolId.toString(),
            amount,
        });
        this.logger.debug(`UnstakePool = ${tx.txHash}`);
        const receipt = await tx.execute();
        if (receipt.code === 0) {
            this.logger.info(`Successfully unstaked ${(0, utils_1.toHumanReadable)(amount)} $KYVE\n`);
        }
        else {
            this.logger.error(`Could not unstake ${(0, utils_1.toHumanReadable)(amount)} $KYVE. Exiting ...`);
            process.exit(1);
        }
    }
    catch (error) {
        this.logger.error(`Failed to unstake ${(0, utils_1.toHumanReadable)(amount)} $KYVE. Exiting ...`);
        this.logger.debug(error);
        process.exit(1);
    }
}
exports.unstakePool = unstakePool;
