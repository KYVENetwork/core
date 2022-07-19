import { IRuntime, IStorageProvider, ICache, ICompression } from "./types";
import { setupLogger, setupName, logNodeInfo, syncPoolState, validateRuntime, validateVersion, validateActiveNode, stakePool, unstakePool, setupStake, runNode, runCache, asyncSetup, shouldIdle, claimUploaderRole, canVote, validateBundleProposal, voteBundleProposal, loadBundle, remainingUploadInterval, waitForNextBundleProposal, canPropose, submitBundleProposal, proposeBundle } from "./methods";
import KyveSDK, { KyveClient, KyveLCDClientType } from "@kyve/sdk";
import { Logger } from "tslog";
import { kyve } from "@kyve/proto";
/**
 * Main class of KYVE protocol nodes representing a node.
 *
 * @class Node
 * @constructor
 */
export declare class Node {
    protected runtime: IRuntime;
    protected storageProvider: IStorageProvider;
    protected compression: ICompression;
    protected cache: ICache;
    sdk: KyveSDK;
    client: KyveClient;
    query: KyveLCDClientType;
    coreVersion: string;
    pool: kyve.registry.v1beta1.kyveRegistry.Pool;
    poolConfig: any;
    name: string;
    logger: Logger;
    protected poolId: number;
    protected mnemonic: string;
    protected keyfile: string;
    protected stake: string;
    protected network: string;
    protected verbose: boolean;
    protected asyncSetup: typeof asyncSetup;
    protected setupLogger: typeof setupLogger;
    protected setupName: typeof setupName;
    protected logNodeInfo: typeof logNodeInfo;
    protected syncPoolState: typeof syncPoolState;
    protected validateRuntime: typeof validateRuntime;
    protected validateVersion: typeof validateVersion;
    protected validateActiveNode: typeof validateActiveNode;
    protected stakePool: typeof stakePool;
    protected unstakePool: typeof unstakePool;
    protected setupStake: typeof setupStake;
    protected shouldIdle: typeof shouldIdle;
    protected claimUploaderRole: typeof claimUploaderRole;
    protected loadBundle: typeof loadBundle;
    protected canVote: typeof canVote;
    protected validateBundleProposal: typeof validateBundleProposal;
    protected voteBundleProposal: typeof voteBundleProposal;
    protected remainingUploadInterval: typeof remainingUploadInterval;
    protected waitForNextBundleProposal: typeof waitForNextBundleProposal;
    protected canPropose: typeof canPropose;
    protected submitBundleProposal: typeof submitBundleProposal;
    protected proposeBundle: typeof proposeBundle;
    protected runNode: typeof runNode;
    protected runCache: typeof runCache;
    /**
     * Defines node options for CLI and initializes those inputs
     * Node name is generated here depending on inputs
     *
     * @method constructor
     */
    constructor();
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
    addRuntime(runtime: IRuntime): this;
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
    addStorageProvider(storageProvider: IStorageProvider): this;
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
    addCompression(compression: ICompression): this;
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
    addCache(cache: ICache): this;
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
    start(): Promise<void>;
}
export * from "./types";
export * from "./utils";
export * from "./storage";
export * from "./compression";
export * from "./cache";
