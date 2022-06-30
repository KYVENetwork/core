"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Arweave_1 = __importDefault(require("./storage/Arweave"));
const JsonFileCache_1 = __importDefault(require("./cache/JsonFileCache"));
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
// integration runtime should be implemented on the integration repo
class EVM {
    constructor() {
        this.name = "@kyve/evm";
        this.version = "1.2.0";
    }
    async getDataItem(key) {
        return {
            key,
            value: `${key}value`,
        };
    }
    async getNextKey(key) {
        return `${key}+1`;
    }
    async getFormattedValueFromDataItem(item) {
        return item.hash;
    }
}
// inject runtime and storage provider
new Node()
    .addRuntime(new EVM())
    .addStorageProvider(new Arweave_1.default())
    .addCache(new JsonFileCache_1.default())
    .start();
exports.default = Node;
