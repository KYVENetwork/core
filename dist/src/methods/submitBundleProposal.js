"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitBundleProposal = void 0;
const utils_1 = require("../utils");
async function submitBundleProposal(storageId, byteSize, fromHeight, toHeight, fromKey, toKey, toValue, bundleHash) {
    try {
        this.logger.debug(`Attempting to submit bundle proposal`);
        const tx = await this.client.kyve.v1beta1.base.submitBundleProposal({
            id: this.poolId.toString(),
            storage_id: storageId,
            byte_size: byteSize.toString(),
            from_height: fromHeight.toString(),
            to_height: toHeight.toString(),
            from_key: fromKey,
            to_key: toKey,
            to_value: toValue,
            bundle_hash: bundleHash,
        });
        this.logger.debug(`SubmitBundleProposal = ${tx.txHash}`);
        const receipt = await tx.execute();
        if (receipt.code === 0) {
            this.logger.info(`Successfully submitted bundle proposal with Storage Id "${storageId}"\n`);
        }
        else {
            this.logger.info(`Could not submit bundle proposal. Continuing in 10s ...\n`);
            await (0, utils_1.sleep)(10 * 1000);
        }
    }
    catch (error) {
        this.logger.warn(" Failed to submit bundle proposal. Continuing in 10s ...\n");
        this.logger.debug(error);
        await (0, utils_1.sleep)(10 * 1000);
    }
}
exports.submitBundleProposal = submitBundleProposal;
