"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBundleProposal = void 0;
const utils_1 = require("../utils");
const constants_1 = require("../utils/constants");
async function validateBundleProposal(createdAt) {
    var _a, _b, _c, _d, _e;
    this.logger.info(`Validating bundle "${this.pool.bundle_proposal.storage_id}"`);
    let hasVotedAbstain = (_a = this.pool.bundle_proposal) === null || _a === void 0 ? void 0 : _a.voters_abstain.includes(this.client.account.address);
    let uploadedBundle = [];
    let proposedBundleCompressed;
    let validationBundle = [];
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
        // try to download bundle from arweave
        if (!proposedBundleCompressed) {
            this.logger.debug(`Attempting to download bundle from ${this.storageProvider.name}`);
            try {
                proposedBundleCompressed = await this.storageProvider.retrieveBundle(this.pool.bundle_proposal.storage_id);
            }
            catch (error) {
                this.logger.warn(` Failed to retrieve bundle from ${this.storageProvider.name}. Retrying in 10s ...\n`);
                if (!hasVotedAbstain) {
                    await this.voteBundleProposal(this.pool.bundle_proposal.storage_id, constants_1.VOTE.ABSTAIN);
                    hasVotedAbstain = true;
                }
                await (0, utils_1.sleep)(10 * 1000);
                continue;
            }
            if (proposedBundleCompressed) {
                this.logger.info(`Successfully downloaded bundle from ${this.storageProvider.name}`);
                try {
                    uploadedBundle = await this.compression.decompress(proposedBundleCompressed);
                    this.logger.info(`Successfully decompressed bundle with compression type ${this.compression.name}`);
                }
                catch (error) {
                    this.logger.info(`Could not decompress bundle with compression type ${this.compression.name}`);
                }
            }
            else {
                this.logger.info(`Could not download bundle from ${this.storageProvider.name}. Retrying in 10s ...`);
                if (!hasVotedAbstain) {
                    await this.voteBundleProposal(this.pool.bundle_proposal.storage_id, constants_1.VOTE.ABSTAIN);
                    hasVotedAbstain = true;
                }
                await (0, utils_1.sleep)(10 * 1000);
                continue;
            }
        }
        // try to load local bundle
        const currentHeight = +this.pool.current_height;
        const toHeight = +this.pool.bundle_proposal.to_height || currentHeight;
        this.logger.debug(`Attemping to load local bundle from ${currentHeight} to ${toHeight} ...`);
        const { bundle } = await this.loadBundle(currentHeight, toHeight);
        // check if bundle length is equal to request bundle
        if (bundle.length === toHeight - currentHeight) {
            validationBundle = bundle;
            this.logger.info(`Successfully loaded local bundle from ${currentHeight} to ${toHeight}\n`);
            break;
        }
        else {
            this.logger.info(`Could not load local bundle from ${currentHeight} to ${toHeight}. Retrying in 10s ...`);
            if (!hasVotedAbstain) {
                await this.voteBundleProposal(this.pool.bundle_proposal.storage_id, constants_1.VOTE.ABSTAIN);
                hasVotedAbstain = true;
            }
            await (0, utils_1.sleep)(10 * 1000);
            continue;
        }
    }
    try {
        const uploadedBundleHash = (0, utils_1.sha256)((0, utils_1.standardizeJSON)(uploadedBundle));
        const proposedBundleHash = this.pool.bundle_proposal.bundle_hash;
        const uploadedByteSize = proposedBundleCompressed.byteLength;
        const proposedByteSize = +this.pool.bundle_proposal.byte_size;
        const uploadedKey = (_c = (_b = uploadedBundle.at(-1)) === null || _b === void 0 ? void 0 : _b.key) !== null && _c !== void 0 ? _c : "";
        const proposedKey = this.pool.bundle_proposal.to_key;
        const uploadedValue = await this.runtime.formatValue((_e = (_d = uploadedBundle.at(-1)) === null || _d === void 0 ? void 0 : _d.value) !== null && _e !== void 0 ? _e : "");
        const proposedValue = this.pool.bundle_proposal.to_value;
        this.logger.debug(`Validating bundle proposal by byte size and hash`);
        this.logger.debug(`Uploaded:     ${uploadedByteSize} ${uploadedBundleHash}`);
        this.logger.debug(`Proposed:     ${proposedByteSize} ${proposedBundleHash}\n`);
        this.logger.debug(`Validating bundle proposal by key and value`);
        this.logger.debug(`Uploaded:     ${uploadedKey} ${uploadedValue}`);
        this.logger.debug(`Proposed:     ${proposedKey} ${proposedValue}\n`);
        let valid = false;
        if (uploadedBundleHash === proposedBundleHash &&
            uploadedByteSize === proposedByteSize &&
            uploadedKey === proposedKey &&
            uploadedValue === proposedValue) {
            valid = true;
        }
        if (valid) {
            valid = await this.runtime.validate(this, (0, utils_1.standardizeJSON)(uploadedBundle), (0, utils_1.standardizeJSON)(validationBundle));
        }
        if (valid) {
            await this.voteBundleProposal(this.pool.bundle_proposal.storage_id, constants_1.VOTE.VALID);
        }
        else {
            await this.voteBundleProposal(this.pool.bundle_proposal.storage_id, constants_1.VOTE.INVALID);
        }
    }
    catch (error) {
        this.logger.warn(` Failed to validate bundle`);
        this.logger.debug(error);
        if (!hasVotedAbstain) {
            await this.voteBundleProposal(this.pool.bundle_proposal.storage_id, constants_1.VOTE.ABSTAIN);
        }
    }
}
exports.validateBundleProposal = validateBundleProposal;
