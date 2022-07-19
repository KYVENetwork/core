"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const package_json_1 = require("../package.json");
const methods_1 = require("./methods");
const commander_1 = __importDefault(require("./commander"));
const sdk_1 = __importDefault(require("@kyve/sdk"));
/**
 * Main class of KYVE protocol nodes representing a node.
 *
 * @class Node
 * @constructor
 */
class Node {
    /**
     * Defines node options for CLI and initializes those inputs
     * Node name is generated here depending on inputs
     *
     * @method constructor
     */
    constructor() {
        // register core methods
        this.asyncSetup = methods_1.asyncSetup;
        this.setupLogger = methods_1.setupLogger;
        this.setupName = methods_1.setupName;
        this.logNodeInfo = methods_1.logNodeInfo;
        this.syncPoolState = methods_1.syncPoolState;
        this.validateRuntime = methods_1.validateRuntime;
        this.validateVersion = methods_1.validateVersion;
        this.validateActiveNode = methods_1.validateActiveNode;
        this.stakePool = methods_1.stakePool;
        this.unstakePool = methods_1.unstakePool;
        this.setupStake = methods_1.setupStake;
        this.shouldIdle = methods_1.shouldIdle;
        this.claimUploaderRole = methods_1.claimUploaderRole;
        this.loadBundle = methods_1.loadBundle;
        this.canVote = methods_1.canVote;
        this.validateBundleProposal = methods_1.validateBundleProposal;
        this.voteBundleProposal = methods_1.voteBundleProposal;
        this.remainingUploadInterval = methods_1.remainingUploadInterval;
        this.waitForNextBundleProposal = methods_1.waitForNextBundleProposal;
        this.canPropose = methods_1.canPropose;
        this.submitBundleProposal = methods_1.submitBundleProposal;
        this.proposeBundle = methods_1.proposeBundle;
        this.runNode = methods_1.runNode;
        this.runCache = methods_1.runCache;
        // define program
        const options = commander_1.default
            .name("@kyve/core")
            .description(`KYVE Protocol Node`)
            .version(package_json_1.version)
            .parse()
            .opts();
        // assign program options
        this.poolId = options.poolId;
        this.mnemonic = options.mnemonic;
        this.keyfile = options.keyfile;
        this.stake = options.initialStake; // TODO: change after IT
        this.network = options.network;
        this.verbose = options.verbose;
        this.coreVersion = package_json_1.version;
        this.name = this.setupName();
        this.logger = this.setupLogger();
        try {
            // assign main attributes
            this.sdk = new sdk_1.default(this.network);
            this.query = this.sdk.createLCDClient();
        }
        catch (error) {
            this.logger.error(`Failed to init KYVE SDK. Exiting ...`);
            this.logger.debug(error);
            process.exit(1);
        }
    }
    /**
     * Set the runtime for the protocol node.
     * The Runtime implements the custom logic of a pool.
     *
     * Required before calling 'run'
     *
     * @method addRuntime
     * @param {IRuntime} runtime which implements the interface IRuntime
     * @return {Promise<this>} returns this for chained commands
     * @chainable
     */
    addRuntime(runtime) {
        this.runtime = runtime;
        return this;
    }
    /**
     * Set the storage provider for the protocol node.
     * The Storage Provider handles data storage and retrieval for a pool.
     *
     * Required before calling 'run'
     *
     * @method addStorageProvider
     * @param {IStorageProvider} storageProvider which implements the interface IStorageProvider
     * @return {Promise<this>} returns this for chained commands
     * @chainable
     */
    addStorageProvider(storageProvider) {
        this.storageProvider = storageProvider.init(this.keyfile);
        return this;
    }
    /**
     * Set the compression type for the protocol node.
     * Before saving bundles to the storage provider the node uses this compression
     * to store data more efficiently
     *
     * Required before calling 'run'
     *
     * @method addCompression
     * @param {ICompression} compression which implements the interface ICompression
     * @return {Promise<this>} returns this for chained commands
     * @chainable
     */
    addCompression(compression) {
        this.compression = compression;
        return this;
    }
    /**
     * Set the cache for the protocol node.
     * The Cache is responsible for caching data before its validated and stored on the Storage Provider.
     *
     * Required before calling 'run'
     *
     * @method addCache
     * @param {ICache} cache which implements the interface ICache
     * @return {Promise<this>} returns this for chained commands
     * @chainable
     */
    addCache(cache) {
        this.cache = cache.init(`./cache/${this.name}`);
        return this;
    }
    /**
     * Main method of @kyve/core. By running this method the node will start and run.
     * For this method to run the Runtime, Storage Provider and the Cache have to be added first.
     *
     * This method will run indefinetely and only exits on specific exit conditions like running
     * an incorrect runtime or version.
     *
     * @method start
     * @return {Promise<void>}
     */
    async start() {
        try {
            await this.asyncSetup();
            this.runNode();
            this.runCache();
        }
        catch (error) {
            this.logger.error(`Unexpected runtime error. Exiting ...`);
            this.logger.debug(error);
            process.exit(1);
        }
    }
}
exports.Node = Node;
// export types
__exportStar(require("./types"), exports);
// export utils
__exportStar(require("./utils"), exports);
// export storage providers
__exportStar(require("./storage"), exports);
// export compression types
__exportStar(require("./compression"), exports);
// export caches
__exportStar(require("./cache"), exports);
