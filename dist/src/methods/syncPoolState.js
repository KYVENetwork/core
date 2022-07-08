"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncPoolState = void 0;
const utils_1 = require("../utils");
async function syncPoolState() {
    await (0, utils_1.callWithBackoffStrategy)(async () => {
        var _a;
        const { pool } = await this.query.kyve.registry.v1beta1.pool({
            id: this.poolId.toString(),
        });
        this.pool = pool;
        try {
            this.poolConfig = JSON.parse(this.pool.config);
        }
        catch (error) {
            this.logger.debug(`Failed to parse the pool config: ${(_a = this.pool) === null || _a === void 0 ? void 0 : _a.config}`);
            this.poolConfig = {};
        }
    }, { limitTimeout: "5m", increaseBy: "10s" }, (error, ctx) => {
        this.logger.info(`Failed to sync pool state. Retrying in ${(ctx.nextTimeoutInMs / 1000).toFixed(2)}s ...`);
        this.logger.debug(error);
    });
    this.logger.debug(`Synced pool state`);
}
exports.syncPoolState = syncPoolState;
