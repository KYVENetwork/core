"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupStake = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const helpers_1 = require("../utils/helpers");
async function setupStake() {
    let initialStake = new bignumber_js_1.default(0);
    const { balance, currentStake, minimumStake } = await (0, helpers_1.callWithBackoffStrategy)(async () => {
        const data = await this.query.kyve.registry.v1beta1.stakeInfo({
            pool_id: this.poolId.toString(),
            staker: this.client.account.address,
        });
        return {
            balance: new bignumber_js_1.default(data.balance),
            currentStake: new bignumber_js_1.default(data.current_stake),
            minimumStake: new bignumber_js_1.default(data.minimum_stake),
        };
    }, { limitTimeout: "5m", increaseBy: "10s" }, (error, ctx) => {
        this.logger.info(`Failed to fetch stake info of address. Retrying in ${(ctx.nextTimeoutInMs / 1000).toFixed(2)}s ...`);
        this.logger.debug(error);
    });
    // check if node has already staked
    if (!currentStake.isZero()) {
        this.logger.info(`Node running with a stake of ${(0, helpers_1.toHumanReadable)(currentStake.toString())} $KYVE`);
        this.logger.debug(`Node is already staked. Continuing ...\n`);
        return;
    }
    // try to parse the provided inital staking amount
    try {
        initialStake = new bignumber_js_1.default(this.initialStake).multipliedBy(10 ** 9);
        if (initialStake.toString() === "NaN") {
            this.logger.error("Could not parse initial stake. Exiting ...");
            process.exit(1);
        }
        if (initialStake.isZero()) {
            this.logger.error("Initial stake can not be zero. Please provide a higher stake. Exiting ...");
            process.exit(1);
        }
    }
    catch (error) {
        this.logger.error("Could not parse initial stake. Exiting ...");
        this.logger.debug(error);
        process.exit(1);
    }
    // check if node operator has more stake than the required minimum stake
    if (initialStake.lte(minimumStake)) {
        this.logger.error(`Minimum stake is ${(0, helpers_1.toHumanReadable)(minimumStake.toString())} $KYVE - initial stake only ${(0, helpers_1.toHumanReadable)(initialStake.toString())} $KYVE. Please provide a higher staking amount. Exiting ...`);
        process.exit(1);
    }
    // check if node operator has enough balance to stake
    if (balance.lt(initialStake)) {
        this.logger.error(`Not enough $KYVE in wallet. Exiting ...`);
        this.logger.error(`Balance = ${(0, helpers_1.toHumanReadable)(balance.toString())} required = ${(0, helpers_1.toHumanReadable)(initialStake.toString())}`);
        process.exit(1);
    }
    this.logger.debug(`Staking ${(0, helpers_1.toHumanReadable)(initialStake.toString())} $KYVE in pool "${this.pool.name}" to become a validator`);
    try {
        this.logger.debug(`Attempting to stake ${initialStake.toString()} in pool`);
        const tx = await this.client.kyve.v1beta1.base.stakePool({
            id: this.poolId.toString(),
            amount: initialStake.toString(),
        });
        this.logger.debug(`StakePool = ${tx.txHash}`);
        const receipt = await tx.execute();
        if (receipt.code === 0) {
            this.logger.info(`Node running with a stake of ${(0, helpers_1.toHumanReadable)(initialStake.toString())} $KYVE\n`);
        }
        else {
            this.logger.error(`Could not stake ${(0, helpers_1.toHumanReadable)(initialStake.toString())} $KYVE. Exiting ...`);
            process.exit(1);
        }
    }
    catch (error) {
        this.logger.error(`Failed to stake ${(0, helpers_1.toHumanReadable)(initialStake.toString())} $KYVE. Exiting ...`);
        this.logger.debug(error);
        process.exit(1);
    }
}
exports.setupStake = setupStake;
