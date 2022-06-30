"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForNextBundleProposal = void 0;
const helpers_1 = require("../utils/helpers");
async function waitForNextBundleProposal(createdAt) {
    return new Promise(async (resolve) => {
        this.logger.debug("Waiting for new bundle to be proposed");
        while (true) {
            await this.syncPoolState();
            // check if new proposal is available in the meantime
            if (+this.pool.bundle_proposal.created_at > createdAt) {
                break;
            }
            else if (this.shouldIdle()) {
                break;
            }
            else {
                await (0, helpers_1.sleep)(10 * 1000);
            }
        }
        resolve();
    });
}
exports.waitForNextBundleProposal = waitForNextBundleProposal;
