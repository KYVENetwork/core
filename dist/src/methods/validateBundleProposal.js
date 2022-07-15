"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBundleProposal = void 0;
const utils_1 = require("../utils");
const constants_1 = require("../utils/constants");
const object_hash_1 = __importDefault(require("object-hash"));
async function validateBundleProposal(createdAt) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    this.logger.info(`Validating bundle "${this.pool.bundle_proposal.storage_id}"`);
    let hasVotedAbstain = (_a = this.pool.bundle_proposal) === null || _a === void 0 ? void 0 : _a.voters_abstain.includes(this.client.account.address);
    let proposedBundle = [];
    let proposedBundleCompressed;
    let validationBundle = [];
    let validationBundleCompressed;
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
                this.logger.debug(error);
                await (0, utils_1.sleep)(10 * 1000);
                continue;
            }
            if (proposedBundleCompressed) {
                this.logger.info(`Successfully downloaded bundle from ${this.storageProvider.name}`);
                try {
                    proposedBundle = await this.compression.decompress(proposedBundleCompressed);
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
            validationBundleCompressed = await this.compression.compress(validationBundle);
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
        const uploadedKey = (_c = (_b = proposedBundle.at(-1)) === null || _b === void 0 ? void 0 : _b.key) !== null && _c !== void 0 ? _c : "";
        const proposedKey = this.pool.bundle_proposal.to_key;
        const validationKey = (_e = (_d = validationBundle.at(-1)) === null || _d === void 0 ? void 0 : _d.key) !== null && _e !== void 0 ? _e : "";
        const uploadedValue = await this.runtime.formatValue((_g = (_f = proposedBundle.at(-1)) === null || _f === void 0 ? void 0 : _f.value) !== null && _g !== void 0 ? _g : "");
        const proposedValue = this.pool.bundle_proposal.to_value;
        const validationValue = await this.runtime.formatValue((_j = (_h = validationBundle.at(-1)) === null || _h === void 0 ? void 0 : _h.value) !== null && _j !== void 0 ? _j : "");
        const uploadedByteSize = proposedBundleCompressed.byteLength;
        const proposedByteSize = +this.pool.bundle_proposal.byte_size;
        const validationByteSize = validationBundleCompressed.byteLength;
        const uploadedBundleHash = (0, object_hash_1.default)((0, utils_1.standardizeJSON)(proposedBundle));
        const proposedBundleHash = this.pool.bundle_proposal.bundle_hash;
        const validationBundleHash = (0, object_hash_1.default)((0, utils_1.standardizeJSON)(validationBundle));
        this.logger.debug(`Validating bundle proposal by key and value`);
        this.logger.debug(`Uploaded:     ${uploadedKey} ${uploadedValue}`);
        this.logger.debug(`Proposed:     ${proposedKey} ${proposedValue}`);
        this.logger.debug(`Validation:   ${validationKey} ${validationValue}\n`);
        this.logger.debug(`Validating bundle proposal by byte size and hash`);
        this.logger.debug(`Uploaded:     ${uploadedByteSize} ${uploadedBundleHash}`);
        this.logger.debug(`Proposed:     ${proposedByteSize} ${proposedBundleHash}`);
        this.logger.debug(`Validation:   ${validationByteSize} ${validationBundleHash}\n`);
        let keysEqual = false;
        let valuesEqual = false;
        let byteSizesEqual = false;
        let hashesEqual = false;
        if (uploadedKey === proposedKey && proposedKey === validationKey) {
            keysEqual = true;
        }
        if (uploadedValue === proposedValue && proposedValue === validationValue) {
            valuesEqual = true;
        }
        if (uploadedByteSize === proposedByteSize &&
            proposedByteSize === validationByteSize) {
            byteSizesEqual = true;
        }
        if (uploadedBundleHash === proposedBundleHash &&
            proposedBundleHash === validationBundleHash) {
            hashesEqual = true;
        }
        if (keysEqual && valuesEqual && byteSizesEqual && hashesEqual) {
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
