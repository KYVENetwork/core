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
        this.initialStake = options.initialStake;
        this.network = options.network;
        this.verbose = options.verbose;
        // assign main attributes
        this.sdk = new sdk_1.default(this.network);
        this.query = this.sdk.createLCDClient();
        this.coreVersion = package_json_1.version;
        this.name = this.setupName();
        this.logger = this.setupLogger();
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
        // TODO: check here if sdk init fails
        // TODO: check if runtime, storage provider etc is defined
        await this.asyncSetup();
        this.logNodeInfo();
        await this.syncPoolState();
        this.validateRuntime();
        this.validateVersion();
        await this.setupStake();
        await this.syncPoolState();
        this.validateActiveNode();
        this.runNode();
        this.runCache();
    }
}
exports.Node = Node;
// // integration runtime should be implemented on the integration repo
// class EVM implements IRuntime {
//   public name = "@kyve/evm";
//   public version = "1.2.0";
//   async getDataItem(key: string) {
//     return {
//       key,
//       value: `${key}value`,
//     };
//   }
//   async getNextKey(key: string) {
//     return `${key}+1`;
//   }
//   async getFormattedValueFromDataItem(item: any) {
//     return item.hash;
//   }
// }
// // inject runtime and storage provider
// new Node()
//   .addRuntime(new EVM())
//   .addStorageProvider(new Arweave())
//   .addCache(new JsonFileCache())
//   .start();
__exportStar(require("./types"), exports);
__exportStar(require("./storage"), exports);
__exportStar(require("./compression"), exports);
__exportStar(require("./cache"), exports);
