"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupStake = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const utils_1 = require("../utils");
const registry_1 = require("@kyve/proto/dist/proto/kyve/registry/v1beta1/registry");
async function setupStake() {
    let desiredStake = new bignumber_js_1.default(0);
    let toStake = new bignumber_js_1.default(0);
    let toUnstake = new bignumber_js_1.default(0);
    // try to parse the provided inital staking amount
    try {
        desiredStake = new bignumber_js_1.default(this.desiredStake).multipliedBy(10 ** 9);
        if (desiredStake.toString() === "NaN") {
            this.logger.error("Could not parse initial stake. Exiting ...");
            process.exit(1);
        }
    }
    catch (error) {
        this.logger.error("Could not parse initial stake. Exiting ...");
        this.logger.debug(error);
        process.exit(1);
    }
    // fetch staking info of node
    const { balance, currentStake, minimumStake, status } = await (0, utils_1.callWithBackoffStrategy)(async () => {
        const data = await this.query.kyve.registry.v1beta1.stakeInfo({
            pool_id: this.poolId.toString(),
            staker: this.client.account.address,
        });
        return {
            balance: new bignumber_js_1.default(data.balance),
            currentStake: new bignumber_js_1.default(data.current_stake),
            minimumStake: new bignumber_js_1.default(data.minimum_stake),
            status: data.status,
        };
    }, { limitTimeout: "5m", increaseBy: "10s" }, (error, ctx) => {
        this.logger.info(`Failed to fetch stake info of address. Retrying in ${(ctx.nextTimeoutInMs / 1000).toFixed(2)}s ...`);
        this.logger.debug(error);
    });
    // check if node operator stakes more than the required minimum stake
    if (desiredStake.lte(minimumStake)) {
        this.logger.error(`Minimum stake is ${(0, utils_1.toHumanReadable)(minimumStake.toString())} $KYVE - desired stake only ${(0, utils_1.toHumanReadable)(desiredStake.toString())} $KYVE. Please provide a higher staking amount. Exiting ...`);
        process.exit(1);
    }
    // calculate amount to stake
    if (desiredStake.gt(currentStake)) {
        toStake = desiredStake.minus(currentStake);
        // check if node operator has enough balance to stake
        if (balance.lt(toStake)) {
            this.logger.error(`Not enough $KYVE in wallet. Exiting ...`);
            this.logger.error(`Balance = ${(0, utils_1.toHumanReadable)(balance.toString())} required = ${(0, utils_1.toHumanReadable)(toStake.toString())}`);
            process.exit(1);
        }
        // stake in pool
        await this.stakePool(toStake.toString());
    }
    // calculate amount to unstake
    if (desiredStake.lt(currentStake)) {
        toUnstake = currentStake.minus(currentStake);
        // unstake from pool
        await this.unstakePool(toUnstake.toString());
    }
    if (status === registry_1.StakerStatus.STAKER_STATUS_ACTIVE) {
        this.logger.info(`Node is ACTIVE and running with a stake of ${(0, utils_1.toHumanReadable)(currentStake.toString())} $KYVE`);
        this.logger.debug(`Node is already staked. Continuing ...\n`);
        return;
    }
    if (status === registry_1.StakerStatus.STAKER_STATUS_INACTIVE) {
        this.logger.info(`Node is INACTIVE and running with a stake of ${(0, utils_1.toHumanReadable)(currentStake.toString())} $KYVE`);
        try {
            this.logger.debug(`Attempting to reactivate node`);
            const tx = await this.client.kyve.v1beta1.base.reactivateStaker({
                pool_id: this.poolId.toString(),
            });
            this.logger.debug(`ReactivateStaker = ${tx.txHash}`);
            const receipt = await tx.execute();
            if (receipt.code === 0) {
                this.logger.info(`Successfully reactivated staker\n`);
            }
            else {
                this.logger.error(`Could not reactivate staker. Exiting ...`);
                process.exit(1);
            }
        }
        catch (error) {
            this.logger.error(`Failed to reactivate staker. Exiting ...`);
            this.logger.debug(error);
            process.exit(1);
        }
        return;
    }
}
exports.setupStake = setupStake;
