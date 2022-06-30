"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBundleProposal = void 0;
const zlib_1 = require("zlib");
const helpers_1 = require("../utils/helpers");
const constants_1 = require("../utils/constants");
const object_hash_1 = __importDefault(require("object-hash"));
// TODO: exit after remaining upload interval if node is uploader
async function validateBundleProposal(createdAt) {
    var _a;
    this.logger.info(`Validating bundle ${this.pool.bundle_proposal.bundle_id}`);
    let hasVotedAbstain = (_a = this.pool.bundle_proposal) === null || _a === void 0 ? void 0 : _a.voters_abstain.includes(this.client.account.address);
    let proposedBundleCompressed;
    let validationBundle;
    let validationBundleCompressed;
    while (true) {
        await this.syncPoolState();
        if (+this.pool.bundle_proposal.created_at > createdAt) {
            // check if new proposal is available in the meantime
            break;
        }
        else if (this.shouldIdle()) {
            // check if pool got paused in the meantime
            break;
        }
        // try to download bundle from arweave
        if (!proposedBundleCompressed) {
            this.logger.info(`Downloading from ${this.storageProvider.name}`);
            proposedBundleCompressed = await this.storageProvider.retrieveBundle(this.pool.bundle_proposal.bundle_id);
            if (proposedBundleCompressed) {
                this.logger.info(`Successfully downloaded bundle from ${this.storageProvider.name}`);
            }
            else {
                this.logger.debug(`Could not download bundle from ${this.storageProvider.name}. Retrying in 10s ...`);
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
        const toHeight = +this.pool.bundle_proposal.to_height || +this.pool.current_height;
        this.logger.debug(`Loading local bundle from ${currentHeight} to ${toHeight} ...`);
        const { bundle } = await this.loadBundle(currentHeight, toHeight);
        // check if bundle length is equal to request bundle
        if (bundle.length === toHeight - currentHeight) {
            validationBundle = bundle;
            validationBundleCompressed = (0, zlib_1.gzipSync)(Buffer.from(JSON.stringify(validationBundle)));
            break;
        }
        else {
            this.logger.warn(` Could not load local bundle from ${currentHeight} to ${toHeight}. Retrying in 10s ...`);
            if (!hasVotedAbstain) {
                await this.voteBundleProposal(this.pool.bundle_proposal.bundle_id, constants_1.VOTE.ABSTAIN);
                hasVotedAbstain = true;
            }
            await (0, helpers_1.sleep)(10 * 1000);
            continue;
        }
    }
    const proposedByteSize = +this.pool.bundle_proposal.byte_size;
    const validationByteSize = validationBundleCompressed.byteLength;
    const proposedKey = this.pool.bundle_proposal.to_key;
    const validationKey = validationBundle[validationBundle.length - 1].key;
    const proposedValue = this.pool.bundle_proposal.to_value;
    const validationValue = await this.runtime.getFormattedValueFromDataItem(validationBundle[validationBundle.length - 1].value);
    const proposedBundleHash = (0, object_hash_1.default)(proposedBundleCompressed);
    const validationBundleHash = (0, object_hash_1.default)(validationBundleCompressed);
    this.logger.debug(`Validating bundle proposal by\n`);
    this.logger.debug(`Proposed byte size:      ${proposedByteSize}`);
    this.logger.debug(`Validation byte size:    ${validationByteSize}\n`);
    this.logger.debug(`Proposed key:      ${proposedKey}`);
    this.logger.debug(`Validation key:    ${validationKey}\n`);
    this.logger.debug(`Proposed value:      ${proposedValue}`);
    this.logger.debug(`Validation value:    ${validationValue}\n`);
    this.logger.debug(`Proposed hash:      ${proposedBundleHash}`);
    this.logger.debug(`Validation hash:    ${validationBundleHash}\n`);
    if (proposedByteSize === validationByteSize &&
        proposedKey === validationKey &&
        proposedValue === validationValue &&
        proposedBundleHash === validationBundleHash) {
        await this.voteBundleProposal(this.pool.bundle_proposal.bundle_id, constants_1.VOTE.VALID);
    }
    else {
        await this.voteBundleProposal(this.pool.bundle_proposal.bundle_id, constants_1.VOTE.INVALID);
    }
}
exports.validateBundleProposal = validateBundleProposal;
