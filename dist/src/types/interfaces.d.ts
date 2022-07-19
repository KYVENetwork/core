/// <reference types="node" />
import { DataItem } from ".";
import { Node } from "..";
/**
 * Interface of Runtime.
 *
 * The Runtime implements the custom logic of a pool and defines how data
 * items are fetched and which order they should have.
 *
 * @interface IRuntime
 */
export interface IRuntime {
    /**
     * Name of the runtime. This should be unique for every runtime and should
     * later match the runtime of the pool
     *
     * @property name
     * @type {string}
     */
    name: string;
    /**
     * Version of the runtime. This is used for checking if the node runs the correct
     * runtime version specified by the pool
     *
     * @property version
     * @type {string}
     */
    version: string;
    /**
     * Gets the data item from a specific key and returns both key and the value.
     *
     * Deterministic behavior is required
     *
     * @method getDataItem
     * @param {Node} core the class of @kyve/core
     * @param {string} key which gets inserted by @kyve/core
     * @return {Promise<DataItem>}
     */
    getDataItem(core: Node, key: string): Promise<DataItem>;
    /**
     * Validates a bundle proposal
     *
     * @method validate
     * @param {Node} core the class of @kyve/core
     * @param {DataItem[]} uploadedBundle is the bundle saved by the uploader on the storage provider
     * @param {DataItem[]} validationBundle is the bundle recreated locally by the validator
     * @return {Promise<boolean>} returns whether the bundle is valid or invalid
     */
    validate(core: Node, uploadedBundle: DataItem[], validationBundle: DataItem[]): Promise<boolean>;
    /**
     * Gets the next key from the current key so that the data archived has an order.
     *
     * Deterministic behavior is required
     *
     * @method getNextKey
     * @param {string} key which gets inserted by @kyve/core
     * @return {Promise<void>}
     */
    getNextKey(key: string): Promise<string>;
    /**
     * Gets a formatted value string from a data item which gets saved on chain
     * to enable oracles to use the data.
     *
     * String should not be longer than 100 characters, else gas costs might be too expensive.
     *
     * Deterministic behavior is required
     *
     * @method formatValue
     * @param {any} value is the last data value in a bundle
     * @return {Promise<string>} returns a formatted value string
     */
    formatValue(value: any): Promise<string>;
}
/**
 * Interface of Storage Provider.
 *
 * The Storage Provider handles data storage and retrieval for a pool. Usually these
 * Storage Providers are decentralized and are meant to store pool data.
 *
 * @interface IStorageProvider
 */
export interface IStorageProvider {
    /**
     * Name of the storage provider. This should be unique for every storage provider.
     *
     * @property name
     * @type {string}
     */
    name: string;
    /**
     * Initializes the Storage Provider with a wallet. This method is responsible
     * for setting up the wallet so the storage provider can save data
     *
     * @method init
     * @param {string} wallet can be a private key a mnemonic or even a file path to the wallet
     * @return {this}
     */
    init(wallet: string): this;
    /**
     * Saves a bundle on the storage provider and returns a Storage Id
     *
     * @method saveBundle
     * @param {Buffer} bundle data of the bundle which will get saved
     * @param {[string, string][]} tags metadata that should be included
     * @return {Promise<string>} returns a storage Id which should be able to retrieve the bundle again
     */
    saveBundle(bundle: Buffer, tags: [string, string][]): Promise<string>;
    /**
     * Retrieves the bundle from the storage provider with the Storage Id
     *
     * @method retrieveBundle
     * @param {string} storageId storage Id from which the data of the bundle can be retrieved
     * @return {Promise<Buffer>} returns the data of the bundle
     */
    retrieveBundle(storageId: string): Promise<Buffer>;
}
/**
 * Interface of Cache.
 *
 * The Cache is responsible for caching data before its validated and stored on the Storage Provider.
 * It functiones like a simple key value store.
 *
 * @interface ICache
 */
export interface ICache {
    /**
     * Name of the cache. This should be unique for every cache.
     *
     * @property name
     * @type {string}
     */
    name: string;
    /**
     * Storage path of the cache. This should be the path to the folder where the data is cached.
     *
     * @property name
     * @type {string}
     */
    path: string;
    /**
     * Initializes the Cache with a storage path. This method is responsible
     * for setting up the folder where data will be cached.
     *
     * @method init
     * @param {string} path folder path where the data is cached
     * @return {this}
     */
    init(path: string): this;
    /**
     * Saves the value with a key
     *
     * @method put
     * @param {string} key
     * @param {any} value
     * @return {Promise<void>}
     */
    put(key: string, value: any): Promise<void>;
    /**
     * Loads the value from a key
     *
     * @method get
     * @param {string} key
     * @return {Promise<any>}
     */
    get(key: string): Promise<any>;
    /**
     * Checks whether a value exists for a key
     *
     * @method exists
     * @param {string} key
     * @return {Promise<boolean>}
     */
    exists(key: string): Promise<boolean>;
    /**
     * Deletes the value from a key
     *
     * @method del
     * @param {string} key
     * @return {Promise<void>}
     */
    del(key: string): Promise<void>;
    /**
     * Deletes the entire cache and therefore all values
     *
     * @method drop
     * @return {Promise<void>}
     */
    drop(): Promise<void>;
}
export interface ICompression {
    /**
     * Name of the compression. This should be unique for every compression type.
     *
     * @property name
     * @type {string}
     */
    name: string;
    /**
     * Compresses a bundle
     *
     * @method compress
     * @param {DataItem[]} bundle
     * @return {Promise<Buffer>}
     */
    compress(bundle: DataItem[]): Promise<Buffer>;
    /**
     * Decompresses a bundle
     *
     * @method decompress
     * @param {Buffer} data
     * @return {Promise<DataItem[]>}
     */
    decompress(data: Buffer): Promise<DataItem[]>;
}
