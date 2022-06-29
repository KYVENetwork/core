import { IRuntime, IStorageProvider, ICache } from "./types";
import { setupLogger, setupName, logNodeInfo, syncPoolState, validateRuntime, validateVersion, validateActiveNode, setupStake, run, asyncSetup } from "./methods";
import KyveSDK, { KyveClient, KyveLCDClientType } from "@kyve/sdk";
import { Logger } from "tslog";
import { kyve } from "@kyve/proto";
/**
 * Main class of KYVE protocol nodes representing a node.
 *
 * @class Node
 * @constructor
 */
declare class Node {
    /**
     * My property description.  Like other pieces of your comment blocks,
     * this can span multiple lines.
     *
     * @property runtime
     * @type {IRuntime}
     */
    protected runtime: IRuntime;
    protected storageProvider: IStorageProvider;
    protected cache: ICache;
    protected sdk: KyveSDK;
    protected client: KyveClient;
    protected query: KyveLCDClientType;
    protected logger: Logger;
    protected coreVersion: string;
    protected pool: kyve.registry.v1beta1.kyveRegistry.Pool;
    protected poolConfig: object;
    protected name: string;
    protected poolId: number;
    protected mnemonic: string;
    protected keyfile: string;
    protected initialStake: string;
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
    protected setupStake: typeof setupStake;
    protected run: typeof run;
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
export default Node;
