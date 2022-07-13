"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForNextBundleProposal = void 0;
const utils_1 = require("../utils");
async function waitForNextBundleProposal(createdAt) {
    return new Promise(async (resolve) => {
        this.logger.info("Waiting for new bundle to be proposed");
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
                await (0, utils_1.sleep)(10 * 1000);
            }
        }
        this.logger.info(`Found new bundle proposal. Starting new round ...\n`);
        resolve();
    });
}
exports.waitForNextBundleProposal = waitForNextBundleProposal;
