"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proposeBundle = void 0;
const constants_1 = require("../utils/constants");
async function proposeBundle() {
    const fromHeight = +this.pool.bundle_proposal.to_height || +this.pool.current_height;
    const toHeight = +this.pool.max_bundle_size + fromHeight;
    const fromKey = this.pool.bundle_proposal.to_key || this.pool.current_key;
    this.logger.debug(`Loading bundle from cache to create bundle proposal`);
    const bundleProposal = await this.loadBundle(fromHeight, toHeight);
    if (bundleProposal.bundle.length) {
        // upload bundle to Arweave
        this.logger.debug(`Compressing bundle with compression type ${this.compression.name}`);
        const bundleCompressed = await this.compression.compress(bundleProposal.bundle);
        const tags = [
            ["Application", "KYVE"],
            ["Network", this.network],
            ["Pool", this.poolId.toString()],
            ["@kyve/core", this.coreVersion],
            [this.runtime.name, this.runtime.version],
            ["Uploader", this.client.account.address],
            ["FromHeight", fromHeight.toString()],
            ["ToHeight", (fromHeight + bundleProposal.bundle.length).toString()],
            ["Size", bundleProposal.bundle.length.toString()],
            ["FromKey", fromKey],
            ["ToKey", bundleProposal.toKey],
            ["Value", bundleProposal.toValue],
        ];
        try {
            this.logger.debug(`Attempting to save bundle on storage provider`);
            const bundleId = await this.storageProvider.saveBundle(bundleCompressed, tags);
            this.logger.info(`Saved bundle on ${this.storageProvider.name} with ID ${bundleId}`);
            await this.submitBundleProposal(bundleId, bundleCompressed.byteLength, fromHeight, fromHeight + bundleProposal.bundle.length, fromKey, bundleProposal.toKey, bundleProposal.toValue);
        }
        catch (error) {
            this.logger.warn(` Failed to save bundle on ${this.storageProvider.name}`);
            this.logger.debug(error);
        }
    }
    else {
        this.logger.info(`Creating new bundle proposal of type ${constants_1.KYVE_NO_DATA_BUNDLE}`);
        const bundleId = `KYVE_NO_DATA_BUNDLE_${this.poolId}_${Math.floor(Date.now() / 1000)}`;
        await this.submitBundleProposal(bundleId, 0, fromHeight, fromHeight, fromKey, "", "");
    }
}
exports.proposeBundle = proposeBundle;
