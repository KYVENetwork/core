"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBundleProposal = void 0;
const helpers_1 = require("../utils/helpers");
const constants_1 = require("../utils/constants");
const object_hash_1 = __importDefault(require("object-hash"));
// TODO: exit after remaining upload interval if node is uploader
async function validateBundleProposal(createdAt) {
    var _a;
    this.logger.info(`Validating bundle "${this.pool.bundle_proposal.bundle_id}"`);
    let hasVotedAbstain = (_a = this.pool.bundle_proposal) === null || _a === void 0 ? void 0 : _a.voters_abstain.includes(this.client.account.address);
    let proposedBundle;
    let proposedBundleCompressed;
    let validationBundle;
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
            // Todo catch error if decompression fails
            proposedBundleCompressed = await this.storageProvider.retrieveBundle(this.pool.bundle_proposal.bundle_id);
            if (proposedBundleCompressed) {
                this.logger.info(`Successfully downloaded bundle from ${this.storageProvider.name}`);
                // Todo catch error if decompression fails
                proposedBundle = await this.compression.decompress(proposedBundleCompressed);
            }
            else {
                this.logger.info(`Could not download bundle from ${this.storageProvider.name}. Retrying in 10s ...`);
                if (!hasVotedAbstain) {
                    await this.voteBundleProposal(this.pool.bundle_proposal.bundle_id, constants_1.VOTE.ABSTAIN);
                    hasVotedAbstain = true;
                }
                await (0, helpers_1.sleep)(10 * 1000);
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
                await this.voteBundleProposal(this.pool.bundle_proposal.bundle_id, constants_1.VOTE.ABSTAIN);
                hasVotedAbstain = true;
            }
            await (0, helpers_1.sleep)(10 * 1000);
            continue;
        }
    }
    const uploadedKey = proposedBundle[proposedBundle.length - 1].key;
    const proposedKey = this.pool.bundle_proposal.to_key;
    const validationKey = validationBundle[validationBundle.length - 1].key;
    const uploadedValue = await this.runtime.formatValue(proposedBundle[proposedBundle.length - 1].value);
    const proposedValue = this.pool.bundle_proposal.to_value;
    const validationValue = await this.runtime.formatValue(validationBundle[validationBundle.length - 1].value);
    const uploadedByteSize = proposedBundleCompressed.byteLength;
    const proposedByteSize = +this.pool.bundle_proposal.byte_size;
    const validationByteSize = validationBundleCompressed.byteLength;
    const uploadedBundleHash = (0, object_hash_1.default)(proposedBundleCompressed);
    const proposedBundleHash = this.pool.bundle_proposal.bundle_hash;
    const validationBundleHash = (0, object_hash_1.default)(validationBundleCompressed);
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
        await this.voteBundleProposal(this.pool.bundle_proposal.bundle_id, constants_1.VOTE.VALID);
    }
    else {
        await this.voteBundleProposal(this.pool.bundle_proposal.bundle_id, constants_1.VOTE.INVALID);
    }
}
exports.validateBundleProposal = validateBundleProposal;
