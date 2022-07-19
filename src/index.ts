import { IRuntime, IStorageProvider, ICache, ICompression } from "./types";
import { version as coreVersion } from "../package.json";
import {
  setupLogger,
  setupName,
  logNodeInfo,
  syncPoolState,
  validateRuntime,
  validateVersion,
  validateActiveNode,
  stakePool,
  unstakePool,
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
export class Node {
  // register class attributes
  protected runtime!: IRuntime;
  protected storageProvider!: IStorageProvider;
  protected compression!: ICompression;
  protected cache!: ICache;

  // register sdk attributes
  public sdk: KyveSDK;
  public client!: KyveClient;
  public query: KyveLCDClientType;

  // register attributes
  public coreVersion: string;
  public pool!: kyve.registry.v1beta1.kyveRegistry.Pool;
  public poolConfig!: any;
  public name: string;

  // logger attributes
  public logger: Logger;

  // options
  protected poolId: number;
  protected mnemonic: string;
  protected keyfile: string;
  protected stake: string;
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
  protected stakePool = stakePool;
  protected unstakePool = unstakePool;
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
    this.stake = options.initialStake; // TODO: change after IT
    this.network = options.network;
    this.verbose = options.verbose;

    this.coreVersion = coreVersion;

    this.name = this.setupName();
    this.logger = this.setupLogger();

    try {
      // assign main attributes
      this.sdk = new KyveSDK(this.network as KYVE_NETWORK);
      this.query = this.sdk.createLCDClient();
    } catch (error) {
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
  public addCompression(compression: ICompression): this {
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
    try {
      await this.asyncSetup();

      this.runNode();
      this.runCache();
    } catch (error) {
      this.logger.error(`Unexpected runtime error. Exiting ...`);
      this.logger.debug(error);

      process.exit(1);
    }
  }
}

// export types
export * from "./types";

// export utils
export * from "./utils";

// export storage providers
export * from "./storage";

// export compression types
export * from "./compression";

// export caches
export * from "./cache";
