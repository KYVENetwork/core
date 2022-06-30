"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimUploaderRole = void 0;
async function claimUploaderRole() {
    // check if next uploader is free to claim
    if (this.pool.bundle_proposal.next_uploader) {
        return false;
    }
    try {
        this.logger.debug("Attempting to claim uploader role");
        const receipt = await this.client.kyve.v1beta1.base.claimUploaderRole({
            id: this.poolId.toString(),
        });
        if (receipt.code === 0) {
            this.logger.info(`Successfully claimed uploader role`);
            return true;
        }
        else {
            this.logger.info(`Could not claim uploader role. Continuing ...`);
            return false;
        }
    }
    catch (error) {
        this.logger.warn(" Failed to claim uploader role. Continuing ...");
        this.logger.debug(error);
        return false;
    }
}
exports.claimUploaderRole = claimUploaderRole;
