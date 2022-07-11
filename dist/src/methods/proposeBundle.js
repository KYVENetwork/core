"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proposeBundle = void 0;
const constants_1 = require("../utils/constants");
const object_hash_1 = __importDefault(require("object-hash"));
const utils_1 = require("../utils");
async function proposeBundle(createdAt) {
    const fromHeight = +this.pool.bundle_proposal.to_height || +this.pool.current_height;
    const toHeight = +this.pool.max_bundle_size + fromHeight;
    const fromKey = this.pool.bundle_proposal.to_key || this.pool.current_key;
    while (true) {
        await this.syncPoolState();
        if (+this.pool.bundle_proposal.created_at > createdAt) {
            // check if new proposal is available in the meantime
            return;
        }
        else if (this.shouldIdle()) {
            // check if pool got paused in the meantime
            return;
        }
        this.logger.debug(`Loading bundle from cache to create bundle proposal`);
        const bundleProposal = await this.loadBundle(fromHeight, toHeight);
        if (bundleProposal.bundle.length) {
            try {
                // upload bundle to Arweave
                this.logger.info(`Created bundle of length ${bundleProposal.bundle.length}`);
                this.logger.debug(`Compressing bundle with compression type ${this.compression.name}`);
                const bundleCompressed = await this.compression.compress(bundleProposal.bundle);
                const bundleHash = (0, object_hash_1.default)(bundleCompressed);
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
                this.logger.debug(`Attempting to save bundle on storage provider`);
                const storageId = await this.storageProvider.saveBundle(bundleCompressed, tags);
                this.logger.info(`Saved bundle on ${this.storageProvider.name} with Storage Id "${storageId}"\n`);
                await this.submitBundleProposal(storageId, bundleCompressed.byteLength, fromHeight, fromHeight + bundleProposal.bundle.length, fromKey, bundleProposal.toKey, bundleProposal.toValue, bundleHash);
                break;
            }
            catch (error) {
                this.logger.warn(` Failed to save bundle on ${this.storageProvider.name}. Retrying in 10s ...`);
                this.logger.debug(error);
                await (0, utils_1.sleep)(10 * 1000);
            }
        }
        else {
            this.logger.info(`Creating new bundle proposal of type ${constants_1.KYVE_NO_DATA_BUNDLE}`);
            const storageId = `KYVE_NO_DATA_BUNDLE_${this.poolId}_${Math.floor(Date.now() / 1000)}`;
            await this.submitBundleProposal(storageId, 0, fromHeight, fromHeight, fromKey, "", "", "");
            break;
        }
    }
}
exports.proposeBundle = proposeBundle;
