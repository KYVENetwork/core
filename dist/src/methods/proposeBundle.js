"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proposeBundle = void 0;
const zlib_1 = require("zlib");
const constants_1 = require("../utils/constants");
async function proposeBundle() {
    const fromHeight = +this.pool.bundle_proposal.to_height || +this.pool.current_height;
    const toHeight = +this.pool.max_bundle_size + fromHeight;
    const fromKey = this.pool.bundle_proposal.to_key || this.pool.current_key;
    const { bundle, toKey, toValue } = await this.loadBundle(fromHeight, toHeight);
    if (bundle.length) {
        // upload bundle to Arweave
        const bundleCompressed = (0, zlib_1.gzipSync)(Buffer.from(JSON.stringify(bundle)));
        const tags = [
            ["Application", "KYVE"],
            ["Network", this.network],
            ["Pool", this.poolId.toString()],
            ["@kyve/core", this.coreVersion],
            [this.runtime.name, this.runtime.version],
            ["Uploader", this.client.account.address],
            ["FromHeight", fromHeight.toString()],
            ["ToHeight", toHeight.toString()],
            ["FromKey", fromKey],
            ["ToKey", toKey],
            ["Value", toValue],
        ];
        try {
            const bundleId = await this.storageProvider.saveBundle(bundleCompressed, tags);
            this.logger.info(`Saved bundle on ${this.storageProvider.name} with ID ${bundleId}`);
            await this.submitBundleProposal(bundleId, bundleCompressed.byteLength, fromHeight, toHeight, fromKey, toKey, toValue);
        }
        catch {
            this.logger.warn(` Failed to save bundle on ${this.storageProvider.name}`);
        }
    }
    else {
        this.logger.info(`Creating new bundle proposal of type ${constants_1.KYVE_NO_DATA_BUNDLE}`);
        const bundleId = `KYVE_NO_DATA_BUNDLE_${this.poolId}_${Math.floor(Date.now() / 1000)}`;
        await this.submitBundleProposal(bundleId, 0, fromHeight, fromHeight, fromKey, "", "");
    }
}
exports.proposeBundle = proposeBundle;
