import { IRuntime, IStorageProvider, ICache } from "./types";
import Arweave from "./storage/Arweave";
import JsonFileCache from "./cache/JsonFileCache";
import { version as coreVersion } from "../package.json";
import {
  setupLogger,
  setupName,
  logNodeInfo,
  syncPoolState,
  validateRuntime,
  validateVersion,
  validateActiveNode,
  setupStake,
  runNode,
  runCache,
  asyncSetup,
  shouldIdle,
  claimUploaderRole,
  canVote,
  validateBundleProposal,
  voteBundleProposal,
  loadBundle,
  remainingUploadInterval,
  waitForNextBundleProposal,
  canPropose,
  submitBundleProposal,
  proposeBundle,
} from "./methods";
import program from "./commander";
import KyveSDK, { KyveClient, KyveLCDClientType } from "@kyve/sdk";
import { KYVE_NETWORK } from "@kyve/sdk/dist/constants";
import { Logger } from "tslog";
import { kyve } from "@kyve/proto";

/**
 * Main class of KYVE protocol nodes representing a node.
 *
 * @class Node
 * @constructor
 */
class Node {
  /**
   * My property description.  Like other pieces of your comment blocks,
   * this can span multiple lines.
   *
   * @property runtime
   * @type {IRuntime}
   */
  protected runtime!: IRuntime;
  protected storageProvider!: IStorageProvider;
  protected cache!: ICache;

  // register sdk attributes
  protected sdk: KyveSDK;
  protected client!: KyveClient;
  protected query: KyveLCDClientType;

  // logger attributes
  protected logger: Logger;

  // register attributes
  protected coreVersion: string;
  protected pool!: kyve.registry.v1beta1.kyveRegistry.Pool;
  protected poolConfig!: object;
  protected name: string;

  // options
  protected poolId: number;
  protected mnemonic: string;
  protected keyfile: string;
  protected initialStake: string;
  protected network: string;
  protected verbose: boolean;

  // register core methods
  protected asyncSetup = asyncSetup;
  protected setupLogger = setupLogger;
  protected setupName = setupName;
  protected logNodeInfo = logNodeInfo;
  protected syncPoolState = syncPoolState;
  protected validateRuntime = validateRuntime;
  protected validateVersion = validateVersion;
  protected validateActiveNode = validateActiveNode;
  protected setupStake = setupStake;
  protected shouldIdle = shouldIdle;
  protected claimUploaderRole = claimUploaderRole;
  protected loadBundle = loadBundle;
  protected canVote = canVote;
  protected validateBundleProposal = validateBundleProposal;
  protected voteBundleProposal = voteBundleProposal;
  protected remainingUploadInterval = remainingUploadInterval;
  protected waitForNextBundleProposal = waitForNextBundleProposal;
  protected canPropose = canPropose;
  protected submitBundleProposal = submitBundleProposal;
  protected proposeBundle = proposeBundle;
  protected runNode = runNode;
  protected runCache = runCache;

  /**
   * Defines node options for CLI and initializes those inputs
   * Node name is generated here depending on inputs
   *
   * @method constructor
   */
  constructor() {
    // define program
    const options = program
      .name("@kyve/core")
      .description(`KYVE Protocol Node`)
      .version(coreVersion)
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
    this.sdk = new KyveSDK(this.network as KYVE_NETWORK);
    this.query = this.sdk.createLCDClient();

    this.coreVersion = coreVersion;

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
  public addRuntime(runtime: IRuntime): this {
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
  public addStorageProvider(storageProvider: IStorageProvider): this {
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
  public addCache(cache: ICache): this {
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
  public async start(): Promise<void> {
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

export default Node;

export * from "./types";
export * from "./storage";
export * from "./cache";
