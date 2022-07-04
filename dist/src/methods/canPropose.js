"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canPropose = void 0;
const helpers_1 = require("../utils/helpers");
async function canPropose() {
    if (this.pool.bundle_proposal.next_uploader !== this.client.account.address) {
        this.logger.info(`Skipping upload. Reason: Node is not the next uploader\n`);
        return false;
    }
    while (true) {
        try {
            const { possible, reason } = await this.query.kyve.registry.v1beta1.canPropose({
                pool_id: this.poolId.toString(),
                proposer: this.client.account.address,
                from_height: this.pool.bundle_proposal.to_height || this.pool.current_height,
            });
            if (possible) {
                this.logger.info(`Node is able to propose a new bundle\n`);
                return true;
            }
            else if (reason === "Upload interval not surpassed") {
                await (0, helpers_1.sleep)(1000);
                continue;
            }
            else {
                this.logger.info(`Skipping upload. Reason: ${reason}`);
                return false;
            }
        }
        catch (error) {
            this.logger.warn(` Skipping upload. Reason: Failed to execute canPropose query`);
            this.logger.debug(error);
            return false;
        }
    }
}
exports.canPropose = canPropose;
