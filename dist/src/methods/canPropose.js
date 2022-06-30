"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canPropose = void 0;
const helpers_1 = require("../utils/helpers");
async function canPropose() {
    if (this.pool.bundle_proposal.next_uploader !== this.client.account.address) {
        return false;
    }
    while (true) {
        try {
            const { possible, reason } = await this.query.kyve.registry.v1beta1.canPropose({
                pool_id: this.poolId.toString(),
                proposer: this.client.account.address,
                from_height: this.pool.current_height,
            });
            if (possible) {
                this.logger.debug(`Node is able to propose a new bundle\n`);
                return true;
            }
            else if (reason === "Upload interval not surpassed") {
                await (0, helpers_1.sleep)(1000);
                continue;
            }
            else {
                this.logger.debug(`Skipping vote. Reason: ${reason}`);
                return false;
            }
        }
        catch {
            this.logger.debug(`Skipping upload. Reason: Failed to execute canPropose query`);
            return false;
        }
    }
}
exports.canPropose = canPropose;
