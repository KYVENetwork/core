/// <reference types="node" />
import { IStorageProvider } from "../types";
export default class Arweave implements IStorageProvider {
    name: string;
    private wallet;
    private arweaveClient;
    init(wallet: string): this;
    saveBundle(bundle: Buffer, tags: [string, string][]): Promise<string>;
    retrieveBundle(bundleId: string): Promise<any>;
}
