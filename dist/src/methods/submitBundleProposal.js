"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitBundleProposal = void 0;
async function submitBundleProposal(bundleId, byteSize, fromHeight, toHeight, fromKey, toKey, toValue) {
    try {
        const tx = await this.client.kyve.v1beta1.base.submitBundleProposal({
            id: this.poolId.toString(),
            bundle_id: bundleId,
            byte_size: byteSize.toString(),
            from_height: fromHeight.toString(),
            to_height: toHeight.toString(),
            from_key: fromKey,
            to_key: toKey,
            to_value: toValue,
        });
        this.logger.debug(`Tx = ${tx.txHash}`);
        const receipt = await tx.execute();
        if (receipt.code === 0) {
            this.logger.info(`Successfully submitted bundle proposal with id ${bundleId}`);
        }
        else {
            this.logger.info(`Could not submit bundle proposal. Continuing ...`);
        }
    }
    catch (error) {
        this.logger.warn(" Failed to submit bundle proposal. Continuing ...");
        this.logger.debug(error);
    }
}
exports.submitBundleProposal = submitBundleProposal;
