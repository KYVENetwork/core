"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitBundleProposal = void 0;
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
            return true;
        }
        else {
            this.logger.info(`Could not submit bundle proposal. Continuing ...\n`);
            return false;
        }
    }
    catch (error) {
        this.logger.warn(" Failed to submit bundle proposal. Continuing ...\n");
        this.logger.debug(error);
        return false;
    }
}
exports.submitBundleProposal = submitBundleProposal;
