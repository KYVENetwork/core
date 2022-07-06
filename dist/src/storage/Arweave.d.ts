/// <reference types="node" />
import { IStorageProvider } from "../types";
export declare class Arweave implements IStorageProvider {
    name: string;
    private wallet;
    private arweaveClient;
    init(wallet: string): this;
    saveBundle(bundle: Buffer, tags: [string, string][]): Promise<string>;
    retrieveBundle(storageId: string): Promise<any>;
}
