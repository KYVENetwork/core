"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voteBundleProposal = void 0;
async function voteBundleProposal(bundle_id, vote) {
    try {
        let voteMessage = "";
        if (vote === 0) {
            voteMessage = "valid";
        }
        else if (vote === 1) {
            voteMessage = "invalid";
        }
        else if (vote === 2) {
            voteMessage = "abstain";
        }
        else {
            throw Error(`Invalid vote: ${vote}`);
        }
        const tx = await this.client.kyve.v1beta1.base.voteProposal({
            id: this.poolId.toString(),
            bundle_id,
            vote,
        });
        this.logger.debug(`Tx = ${tx.txHash}`);
        const receipt = await tx.execute();
        if (receipt.code === 0) {
            this.logger.info(`Voted ${voteMessage} on bundle ${bundle_id}`);
        }
        else {
            this.logger.info(`Could not vote on proposal. Continuing ...`);
        }
    }
    catch (error) {
        this.logger.warn(" Failed to vote. Continuing ...");
        this.logger.debug(error);
    }
}
exports.voteBundleProposal = voteBundleProposal;
